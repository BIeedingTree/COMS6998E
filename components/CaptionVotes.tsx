"use client";

import { useActionState, useOptimistic } from "react";
import { voteOnCaption, type ActionState } from "@/app/actions";
import { optimisticRating, type RatingCounts } from "@/lib/drafts";
import Icon from "@/components/Icon";

export default function CaptionVotes({ captionId, selectedVote, counts }: { captionId: string; selectedVote: number | null; counts: RatingCounts }) {
  const [rating, applyRating] = useOptimistic({ ...counts, selected: selectedVote }, optimisticRating);
  const [state, action, pending] = useActionState(async (previous: ActionState, formData: FormData) => {
    const vote = Number(formData.get("vote"));
    applyRating(rating.selected === vote ? null : vote);
    try {
      return await voteOnCaption(previous, formData);
    } catch {
      return { error: "Your rating could not be saved. Please try again." };
    }
  }, {});

  return (
    <form action={action} className="draft-ratings" aria-busy={pending}>
      <input type="hidden" name="caption_id" value={captionId} />
      <div className="reaction-buttons">
        {([1, -1] as const).map(vote => (
          <button key={vote} type="submit" name="vote" value={vote} disabled={pending}
            aria-label={vote === 1 ? "Rate draft: Send it" : "Rate draft: Needs work"}
            title={rating.selected === vote ? "Click again to remove your rating" : vote === 1 ? "Rate as ready to send" : "Rate as needing a rewrite"}
            aria-pressed={rating.selected === vote}
            className={`reaction ${rating.selected === vote ? "reaction-selected" : ""}`}>
            <Icon name={vote === 1 ? "check" : "rewrite"} />
            {vote === 1 ? "Send it" : "Needs work"}
            <span className="rating-count" aria-label={`${vote === 1 ? rating.positive : rating.negative} ratings`}>{vote === 1 ? rating.positive : rating.negative}</span>
          </button>
        ))}
      </div>
      <span aria-live="polite" className={`reaction-status ${state.error ? "status-error" : ""}`}>
        {pending ? "Saving…" : state.error ?? state.message}
      </span>
    </form>
  );
}
