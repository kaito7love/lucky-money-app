-- Lets a host manually close a pool early (unclaimed envelopes become
-- unreachable) via PATCH /api/pools/[id], distinct from "completed"
-- (ran out of envelopes) and "expired" (time-based). claim_envelope()
-- already rejects any non-'active' status generically, so no change
-- needed there.

alter table pools drop constraint pools_status_check;
alter table pools add constraint pools_status_check
  check (status in ('active', 'completed', 'expired', 'closed'));
