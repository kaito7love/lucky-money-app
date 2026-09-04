-- Sessions were created without an expiry, so `sessions` only ever grew and a
-- leaked token stayed valid forever. Give every session a deadline and let
-- reads treat a past deadline as "no session".
--
-- Existing rows are backdated from their own created_at rather than given a
-- fresh 30 days: a token minted a month ago should not be renewed by the act
-- of adding expiry to the schema.

alter table sessions
  add column expires_at timestamptz not null default now() + interval '30 days';

update sessions set expires_at = created_at + interval '30 days';

-- Lookups always filter on (token, not expired); the primary key on token
-- carries the first half, this covers the sweep in delete_expired_sessions().
create index sessions_expires_at_idx on sessions(expires_at);

-- Called opportunistically from the app rather than on a cron, so a busy
-- instance does the tidying and an idle project costs nothing.
create or replace function delete_expired_sessions() returns void
language sql
as $$
  delete from sessions where expires_at < now();
$$;

grant execute on function delete_expired_sessions() to service_role;
