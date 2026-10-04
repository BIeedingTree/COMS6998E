"use client";

import { useActionState } from "react";
import { generateCaption } from "@/app/actions";

export default function CaptionGenerator() {
  const [state, action, pending] = useActionState(generateCaption, {});

  return (
    <form action={action} className="mb-8 space-y-4 rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
      <h2 className="text-2xl font-semibold">Generate a Caption</h2>
      <div>
        <label htmlFor="topic" className="mb-2 block font-medium">
          What should the caption be about?
        </label>
        <input
          id="topic"
          name="topic"
          type="text"
          required
          maxLength={200}
          placeholder="e.g. Columbia dining halls"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-2 focus:outline-zinc-700"
        />
      </div>
      <button disabled={pending} className="rounded-lg bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700 disabled:opacity-50">
        {pending ? "Generating..." : "Generate Caption"}
      </button>
      <p aria-live="polite" className={state.error ? "text-red-700" : "text-gray-600"}>
        {state.error ?? state.message}
      </p>
    </form>
  );
}
