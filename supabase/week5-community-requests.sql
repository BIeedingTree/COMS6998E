-- REVIEW ONLY: run manually after week5-drafts.sql. This creates or replaces
-- the Community request-read RPC without changing table grants, RLS, or data.
-- It works for already-published drafts; no backfill or republishing is needed.
begin;

create or replace function public.get_community_requests(p_caption_ids bigint[])
returns table (id bigint, original_request text)
language sql stable security definer
set search_path = ''
as $$
  select c.id, request.original_request
  from public.captions c
  cross join lateral (
    select strpos(c.prompt, E'\nSituation:\n') as situation_pos,
           strpos(reverse(c.prompt), reverse(E'\n\nRecipient:\n')) as recipient_reverse_pos
  ) markers
  cross join lateral (
    select nullif(btrim(substr(
      c.prompt,
      markers.situation_pos + char_length(E'\nSituation:\n'),
      greatest(0, char_length(c.prompt) - markers.recipient_reverse_pos
        - char_length(E'\n\nRecipient:\n') + 2
        - markers.situation_pos - char_length(E'\nSituation:\n'))
    )), '') as original_request
  ) request
  where (select public.week5_is_eligible_student())
    and c.is_public
    and c.user_id is not null
    and c.id = any(p_caption_ids)
    and left(c.prompt, char_length('You are an expert at helping people phrase difficult or awkward messages clearly and naturally.'))
      = 'You are an expert at helping people phrase difficult or awkward messages clearly and naturally.'
    and markers.situation_pos > 0
    and markers.recipient_reverse_pos > 0
    and request.original_request is not null;
$$;
revoke all on function public.get_community_requests(bigint[]) from public, anon, authenticated;
grant execute on function public.get_community_requests(bigint[]) to authenticated;

notify pgrst, 'reload schema';
commit;
