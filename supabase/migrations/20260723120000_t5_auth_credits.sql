-- PIKBO T5 — durable auth / credits schema (docs/prd/AUTH_CREDITS.md)
-- Apply against Supabase Postgres when credentials exist.
-- RLS: clients never write wallets/ledger; service role only for mutations.

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type public.account_kind as enum ('personal', 'shop');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_id as enum ('free', 'creator', 'shop');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('active', 'restricted', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.membership_role as enum ('owner', 'editor', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ledger_kind as enum (
    'grant', 'reserve', 'settle', 'release', 'expire', 'refund', 'adjustment', 'migration'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reservation_purpose as enum ('generation', 'seller_pack');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.reservation_status as enum (
    'reserved', 'partially_settled', 'settled', 'released', 'expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_provider as enum ('stripe');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum (
    'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stripe_event_status as enum (
    'received', 'processing', 'processed', 'failed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.generation_status as enum (
    'queued', 'running', 'succeeded', 'failed', 'canceled', 'unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.seller_pack_status as enum (
    'queued', 'running', 'succeeded', 'partial', 'failed', 'canceled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.seller_pack_mode as enum ('demo_cached', 'live_generate');
exception when duplicate_object then null; end $$;

-- profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- billing accounts
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  kind public.account_kind not null default 'personal',
  owner_user_id uuid not null references auth.users (id),
  plan_id public.plan_id not null default 'free',
  status public.account_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_owner_idx on public.accounts (owner_user_id);

create table if not exists public.account_memberships (
  account_id uuid not null references public.accounts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.membership_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create index if not exists account_memberships_user_idx
  on public.account_memberships (user_id);

-- wallet projection
create table if not exists public.credit_wallets (
  account_id uuid primary key references public.accounts (id) on delete cascade,
  available_credits integer not null default 0 check (available_credits >= 0),
  reserved_credits integer not null default 0 check (reserved_credits >= 0),
  lifetime_used_credits bigint not null default 0 check (lifetime_used_credits >= 0),
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- append-only ledger
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id),
  kind public.ledger_kind not null,
  delta_available integer not null,
  delta_reserved integer not null,
  available_after integer not null,
  reserved_after integer not null,
  reservation_id uuid,
  source_type text not null,
  source_id text not null,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_account_idx
  on public.credit_ledger (account_id, created_at desc);

create table if not exists public.credit_reservations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id),
  purpose public.reservation_purpose not null,
  quoted_credits integer not null check (quoted_credits > 0),
  settled_credits integer not null default 0 check (settled_credits >= 0),
  released_credits integer not null default 0 check (released_credits >= 0),
  status public.reservation_status not null default 'reserved',
  idempotency_key text not null unique,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservation_budget check (
    settled_credits + released_credits <= quoted_credits
  )
);

create index if not exists credit_reservations_account_idx
  on public.credit_reservations (account_id, status);

alter table public.credit_ledger
  drop constraint if exists credit_ledger_reservation_id_fkey;
alter table public.credit_ledger
  add constraint credit_ledger_reservation_id_fkey
  foreign key (reservation_id) references public.credit_reservations (id);

create table if not exists public.subscription_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id),
  provider public.subscription_provider not null default 'stripe',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  plan_id public.plan_id not null,
  status public.subscription_status not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  payload_sha256 text not null,
  status public.stripe_event_status not null default 'received',
  attempt_count integer not null default 0,
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists stripe_events_type_idx on public.stripe_events (event_type);

create table if not exists public.seller_pack_runs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id),
  created_by uuid not null references auth.users (id),
  status public.seller_pack_status not null default 'queued',
  quoted_credits integer not null,
  settled_credits integer not null default 0,
  reservation_id uuid references public.credit_reservations (id),
  mode public.seller_pack_mode not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id),
  created_by uuid not null references auth.users (id),
  pack_run_id uuid references public.seller_pack_runs (id),
  effect_slug text not null,
  status public.generation_status not null default 'queued',
  quoted_credits integer not null,
  settled_credits integer not null default 0,
  reservation_id uuid not null references public.credit_reservations (id),
  provider text,
  provider_request_id text unique,
  demo boolean not null default false,
  error_code text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists generation_jobs_account_idx
  on public.generation_jobs (account_id, created_at desc);

create table if not exists public.consumed_guest_sessions (
  guest_session_id_hash text primary key,
  user_id uuid not null references auth.users (id),
  account_id uuid not null references public.accounts (id),
  migrated_credits integer not null check (migrated_credits >= 0 and migrated_credits <= 10),
  consumed_at timestamptz not null default now()
);

-- RLS: authenticated can read own membership + wallet projection; no client writes.
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.account_memberships enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.credit_reservations enable row level security;
alter table public.subscription_records enable row level security;
alter table public.stripe_events enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.seller_pack_runs enable row level security;
alter table public.consumed_guest_sessions enable row level security;
-- stripe_events: service role only (no policies for authenticated)

create policy profiles_self on public.profiles
  for select using (auth.uid() = id);

create policy memberships_self on public.account_memberships
  for select using (auth.uid() = user_id);

create policy accounts_member on public.accounts
  for select using (
    exists (
      select 1 from public.account_memberships m
      where m.account_id = accounts.id and m.user_id = auth.uid()
    )
  );

create policy wallets_member on public.credit_wallets
  for select using (
    exists (
      select 1 from public.account_memberships m
      where m.account_id = credit_wallets.account_id and m.user_id = auth.uid()
    )
  );

create policy ledger_member on public.credit_ledger
  for select using (
    exists (
      select 1 from public.account_memberships m
      where m.account_id = credit_ledger.account_id and m.user_id = auth.uid()
    )
  );

create policy reservations_member on public.credit_reservations
  for select using (
    exists (
      select 1 from public.account_memberships m
      where m.account_id = credit_reservations.account_id and m.user_id = auth.uid()
    )
  );

create policy jobs_member on public.generation_jobs
  for select using (
    exists (
      select 1 from public.account_memberships m
      where m.account_id = generation_jobs.account_id and m.user_id = auth.uid()
    )
  );

create policy packs_member on public.seller_pack_runs
  for select using (
    exists (
      select 1 from public.account_memberships m
      where m.account_id = seller_pack_runs.account_id and m.user_id = auth.uid()
    )
  );

create policy subscriptions_member on public.subscription_records
  for select using (
    exists (
      select 1 from public.account_memberships m
      where m.account_id = subscription_records.account_id and m.user_id = auth.uid()
    )
  );

comment on table public.credit_ledger is
  'Append-only credit audit. Application code must never UPDATE/DELETE rows.';
comment on table public.credit_wallets is
  'Transactional projection; rebuildable from ledger.';
