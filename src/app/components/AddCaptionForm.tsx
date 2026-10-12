"use client";

import { useActionState, useState } from "react";
import { submitCaption, type CaptionFormState } from "@/app/captions/actions";
import { HUMAN_CAPTION_MAX } from "@/lib/captions";

const initialState: CaptionFormState = {};

// Lets a signed-in student throw their own caption into the battle.
export function AddCaptionForm({ generationId }: { generationId: string }) {
  const [state, formAction, pending] = useActionState(
    submitCaption,
    initialState
  );
  const [text, setText] = useState("");
  const [clearedAt, setClearedAt] = useState(state.submittedAt);

  // Clear the box after each successful post.
  if (state.submittedAt !== clearedAt) {
    setClearedAt(state.submittedAt);
    setText("");
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="generation_id" value={generationId} />
      <label htmlFor={`caption-${generationId}`} className="text-sm font-semibold">
        Think you&apos;re funnier than Gemini?
      </label>
      <div className="flex gap-2">
        <input
          id={`caption-${generationId}`}
          name="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={HUMAN_CAPTION_MAX}
          required
          autoComplete="off"
          placeholder="Write your caption…"
          className="min-w-0 flex-1 rounded-xl border border-black/15 bg-surface px-3 py-2.5 text-[15px] outline-none focus:border-navy focus:ring-2 focus:ring-columbia dark:border-white/20 dark:focus:border-columbia"
        />
        <button
          type="submit"
          disabled={pending || text.trim().length === 0}
          className="shrink-0 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 dark:bg-columbia dark:text-navy"
        >
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
      <div className="flex justify-between text-xs text-black/50 dark:text-white/50">
        <span>
          {state.error ? (
            <span role="alert" className="text-red-600">
              {state.error}
            </span>
          ) : state.success ? (
            <span className="text-emerald-700 dark:text-emerald-400">
              You&apos;re in the battle! Others will vote without knowing it&apos;s you.
            </span>
          ) : (
            "It'll be mixed in with the AI captions, anonymously."
          )}
        </span>
        <span className="tabular-nums">
          {text.length}/{HUMAN_CAPTION_MAX}
        </span>
      </div>
    </form>
  );
}
