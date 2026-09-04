-- claim_envelope() computes a claimant's new wallet balance by summing their
-- past transactions and adding the envelope it just handed out. The pool row
-- is locked (FOR UPDATE) before any of that, which serializes claims within a
-- pool — but the wallet ledger is keyed by phone, and two pools are two
-- different locks. Nothing stood between the same person claiming from two
-- pools in the same moment.
--
-- Both transactions then read the same prior sum and each wrote its own value
-- on top of it, so a guest who really received 70.000đ + 30.000đ ended up with
-- a ledger reading 70.000đ and 30.000đ rather than 70.000đ and 100.000đ.
-- /api/wallet/[phone] shows the newest row's balance_after, so the wallet
-- displayed 30.000đ — and because balance_after is stored, it stayed wrong.
-- Reproduced 6 times out of 6.
--
-- Fixed with a transaction-scoped advisory lock on the phone number, taken
-- before the pool lock so every claim acquires the two in the same order and
-- no pair can deadlock. hashtext() collisions merely make two unrelated
-- claimants take turns, which costs nothing at this scale.

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

  -- Taken first, so the lock order is always phone then pool.
  perform pg_advisory_xact_lock(hashtext(trim(p_phone)));

  select * into v_pool from pools where id = p_pool_id for update;
  if not found then
    raise exception 'POOL_NOT_FOUND';
  end if;

  if v_pool.expires_at is not null and v_pool.expires_at < now() and v_pool.status = 'active' then
    update pools set status = 'expired' where id = p_pool_id;
    v_pool.status := 'expired';
  end if;

  -- Asked before the pool's status, because for someone who already holds an
  -- envelope that is the only fact worth telling: reached in the other order,
  -- a guest revisiting a pool that has since run out was told the envelopes
  -- were gone, as though they had missed out on the one already theirs.
  if exists (
    select 1 from envelopes
    where pool_id = p_pool_id and claimed_phone = p_phone and is_claimed
  ) then
    raise exception 'ALREADY_CLAIMED';
  end if;

  if v_pool.status <> 'active' then
    if v_pool.status = 'completed' then
      raise exception 'NO_ENVELOPES_LEFT';
    elsif v_pool.status = 'expired' then
      raise exception 'POOL_EXPIRED';
    else
      raise exception 'POOL_CLOSED';
    end if;
  end if;

  select * into v_envelope
  from envelopes
  where pool_id = p_pool_id and not is_claimed
  order by random()
  limit 1
  for update skip locked;

  -- Still reachable, just no longer the only way to learn the envelopes are
  -- gone: a pool whose rows were removed out from under an 'active' status
  -- lands here.
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
