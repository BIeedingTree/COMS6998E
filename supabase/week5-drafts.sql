-- REVIEW ONLY: run manually after reviewing alongside the Week 5 application.
-- Assumes the captions/caption_votes schema in week4.sql is already installed.
-- Existing rows become private through the new column default. No rows are deleted.
-- Profiles, avatar storage, signup triggers and other tables are not modified.
begin;

alter table public.captions
  add column if not exists subject text,
  add column if not exists message_type text not null default 'message',
  add column if not exists category text not null default 'other',
  add column if not exists is_public boolean not null default false,
  add column if not exists published_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.captions'::regclass and conname = 'week5_draft_metadata') then
    alter table public.captions add constraint week5_draft_metadata check (
      message_type in ('email', 'message', 'other')
      and category in ('academic', 'career', 'clubs', 'housing', 'social', 'other')
      and ((message_type = 'email' and subject is not null
            and char_length(btrim(subject)) between 1 and 200
            and position(chr(10) in subject) = 0 and position(chr(13) in subject) = 0)
           or (message_type <> 'email' and subject is null))
      and ((is_public and user_id is not null and published_at is not null)
           or (not is_public and published_at is null))
    );
  end if;
end $$;

create index if not exists captions_owner_created_idx
  on public.captions (user_id, created_at desc, id desc);
create index if not exists captions_community_published_idx
  on public.captions (published_at desc, id desc) where is_public;

-- Use verified auth.users values, not editable user metadata or a supplied email.
-- This boolean helper also protects direct Data API access by non-students.
create or replace function public.week5_is_eligible_student()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and u.email ~* '^[^@[:space:]]+@(columbia[.]edu|barnard[.]edu)$'
  );
$$;
revoke all on function public.week5_is_eligible_student() from public, anon, authenticated;
grant execute on function public.week5_is_eligible_student() to authenticated;

alter table public.captions enable row level security;
alter table public.caption_votes enable row level security;

-- Replace policies on these TWO known tables only. Permissive policies OR
-- together, so leaving Week 4's broad caption SELECT would expose private rows.
do $$
declare existing_policy record;
begin
  for existing_policy in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('captions', 'caption_votes')
  loop
    execute format('drop policy %I on public.%I', existing_policy.policyname, existing_policy.tablename);
  end loop;
end $$;

-- Revoke table AND previous column grants before granting the safe projection.
-- RLS controls rows; column privileges keep prompts/author UUIDs off the Data API.
revoke all on public.captions from public, anon, authenticated;
revoke all (id, caption_text, created_at, prompt, user_id, subject, message_type, category, is_public, published_at)
  on public.captions from public, anon, authenticated;
grant select (id, caption_text, created_at, subject, message_type, category, is_public, published_at)
  on public.captions to authenticated;
grant insert (caption_text, prompt, user_id, subject, message_type, category, is_public, published_at)
  on public.captions to authenticated;
grant update (is_public, published_at) on public.captions to authenticated;

create policy week5_caption_read on public.captions for select to authenticated
  using ((select public.week5_is_eligible_student())
    and (user_id = (select auth.uid()) or (is_public and user_id is not null)));
create policy week5_caption_insert on public.captions for insert to authenticated
  with check ((select public.week5_is_eligible_student())
    and user_id = (select auth.uid()) and not is_public and published_at is null);
create policy week5_caption_publish on public.captions for update to authenticated
  using ((select public.week5_is_eligible_student()) and user_id = (select auth.uid()))
  with check ((select public.week5_is_eligible_student()) and user_id = (select auth.uid()));

revoke all on public.caption_votes from public, anon, authenticated;
revoke all (id, caption_id, user_id, vote, created_at)
  on public.caption_votes from public, anon, authenticated;
grant select (caption_id, user_id, vote) on public.caption_votes to authenticated;
-- Supabase upsert writes all three columns when a unique conflict is found.
grant insert (caption_id, user_id, vote), update (caption_id, user_id, vote)
  on public.caption_votes to authenticated;
grant delete on public.caption_votes to authenticated;

create policy week5_vote_read on public.caption_votes for select to authenticated
  using ((select public.week5_is_eligible_student()) and user_id = (select auth.uid())
    and exists (select 1 from public.captions c where c.id = caption_id and c.is_public));
create policy week5_vote_insert on public.caption_votes for insert to authenticated
  with check ((select public.week5_is_eligible_student()) and user_id = (select auth.uid())
    and exists (select 1 from public.captions c where c.id = caption_id and c.is_public));
create policy week5_vote_update on public.caption_votes for update to authenticated
  using ((select public.week5_is_eligible_student()) and user_id = (select auth.uid())
    and exists (select 1 from public.captions c where c.id = caption_id and c.is_public))
  with check ((select public.week5_is_eligible_student()) and user_id = (select auth.uid())
    and exists (select 1 from public.captions c where c.id = caption_id and c.is_public));
create policy week5_vote_delete on public.caption_votes for delete to authenticated
  using ((select public.week5_is_eligible_student()) and user_id = (select auth.uid())
    and exists (select 1 from public.captions c where c.id = caption_id and c.is_public));

-- Resolve identity sequences safely, without assuming generated names.
do $$
declare table_name text; id_sequence regclass;
begin
  foreach table_name in array array['public.captions', 'public.caption_votes'] loop
    id_sequence := pg_get_serial_sequence(table_name, 'id')::regclass;
    if id_sequence is null then
      raise exception 'No identity sequence found for %.id', table_name;
    end if;
    execute format('grant usage on sequence %s to authenticated', id_sequence);
  end loop;
end $$;

-- Owner-only lookup avoids exposing user_id through caption SELECT privileges.
-- No caller-supplied owner ID, no prompt, and no access to another owner's rows.
create or replace function public.get_my_drafts(p_draft_id bigint default null)
returns table (
  id bigint, caption_text text, created_at timestamptz, subject text,
  message_type text, category text, is_public boolean, published_at timestamptz
)
language sql stable security definer
set search_path = ''
as $$
  select c.id, c.caption_text, c.created_at, c.subject,
         c.message_type, c.category, c.is_public, c.published_at
  from public.captions c
  where (select public.week5_is_eligible_student())
    and c.user_id = (select auth.uid())
    and (p_draft_id is null or c.id = p_draft_id)
  order by c.created_at desc nulls last, c.id desc;
$$;
revoke all on function public.get_my_drafts(bigint) from public, anon, authenticated;
grant execute on function public.get_my_drafts(bigint) to authenticated;

-- Aggregate-only access bypasses own-vote SELECT without returning voter IDs.
-- An unpublished ID yields NO ROW, even if the caller owns that draft.
create or replace function public.get_community_rating_counts(p_caption_ids bigint[] default null)
returns table (caption_id bigint, positive_count bigint, negative_count bigint)
language sql stable security definer
set search_path = ''
as $$
  select c.id, count(v.id) filter (where v.vote = 1), count(v.id) filter (where v.vote = -1)
  from public.captions c
  left join public.caption_votes v on v.caption_id = c.id
  where (select public.week5_is_eligible_student())
    and c.is_public and c.user_id is not null
    and (p_caption_ids is null or c.id = any(p_caption_ids))
  group by c.id;
$$;
revoke all on function public.get_community_rating_counts(bigint[]) from public, anon, authenticated;
grant execute on function public.get_community_rating_counts(bigint[]) to authenticated;

notify pgrst, 'reload schema';
commit;
