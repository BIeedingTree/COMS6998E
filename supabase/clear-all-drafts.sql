-- Run in the Supabase SQL Editor as the database owner to start with empty drafts.
-- Permanently removes ALL personal and community drafts, plus every vote on them.
-- Does not change auth.users, profiles, avatar storage, schema, RLS, or identity sequences.

-- Optional preview: counts before deletion.
select
  (select count(*) from public.captions) as drafts_to_delete,
  (select count(*) from public.captions where is_public) as community_drafts_to_delete,
  (select count(*) from public.caption_votes) as votes_to_delete;

-- Run these statements together. Any failure rolls the transaction back.
begin;
lock table public.caption_votes, public.captions in share row exclusive mode;
delete from public.caption_votes;
delete from public.captions;
commit;

-- Verify both My Drafts and Community will start empty.
select
  (select count(*) from public.captions) as remaining_drafts,
  (select count(*) from public.caption_votes) as remaining_votes;
