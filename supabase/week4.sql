-- Based on the inspected live schema. Run manually in Supabase SQL Editor.
-- Restricts the existing caption-read policy to authenticated users.
-- Does not change storage policies, signup triggers, or other tables.
begin;

alter table public.captions add column if not exists prompt text;
alter table public.captions
  add column if not exists user_id uuid references auth.users(id);

create table if not exists public.caption_votes (
  id bigint generated always as identity primary key,
  caption_id bigint not null references public.captions(id),
  user_id uuid not null references auth.users(id),
  vote smallint not null check (vote in (1, -1)),
  created_at timestamptz not null default now(),
  constraint caption_votes_caption_user_key unique (caption_id, user_id)
);

create index if not exists caption_votes_user_id_idx
  on public.caption_votes(user_id);

alter table public.captions enable row level security;
alter table public.profiles enable row level security;
alter table public.caption_votes enable row level security;

-- Restrict caption access to authenticated users only.
alter policy "Allow public read access to captions" on public.captions
  to authenticated using ((select auth.uid()) is not null);

revoke all on public.captions from public, anon, authenticated;
grant select (id, caption_text, created_at)
  on public.captions to authenticated;
grant insert (caption_text, prompt, user_id)
  on public.captions to authenticated;

-- Upsert writes caption_id/user_id/vote on both insert and conflict update.
revoke all on public.caption_votes from public, anon, authenticated;
grant select on public.caption_votes to authenticated;
grant insert (caption_id, user_id, vote), update (caption_id, user_id, vote)
  on public.caption_votes to authenticated;

-- Resolve the identity sequence without assuming its generated name.
do $$
declare
  vote_id_sequence regclass := pg_get_serial_sequence('public.caption_votes', 'id')::regclass;
begin
  if vote_id_sequence is null then
    raise exception 'No identity sequence found for public.caption_votes.id';
  end if;
  execute format('grant usage on sequence %s to authenticated', vote_id_sequence);
end $$;

-- The existing signup trigger creates profiles; the app only reads/updates them.
revoke all on public.profiles from public, anon, authenticated;
grant select (id, first_name, last_name, avatar_url),
  update (first_name, last_name, avatar_url)
  on public.profiles to authenticated;

-- Ordinary RLS policies. Existence checks allow rerunning this migration.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'captions' and policyname = 'week4_caption_insert') then
    create policy week4_caption_insert on public.captions
      for insert to authenticated
      with check (user_id = (select auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'caption_votes' and policyname = 'week4_vote_read') then
    create policy week4_vote_read on public.caption_votes
      for select to authenticated
      using (user_id = (select auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'caption_votes' and policyname = 'week4_vote_insert') then
    create policy week4_vote_insert on public.caption_votes
      for insert to authenticated
      with check (user_id = (select auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'caption_votes' and policyname = 'week4_vote_update') then
    create policy week4_vote_update on public.caption_votes
      for update to authenticated
      using (user_id = (select auth.uid()))
      with check (user_id = (select auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'profiles' and policyname = 'week4_profile_read') then
    create policy week4_profile_read on public.profiles
      for select to authenticated
      using (id = (select auth.uid()));
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public'
    and tablename = 'profiles' and policyname = 'week4_profile_update') then
    create policy week4_profile_update on public.profiles
      for update to authenticated
      using (id = (select auth.uid()))
      with check (id = (select auth.uid()));
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
