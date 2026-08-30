-- Moves user accounts, sessions, and chat messages off local JSON files
-- (src/lib/jsonDb.ts) into Postgres, alongside pools/envelopes, so the app
-- has no on-disk state left and can run on a stateless serverless host.

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint users_phone_unique unique (phone)
);

create table sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index sessions_user_id_idx on sessions(user_id);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  sender_id uuid not null references users(id) on delete cascade,
  sender_name text not null,
  text text not null,
  lixi_pool_id uuid references pools(id),
  lixi_qr_token uuid,
  lixi_name text,
  lixi_total_amount integer,
  lixi_envelope_count integer,
  created_at timestamptz not null default now()
);
create index chat_messages_room_created_idx on chat_messages(room_id, created_at desc);

grant select, insert, update, delete on public.users to service_role;
grant select, insert, update, delete on public.sessions to service_role;
grant select, insert, update, delete on public.chat_messages to service_role;
