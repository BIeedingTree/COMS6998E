-- Run once in the Supabase SQL Editor as the project owner, before deploying
-- the original-request UI. No table grants, RLS or storage policies are changed.
-- Existing get_my_drafts and its return type remain unchanged.
begin;

create or replace function public.get_my_draft_prompts()
returns table (id bigint, prompt text)
language sql stable security definer
set search_path = ''
as $$
  select c.id, c.prompt
  from public.captions c
  where (select public.week5_is_eligible_student())
    and c.user_id = (select auth.uid());
$$;
revoke all on function public.get_my_draft_prompts() from public, anon, authenticated;
grant execute on function public.get_my_draft_prompts() to authenticated;

notify pgrst, 'reload schema';
commit;
