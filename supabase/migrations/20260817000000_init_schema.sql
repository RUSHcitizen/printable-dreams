-- Printable Dreams — initial member-platform schema.
--
-- Three tables: profiles, groups, group_memberships. Every table has Row
-- Level Security enabled with policies that enforce authorization at the
-- database layer — not just in application code — per the project's
-- security requirements. See README "Authorization" for the full model.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────
-- profiles
--
-- One row per authenticated user. Created automatically by the trigger
-- below when someone signs up — never created directly by client code.
-- Deliberately minimal: only what's needed (display name). No address,
-- school, date of birth, phone number, or other sensitive fields — see
-- README "Privacy".
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  -- Global admin flag. Deliberately separate from group_memberships.role
  -- (a group *coordinator* is not automatically a site admin, and vice
  -- versa) — see README "Admin architecture". Not settable by any current
  -- UI or RLS policy; only changeable via direct database access today.
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- RLS policies can't restrict individual columns, so a user could otherwise
-- set is_admin=true on their own UPDATE. This trigger silently discards any
-- change to is_admin regardless of what the policy above allows through.
create or replace function public.protect_profile_admin_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.is_admin := old.is_admin;
  return new;
end;
$$;

drop trigger if exists protect_profile_admin_flag on public.profiles;
create trigger protect_profile_admin_flag
  before update on public.profiles
  for each row
  execute function public.protect_profile_admin_flag();

-- Auto-create a profile row on signup, seeded from the display_name passed
-- via supabase.auth.signUp({ options: { data: { display_name } } }).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- groups
--
-- The fixed set of things a member can request to join. Adding a new group
-- later is a single INSERT here — no schema change and no application code
-- change (see README "Adding a new group").
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create policy "Groups are viewable by any signed-in user"
  on public.groups for select
  to authenticated
  using (true);

insert into public.groups (slug, name, description) values
  ('volunteers', 'Volunteers', 'People interested in helping Printable Dreams.'),
  ('printers', 'Printers', 'People who have 3D printers and want to help produce prints.'),
  ('partners', 'Partners', 'People or organizations interested in partnering with Printable Dreams.')
on conflict (slug) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- group_memberships
--
-- The relational join between users and groups (never a `users.role`
-- column). `status` and `role` both start at safe, fixed defaults that a
-- user's own INSERT can never override — see the "request to join" policy
-- below and src/actions/index.ts (joinGroup). Approving a pending request
-- (status -> 'active') requires elevated (service-role) access that no
-- current UI exposes — see README "Group membership workflow".
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'rejected')),
  role text not null default 'member' check (role in ('member', 'coordinator', 'admin')),
  created_at timestamptz not null default now(),
  -- The actual "no duplicate memberships" guarantee — enforced by Postgres,
  -- not just application logic.
  unique (user_id, group_id)
);

alter table public.group_memberships enable row level security;

create policy "Users can view their own memberships"
  on public.group_memberships for select
  using (auth.uid() = user_id);

create policy "Users can request to join a group"
  on public.group_memberships for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and role = 'member'
  );

create policy "Users can leave a group they belong to"
  on public.group_memberships for delete
  using (auth.uid() = user_id);

-- Deliberately no UPDATE policy: changing status (approving/rejecting a
-- request) or role is not possible through the anon/authenticated roles at
-- all today — only a future service-role admin path could do it.
