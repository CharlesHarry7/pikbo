-- Persist private-beta interest without exposing the public product tables.
-- Service-role only: the public form submits to a server route that validates
-- and rate-limits before inserting. No email or shop URL is sent to analytics.

begin;

create table if not exists public.beta_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null,
  shop_url text,
  source_path text not null default '/contact',
  consent_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'contacted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists beta_requests_email_status_key
  on public.beta_requests (lower(email), status)
  where status in ('pending', 'approved', 'contacted');

alter table public.beta_requests enable row level security;

revoke all on table public.beta_requests from anon, authenticated;
grant select, insert, update on table public.beta_requests to service_role;

commit;
