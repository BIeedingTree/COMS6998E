"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { generateCaption } from "@/app/actions";
import { MAX_SITUATION_LENGTH, RECIPIENTS, TONES } from "@/lib/message-options";
import { CATEGORIES, MESSAGE_TYPES, type Category, type MessageType } from "@/lib/drafts";
import { templatesFor } from "@/lib/message-templates";


export default function MessageComposer({ filtered = false }: { filtered?: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(generateCaption, {});
  const [situation, setSituation] = useState("");
  const [recipient, setRecipient] = useState("");
  const [tone, setTone] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("message");
  const [category, setCategory] = useState<Category>("other");
  const [templateFilters, setTemplateFilters] = useState<{ category: Category; recipient: string }>({ category: "other", recipient: "" });
  const examples = templatesFor(templateFilters.category, templateFilters.recipient);
  const form = useRef<HTMLFormElement>(null);
  const situationInput = useRef<HTMLTextAreaElement>(null);
  const refreshedDraftId = useRef<string | null>(null);

  useEffect(() => {
    if (!state.draftId) return;
    if (refreshedDraftId.current === state.draftId) return;
    refreshedDraftId.current = state.draftId;
    if (filtered) router.replace("/", { scroll: false });
    else router.refresh();
  }, [state.draftId, filtered, router]);

  useEffect(() => {
    if (!state.draftId || filtered) return;
    const focusDraft = () => {
      const draft = document.getElementById(`draft-${state.draftId}`);
      if (!draft) return false;
      draft.focus({ preventScroll: true });
      draft.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      return true;
    };
    if (focusDraft()) return;
    const draftSection = document.getElementById("my-drafts");
    if (!draftSection) return;
    const observer = new MutationObserver(() => { if (focusDraft()) observer.disconnect(); });
    observer.observe(draftSection, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [state.draftId, filtered]);

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
        <div className="composer-fields">
          <div><label htmlFor="message-type">Message type</label>
            <select id="message-type" name="message_type" value={messageType} onChange={event => setMessageType(event.target.value as MessageType)} disabled={pending}>
              {MESSAGE_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select></div>
          <div><label htmlFor="category">Category</label>
            <select id="category" name="category" value={category} onChange={event => {
              const nextCategory = event.target.value as Category;
              setCategory(nextCategory);
              setTemplateFilters(filters => ({ ...filters, category: nextCategory }));
            }} disabled={pending}>
              {CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></div>
        </div>
        <h2 id="composer-heading"><label htmlFor="situation">What do you need to say?</label></h2>
        <div className="situation-field">
          <textarea ref={situationInput} id="situation" name="situation" required
            maxLength={MAX_SITUATION_LENGTH} rows={4}
            placeholder="Ask for an extension, follow up on an application…"
            value={situation} onChange={event => setSituation(event.target.value)} disabled={pending} />
          <span className="character-count">{situation.length} / {MAX_SITUATION_LENGTH.toLocaleString("en-US")}</span>
        </div>
        <div className="composer-preferences">
          <div className="recipient-field">
            <label htmlFor="recipient">Recipient</label>
            <select id="recipient" name="recipient" disabled={pending} value={recipient} onChange={event => {
              const nextRecipient = event.target.value;
              setRecipient(nextRecipient);
              setTemplateFilters(filters => ({ ...filters, recipient: nextRecipient }));
            }}>
              <option value="">Not specified</option>
              {RECIPIENTS.map(option => <option key={option}>{option}</option>)}
            </select>
          </div>
          <fieldset className="tone-field" disabled={pending}>
            <legend>Tone <span>Optional</span></legend>
            <div className="tone-options">
              {[{ value: "", label: "Natural" }, ...TONES.map(option => ({ value: option, label: option }))].map(option => (
                <label key={option.label} className="tone-option">
                  <input type="radio" name="tone" value={option.value} checked={tone === option.value}
                    onChange={() => setTone(option.value)} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="composer-bottom">
          <button type="submit" disabled={pending} className="primary-button">
            {pending && <span className="spinner" aria-hidden="true" />}
            {pending ? "Generating…" : "Generate draft"}
          </button>
        </div>
        <div aria-live="polite" className={`composer-status ${state.error ? "status-error" : "status-success"}`}>
          {state.error ?? state.message}
          {!state.error && state.message && <a href={state.draftId ? `${filtered ? "/" : ""}#draft-${state.draftId}` : `${filtered ? "/" : ""}#my-drafts`}>View draft</a>}
        </div>
      </form>
      <div className="examples">
        <h2>Templates</h2>
        <div className="example-options">
          {examples.map(example => <button key={example.label} type="button" disabled={pending} onClick={() => { setSituation(example.text); setMessageType(example.type); setCategory(example.category); setRecipient(example.recipient); situationInput.current?.focus(); }}>
            {example.label}
          </button>)}
          {examples.length === 0 && <p>No matching templates.</p>}
        </div>
      </div>
    </section>
  );
}
