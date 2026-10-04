"use client";

import { useActionState } from "react";
import { voteOnCaption } from "@/app/actions";

export default function CaptionVotes({ captionId, selectedVote }: {
  captionId: string;
  selectedVote: number | null;
}) {
  const [state, action, pending] = useActionState(voteOnCaption, {});

  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="caption_id" value={captionId} />
      <div className="flex gap-2">
        {([1, -1] as const).map((vote) => (
          <button
            key={vote}
            type="submit"
            name="vote"
            value={vote}
            disabled={pending}
            aria-label={vote === 1 ? "Upvote caption" : "Downvote caption"}
            aria-pressed={selectedVote === vote}
            className={`rounded-lg border px-4 py-2 text-xl disabled:opacity-50 ${
              selectedVote === vote
                ? "border-zinc-900 bg-zinc-200 ring-1 ring-zinc-900"
                : "border-gray-300 bg-white hover:bg-gray-100"
            }`}
          >
            {vote === 1 ? "👍" : "👎"}
          </button>
        ))}
      </div>
      <p aria-live="polite" className={`mt-2 text-sm ${state.error ? "text-red-700" : "text-gray-600"}`}>
        {pending ? "Saving vote..." : state.error ?? state.message}
      </p>
    </form>
  );
}
