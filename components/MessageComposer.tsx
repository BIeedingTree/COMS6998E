"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { generateCaption } from "@/app/actions";
import { MAX_SITUATION_LENGTH, RECIPIENTS, TONES } from "@/lib/message-options";
import { CATEGORIES, MESSAGE_TYPES, type Category, type MessageType } from "@/lib/drafts";
import { MESSAGE_TEMPLATES } from "@/lib/message-templates";
import Icon from "@/components/Icon";


export default function MessageComposer() {
  const [state, action, pending] = useActionState(generateCaption, {});
  const [situation, setSituation] = useState("");
  const [recipient, setRecipient] = useState("");
  const [tone, setTone] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("message");
  const [category, setCategory] = useState<Category>("other");
  const examples = category === "other" ? MESSAGE_TEMPLATES.filter((_, i) => [0, 5, 9, 12, 15, 16].includes(i)) : MESSAGE_TEMPLATES.filter(example => example.category === category);
  const form = useRef<HTMLFormElement>(null);
  const situationInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!state.draftId) return;
    const draft = document.getElementById(`draft-${state.draftId}`);
    draft?.focus({ preventScroll: true });
    draft?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }, [state]);

  useEffect(() => {
    // Action forms reset even when the action returns a handled error.
    // Retain all inputs so a retry uses the same situation and preferences.
    const element = form.current;
    const retainInputs = (event: Event) => event.preventDefault();
    element?.addEventListener("reset", retainInputs);
    return () => element?.removeEventListener("reset", retainInputs);
  }, []);

  return (
    <section className="composer-section" aria-labelledby="composer-heading">
      <form ref={form} action={action} className="composer" aria-busy={pending}>
        <div className="composer-title-row">
          <span className="step-number">01</span>
          <h2 id="composer-heading"><label htmlFor="situation">What are you trying to say?</label></h2>
          <span className="ai-label"><Icon name="spark" /> AI-assisted</span>
        </div>
        <p className="composer-intro" id="situation-hint">The context, the awkward bit, the thing you wish you could just say.</p>
        <div className="draft-format-options">
          <div className="recipient-field"><label htmlFor="message-type" className="field-label">MESSAGE TYPE</label>
            <select id="message-type" name="message_type" value={messageType} onChange={event => setMessageType(event.target.value as MessageType)} disabled={pending}>
              {MESSAGE_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select></div>
          <div className="recipient-field"><label htmlFor="category" className="field-label">CATEGORY</label>
            <select id="category" name="category" value={category} onChange={event => setCategory(event.target.value as Category)} disabled={pending}>
              {CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></div>
        </div>
        <div className="situation-field">
          <textarea
            ref={situationInput}
            id="situation"
            name="situation"
            required
            maxLength={MAX_SITUATION_LENGTH}
            rows={4}
            placeholder="e.g. Ask my professor for a two-day extension without sounding irresponsible…"
            value={situation}
            onChange={event => setSituation(event.target.value)}
            disabled={pending}
            aria-describedby="situation-hint sharing-note"
          />
          <span className="character-count">{situation.length} / {MAX_SITUATION_LENGTH.toLocaleString("en-US")}</span>
        </div>
        <div className="composer-options">
          <div className="recipient-field">
            <label htmlFor="recipient" className="field-label">WHO IS THIS FOR? <span>Optional</span></label>
            <select id="recipient" name="recipient" disabled={pending} value={recipient} onChange={event => setRecipient(event.target.value)}>
              <option value="">Anyone in mind?</option>
              {RECIPIENTS.map(recipient => <option key={recipient}>{recipient}</option>)}
            </select>
          </div>
          <fieldset className="tone-field" disabled={pending}>
            <legend className="field-label">THE TONE <span>Optional</span></legend>
            <div className="tone-options">
              <label className="tone-option"><input type="radio" name="tone" value="" checked={tone === ""} onChange={() => setTone("")} /><span>Natural</span></label>
              {TONES.map(option => <label className="tone-option" key={option}><input type="radio" name="tone" value={option} checked={tone === option} onChange={() => setTone(option)} /><span>{option}</span></label>)}
            </div>
          </fieldset>
        </div>
        <div className="composer-bottom">
          <p id="sharing-note">Saved privately, just for you.<br />Share only when you choose.</p>
          <button type="submit" disabled={pending} className="primary-button">
            {pending ? <span className="spinner" aria-hidden="true" /> : <Icon name="spark" />}
            {pending ? "Finding the words…" : "Say it better"}
          </button>
        </div>
        <div aria-live="polite" className={`composer-status ${state.error ? "status-error" : "status-success"}`}>
          {state.error ?? state.message}
          {!state.error && state.message && <a href={state.draftId ? `#draft-${state.draftId}` : "#my-drafts"}>View your draft <Icon name="arrow" /></a>}
        </div>
      </form>
      <div className="examples">
        <span className="eyebrow">{category === "other" ? "A LITTLE HELP GETTING STARTED" : `${category.toUpperCase()} QUICK STARTS`}</span>
        <div className="example-options">
          {examples.map(example => <button key={example.label} type="button" disabled={pending} onClick={() => { setSituation(example.text); setMessageType(example.type); setCategory(example.category); setRecipient(example.recipient); situationInput.current?.focus(); }}>
            {example.label}<Icon name="arrow" />
          </button>)}
        </div>
      </div>
    </section>
  );
}
