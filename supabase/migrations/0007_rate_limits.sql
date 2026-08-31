-- Nothing in the app limited how often an endpoint could be hit. The one that
-- matters most is /api/claim on a private pool: the PIN is six digits, so a
-- pool's envelopes are ~10^6 guesses away from being drained by anyone holding
-- the QR link. /api/auth/login has the same shape against passwords.
--
-- Counting in application memory does not work here: the app runs on Vercel,
-- where concurrent lambdas share nothing, so the counter has to live in the
-- database the instances already share.

create table rate_limit_attempts (
  id bigserial primary key,
  key text not null,
  occurred_at timestamptz not null default now()
);

create index rate_limit_attempts_key_time_idx on rate_limit_attempts(key, occurred_at desc);

-- Records one attempt against `p_key` and reports whether the caller is still
-- within budget. Returns true when the attempt is allowed, false once the key
-- has used up p_limit attempts inside the trailing p_window_seconds.
--
-- Recording happens before counting, so the count always includes the caller's
-- own attempt. Two requests racing at the boundary can still both be admitted:
-- that is a deliberate trade, since taking a lock per attempt would serialize
-- every login and claim, and a limiter that occasionally allows 6 instead of 5
-- is worth far more than one that becomes the bottleneck.
create or replace function consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
as $$
declare
  v_cutoff timestamptz := now() - make_interval(secs => p_window_seconds);
  v_recent integer;
begin
  -- Keeps a hot key's history bounded by the window instead of by all time.
  delete from rate_limit_attempts where key = p_key and occurred_at < v_cutoff;

  insert into rate_limit_attempts (key) values (p_key);

  select count(*) into v_recent
  from rate_limit_attempts
  where key = p_key and occurred_at >= v_cutoff;

  return v_recent <= p_limit;
end;
$$;

-- Called after a success so a legitimate user who fumbled a few times starts
-- clean instead of carrying failures until the window rolls off.
create or replace function clear_rate_limit(p_key text) returns void
language sql
as $$
  delete from rate_limit_attempts where key = p_key;
$$;

-- Keys that are abandoned mid-window are never revisited by the prune inside
-- consume_rate_limit, so they need a sweep of their own.
create or replace function delete_stale_rate_limits() returns void
language sql
as $$
  delete from rate_limit_attempts where occurred_at < now() - interval '1 day';
$$;

grant select, insert, update, delete on public.rate_limit_attempts to service_role;
grant usage, select on sequence public.rate_limit_attempts_id_seq to service_role;
grant execute on function consume_rate_limit(text, integer, integer) to service_role;
grant execute on function clear_rate_limit(text) to service_role;
grant execute on function delete_stale_rate_limits() to service_role;
