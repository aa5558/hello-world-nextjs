-- Profiles table, auto-created for every new auth.users row, plus an
-- "avatars" storage bucket for profile photos.
--
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).
-- RLS is intentionally left off, per assignment instructions.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

-- Creates a profile row the moment a new user signs up (including via
-- Google OAuth), so the app always has somewhere to store their name/photo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket for profile photos. Public so avatar URLs can be rendered
-- directly with an <img> tag without signed URLs.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage RLS is separate from table RLS and is on by default, so we need
-- explicit policies even though table-level RLS is off. Users may only
-- write inside a folder named after their own user id (avatars/<uid>/...).
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
