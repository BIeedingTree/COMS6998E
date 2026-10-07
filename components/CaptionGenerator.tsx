"use client";

import { useActionState, useRef } from "react";
import { generateCaption } from "@/app/actions";
import Icon from "@/components/Icon";

export default function CaptionGenerator() {
  const [state, action, pending] = useActionState(generateCaption, {});
  const topicInput = useRef<HTMLTextAreaElement>(null);

  return <section className="composer-wrap" aria-labelledby="composer-heading">
    <form action={action} className="composer">
      <div className="composer-heading"><span className="composer-icon"><Icon name="spark" /></span><h2 id="composer-heading">Create an AI post</h2><span className="mini-label">A little artificial. Very relatable.</span></div>
      <label htmlFor="topic" className="composer-label">What should the timeline talk about?</label>
      <textarea ref={topicInput} id="topic" name="topic" required maxLength={200} rows={2} placeholder="e.g. Butler Library at 2 AM" disabled={pending} />
      <div className="suggestion-row"><span>Try a topic</span>{["Midterm season", "Dining halls", "NYC subway"].map(topic => <button key={topic} type="button" disabled={pending} className="topic-chip" onClick={() => { if (topicInput.current) { topicInput.current.value = topic; topicInput.current.focus(); } }}>{topic}</button>)}</div>
      <div className="composer-bottom"><span className="composer-disclosure"><Icon name="spark" /> Written by AI. Inspired by you.</span><button disabled={pending} className="primary-button">{pending ? <span className="spinner" aria-hidden="true" /> : <Icon name="spark" />}{pending ? "Generating…" : "Generate post"}</button></div>
      <div aria-live="polite" className={`composer-status ${state.error ? "status-error" : "status-success"}`}>{state.error ?? state.message}</div>
    </form>
  </section>;
}
