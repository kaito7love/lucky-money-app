-- `0001_init.sql` created these tables without granting the API-facing
-- roles any data privileges. Supabase revokes table SELECT/INSERT/UPDATE/
-- DELETE from anon/authenticated/service_role by default (only TRUNCATE/
-- REFERENCES/TRIGGER/MAINTAIN are pre-granted) — every table needs an
-- explicit grant, which this project's API routes (all running as
-- `service_role`) never got.

grant select, insert, update, delete on public.pools to service_role;
grant select, insert, update, delete on public.envelopes to service_role;
grant select, insert, update, delete on public.wallet_transactions to service_role;
