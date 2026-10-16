"use client";
import { useActionState, useState } from "react";
import { setDraftPublication, type ActionState } from "@/app/actions";

export default function PublishControl({ captionId, isPublic }: { captionId: string; isPublic: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(async (previous: ActionState, formData: FormData) => {
    try {
      const result = await setDraftPublication(previous, formData);
      if (!result.error) setConfirming(false);
      return result;
    } catch { return { error: "Your sharing setting could not be saved. Please try again." }; }
  }, {});
  return <div className="publish-control">
    {isPublic ? <form action={action} className="published-controls" aria-busy={pending}>
      <input type="hidden" name="caption_id" value={captionId} />
      <input type="hidden" name="is_public" value="false" />
      <button type="submit" className="quiet-button" disabled={pending}>{pending ? "Removing…" : "Remove from Community"}</button>
    </form> : confirming ? <form action={action} className="publish-confirmation" aria-busy={pending}>
      <input type="hidden" name="caption_id" value={captionId} />
      <input type="hidden" name="is_public" value="true" />
      <p>Post to Community?</p>
      <span>Your draft and original request will be visible. Check for personal details. Your account identity stays hidden.</span>
      <div><button type="submit" className="secondary-button" disabled={pending}>{pending ? "Posting…" : "Post anonymously"}</button>
        <button type="button" className="quiet-button" disabled={pending} onClick={() => setConfirming(false)}>Cancel</button></div>
    </form> : <button type="button" className="share-button" onClick={() => setConfirming(true)}>Post to Community</button>}
    <p className={`publish-status ${state.error ? "status-error" : ""}`} aria-live="polite">{state.error ?? state.message}</p>
  </div>;
}
