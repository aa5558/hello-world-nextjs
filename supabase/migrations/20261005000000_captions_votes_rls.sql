-- AI captions + voting, and row level security on every table.
--
-- Run this once in the Supabase SQL Editor (or via `supabase db push`),
-- after 20260928000000_profiles.sql.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One row per photo a user uploads. `prompt` is the exact text sent to the
-- model, so every caption can be traced back to how it was generated.
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  image_path text not null,
  context text check (char_length(context) <= 200),
  vibe text not null,
  daily_prompt text,
  model text not null,
  prompt text not null,
  created_at timestamptz not null default now()
);

create index if not exists generations_created_at_idx
  on public.generations (created_at desc);
create index if not exists generations_user_id_idx
  on public.generations (user_id, created_at desc);

-- AI generated captions for a generation. Vote tallies are denormalized here
-- and maintained by a trigger on caption_votes, so the feed can show scores
-- without anyone being able to read other users' individual votes.
create table if not exists public.captions (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 300),
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  score integer generated always as (upvotes - downvotes) stored,
  created_at timestamptz not null default now()
);

create index if not exists captions_generation_id_idx
  on public.captions (generation_id);

-- One vote per user per caption. Changing your mind updates the row;
-- un-voting deletes it.
create table if not exists public.caption_votes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  caption_id uuid not null references public.captions (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, caption_id)
);

create index if not exists caption_votes_caption_id_idx
  on public.caption_votes (caption_id);

-- Keeps captions.upvotes / captions.downvotes in sync with caption_votes.
-- security definer so it can update captions even though users have no
-- UPDATE policy on that table.
create or replace function public.apply_caption_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.captions
    set upvotes = upvotes - (old.vote = 1)::int,
        downvotes = downvotes - (old.vote = -1)::int
    where id = old.caption_id;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    update public.captions
    set upvotes = upvotes + (new.vote = 1)::int,
        downvotes = downvotes + (new.vote = -1)::int
    where id = new.caption_id;
  end if;

  return null;
end;
$$;

drop trigger if exists on_caption_vote on public.caption_votes;

create trigger on_caption_vote
  after insert or update or delete on public.caption_votes
  for each row execute function public.apply_caption_vote();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

-- Safety net: turn RLS on for every table in the public schema, including
-- any created outside these migrations. A table with RLS on and no policies
-- is unreachable through the API, which is the strictest default.
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end;
$$;

-- profiles: each user can only see and edit their own row. Rows are created
-- by the handle_new_user() trigger (security definer), so no INSERT policy.
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- movies: read-only catalog from Assignment #2.
do $$
begin
  if to_regclass('public.movies') is not null then
    execute 'drop policy if exists "Movies are publicly readable" on public.movies';
    execute 'create policy "Movies are publicly readable" on public.movies
             for select to anon, authenticated using (true)';
  end if;
end;
$$;

-- generations: public feed; only signed-in users can post, as themselves.
-- No UPDATE or DELETE policies, so posts can't be edited after the fact.
drop policy if exists "Generations are publicly readable" on public.generations;
create policy "Generations are publicly readable"
  on public.generations for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can create their own generations" on public.generations;
create policy "Users can create their own generations"
  on public.generations for insert
  to authenticated
  with check (user_id = auth.uid());

-- captions: public; inserted only by the owner of the parent generation.
-- No UPDATE policy: vote tallies change only through the trigger above.
drop policy if exists "Captions are publicly readable" on public.captions;
create policy "Captions are publicly readable"
  on public.captions for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can add captions to their own generations" on public.captions;
create policy "Users can add captions to their own generations"
  on public.captions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.generations g
      where g.id = generation_id and g.user_id = auth.uid()
    )
  );

-- caption_votes: private to each voter. Others only see the totals on
-- captions.
drop policy if exists "Users can view their own votes" on public.caption_votes;
create policy "Users can view their own votes"
  on public.caption_votes for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can cast their own votes" on public.caption_votes;
create policy "Users can cast their own votes"
  on public.caption_votes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can change their own votes" on public.caption_votes;
create policy "Users can change their own votes"
  on public.caption_votes for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can remove their own votes" on public.caption_votes;
create policy "Users can remove their own votes"
  on public.caption_votes for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

-- Public bucket for uploaded photos. Uploads are scoped to a folder named
-- after the uploader's user id (generations/<uid>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generations',
  'generations',
  true,
  4 * 1024 * 1024,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Generation images are publicly readable" on storage.objects;
create policy "Generation images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'generations');

drop policy if exists "Users can upload their own generation images" on storage.objects;
create policy "Users can upload their own generation images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'generations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lets the app clean up an upload if saving the generation fails.
drop policy if exists "Users can delete their own generation images" on storage.objects;
create policy "Users can delete their own generation images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'generations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
