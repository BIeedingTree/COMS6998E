"use client";

import { useActionState } from "react";
import { voteOnCaption } from "@/app/actions";

export default function CaptionVotes({ captionId, selectedVote }: { captionId: string; selectedVote: number | null }) {
  const [state, action, pending] = useActionState(voteOnCaption, {});
  return <form action={action} className="post-reactions">
    <input type="hidden" name="caption_id" value={captionId} />
    <div className="reaction-buttons">{([1, -1] as const).map(vote => <button key={vote} type="submit" name="vote" value={vote} disabled={pending} aria-label={vote === 1 ? "Funny: upvote post" : "Miss: downvote post"} aria-pressed={selectedVote === vote} className={`reaction ${selectedVote === vote ? "reaction-selected" : ""}`}><svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={vote === 1 ? "M10 16V4m-5 5 5-5 5 5" : "M10 4v12m-5-5 5 5 5-5"} /></svg>{vote === 1 ? "Funny" : "Miss"}{selectedVote === vote && <span className="reaction-check" aria-hidden="true">✓</span>}</button>)}</div>
    <span aria-live="polite" className={`reaction-status ${state.error ? "status-error" : ""}`}>{pending ? "Saving…" : state.error ?? state.message}</span>
  </form>;
}
