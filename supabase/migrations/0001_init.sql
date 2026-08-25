-- Lucky Money: group red-envelope pools
-- No full auth accounts yet (auth is intentionally lightweight: name + phone).
-- Guests are identified by phone number; hosts manage their own pool via a
-- random host_token issued once at creation time (kept client-side).

create extension if not exists pgcrypto;

create table pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_name text not null,
  host_token uuid not null default gen_random_uuid(),
  total_amount integer not null check (total_amount > 0),
  envelope_count integer not null check (envelope_count > 0 and envelope_count <= 500),
  mode text not null check (mode in ('fixed', 'random')),
  min_value integer,
  max_value integer,
  qr_token uuid not null default gen_random_uuid(),
  status text not null default 'active' check (status in ('active', 'completed', 'expired')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint qr_token_unique unique (qr_token)
);

create table envelopes (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  value integer not null check (value > 0),
  is_claimed boolean not null default false,
  claimed_name text,
  claimed_phone text,
  claimed_at timestamptz
);

create index envelopes_pool_id_idx on envelopes(pool_id);
create index envelopes_pool_unclaimed_idx on envelopes(pool_id) where not is_claimed;

-- One phone number can only claim one envelope per pool.
create unique index envelopes_pool_phone_claimed_idx
  on envelopes(pool_id, claimed_phone)
  where is_claimed;

create table wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  amount integer not null,
  type text not null check (type in ('envelope_claim', 'adjustment')),
  pool_id uuid references pools(id),
  envelope_id uuid references envelopes(id),
  balance_after integer not null,
  created_at timestamptz not null default now()
);

create index wallet_transactions_phone_idx on wallet_transactions(phone_number);

-- Atomically hand out one random unclaimed envelope in a pool to (name, phone).
-- Locking the pool row first serializes claims per-pool, which is what we
-- want: correctness over raw throughput, and pool-scale traffic (dozens to a
-- few hundred concurrent guests) is small enough that this stays fast.
create or replace function claim_envelope(p_pool_id uuid, p_name text, p_phone text)
returns table(claimed_value integer, remaining_count integer) as $$
declare
  v_pool pools%rowtype;
  v_envelope envelopes%rowtype;
  v_remaining integer;
  v_balance integer;
begin
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'INVALID_NAME';
  end if;
  if p_phone is null or length(trim(p_phone)) = 0 then
    raise exception 'INVALID_PHONE';
  end if;

  select * into v_pool from pools where id = p_pool_id for update;
  if not found then
    raise exception 'POOL_NOT_FOUND';
  end if;

  if v_pool.expires_at is not null and v_pool.expires_at < now() and v_pool.status = 'active' then
    update pools set status = 'expired' where id = p_pool_id;
    v_pool.status := 'expired';
  end if;

  if v_pool.status <> 'active' then
    raise exception 'POOL_CLOSED';
  end if;

  if exists (
    select 1 from envelopes
    where pool_id = p_pool_id and claimed_phone = p_phone and is_claimed
  ) then
    raise exception 'ALREADY_CLAIMED';
  end if;

  select * into v_envelope
  from envelopes
  where pool_id = p_pool_id and not is_claimed
  order by random()
  limit 1
  for update skip locked;

  if not found then
    update pools set status = 'completed' where id = p_pool_id;
    raise exception 'NO_ENVELOPES_LEFT';
  end if;

  update envelopes
  set is_claimed = true, claimed_name = trim(p_name), claimed_phone = trim(p_phone), claimed_at = now()
  where id = v_envelope.id;

  select coalesce(sum(amount), 0) + v_envelope.value into v_balance
  from wallet_transactions
  where phone_number = trim(p_phone);

  insert into wallet_transactions(phone_number, amount, type, pool_id, envelope_id, balance_after)
  values (trim(p_phone), v_envelope.value, 'envelope_claim', p_pool_id, v_envelope.id, v_balance);

  select count(*) into v_remaining from envelopes where pool_id = p_pool_id and not is_claimed;
  if v_remaining = 0 then
    update pools set status = 'completed' where id = p_pool_id;
  end if;

  return query select v_envelope.value, v_remaining;
end;
$$ language plpgsql security definer;

-- Enable realtime updates on envelopes so the host live-view updates instantly.
alter publication supabase_realtime add table envelopes;
