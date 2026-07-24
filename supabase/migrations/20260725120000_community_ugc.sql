-- Round C — real community posts (UGC). No fake rows.
-- Apply in Supabase SQL Editor after T5 migration.

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  caption text not null default '',
  effect_slug text,
  video_url text not null,
  poster_url text,
  -- only http(s) safe URLs accepted by app layer
  visibility text not null default 'public'
    check (visibility in ('public', 'unlisted', 'private')),
  moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists community_posts_public_idx
  on public.community_posts (created_at desc)
  where visibility = 'public' and moderation_status = 'approved';

create index if not exists community_posts_user_idx
  on public.community_posts (user_id, created_at desc);

alter table public.community_posts enable row level security;

-- Public read of approved public posts
drop policy if exists community_posts_select_public on public.community_posts;
create policy community_posts_select_public on public.community_posts
  for select
  using (
    visibility = 'public'
    and moderation_status = 'approved'
  );

-- Owner read all own posts
drop policy if exists community_posts_select_own on public.community_posts;
create policy community_posts_select_own on public.community_posts
  for select
  using (auth.uid() = user_id);

-- Owner insert own posts only
drop policy if exists community_posts_insert_own on public.community_posts;
create policy community_posts_insert_own on public.community_posts
  for insert
  with check (auth.uid() = user_id);

-- Owner update/delete own
drop policy if exists community_posts_update_own on public.community_posts;
create policy community_posts_update_own on public.community_posts
  for update
  using (auth.uid() = user_id);

drop policy if exists community_posts_delete_own on public.community_posts;
create policy community_posts_delete_own on public.community_posts
  for delete
  using (auth.uid() = user_id);

comment on table public.community_posts is
  'Real user UGC for /community. Never seed fake posts.';
