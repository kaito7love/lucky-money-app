-- Hosts are now identified by phone number (tied to the users.json account
-- system) instead of only the local host_token, so a pool's owner can be
-- recognized from a different device. Private pools get a PIN, checked
-- before a claim is allowed.

alter table pools add column host_phone text not null default '';
alter table pools add column is_private boolean not null default false;
alter table pools add column pin_hash text;
