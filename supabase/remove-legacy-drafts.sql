-- Targeted cleanup for the four old humor captions observed in My Drafts.
-- Prepared for manual execution only; not executed by Codex.
-- Preserves all Say It Bettaer emails, messages, prompts, profiles and storage.
-- No RLS, permissions, schema or triggers are changed.

-- STEP 1: Run this read-only preview first. These are candidate IDs, not a
-- blanket deletion rule. STEP 2 also requires each exact old caption text.
select c.id, c.caption_text, c.message_type, c.created_at,
       (select count(*) from public.caption_votes v where v.caption_id = c.id) as votes
from public.captions c
where c.id in (5, 6, 7, 8)
order by c.id;

-- STEP 2: After reviewing the preview, run the transaction below separately.
-- Permanently deletes only exact matches and their dependent votes.
-- A reused/changed ID, or any email, is never deleted by this script.
begin;
lock table public.captions, public.caption_votes in share row exclusive mode;
create temporary table legacy_caption_cleanup (id bigint primary key) on commit drop;
insert into legacy_caption_cleanup (id)
select c.id
from public.captions c
join (values
  (5::bigint, 'Leaving Hewitt Hall with enough contraband fruit to survive a Central Park exile is the closest Columbia undergrads get to staging an NYC bodega heist.'),
  (6::bigint, 'Debating whether to study in Butler or drop out and become a full-time bodega cat in Morningside Heights.'),
  (7::bigint, 'me trying to sweat out a fever at butler 301 while listening to sirens outside because apparently the entire mta is on fire again. nature is healing.'),
  (8::bigint, 'Moved to NYC for the culture and now I am waiting 45 minutes for a lukewarm grain bowl because Ferris Hall broke me.')
) as expected(id, caption_text)
on c.id = expected.id and c.caption_text = expected.caption_text
where c.message_type <> 'email';

delete from public.caption_votes
where caption_id in (select id from legacy_caption_cleanup);
delete from public.captions
where id in (select id from legacy_caption_cleanup)
returning id, caption_text;
commit;

-- Check: the exact rows removed above should no longer exist. If one of IDs
-- 5–8 remains because its content changed, inspect it rather than broadening
-- the deletion to every non-email or every missing/unrecognized prompt.
