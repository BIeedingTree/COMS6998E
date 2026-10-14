-- Optional DATA CLEANUP ONLY. Not executed by Codex.
-- Run as the database owner in the correct project's SQL Editor.
-- First run ONLY this SELECT and review the IDs/text to be removed.
-- Say It Better records are recognized by the exact prompt opening used in app/actions.ts.
select id, created_at, left(caption_text, 160) as preview
from public.captions
where prompt is null or prompt not like
  'You are an expert at helping people phrase difficult or awkward messages clearly and naturally.%'
order by id;

-- After reviewing the result above, run this transaction separately.
-- Deletes matching legacy drafts and their votes; preserves Say It Better drafts.
-- Does not alter schemas, grants, RLS, profiles, users, or storage.
begin;
lock table public.captions, public.caption_votes in share row exclusive mode;

delete from public.caption_votes
where caption_id in (
  select id from public.captions
  where prompt is null or prompt not like
    'You are an expert at helping people phrase difficult or awkward messages clearly and naturally.%'
);

delete from public.captions
where prompt is null or prompt not like
  'You are an expert at helping people phrase difficult or awkward messages clearly and naturally.%'
returning id;

commit;
