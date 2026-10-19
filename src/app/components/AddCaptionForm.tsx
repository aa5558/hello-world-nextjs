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
    <form action={formAction} className="flex flex-col gap-2.5">
      <input type="hidden" name="generation_id" value={generationId} />
      <label htmlFor={`caption-${generationId}`} className="display text-lg">
        think you&apos;re funnier than <span className="serif text-xl">Gemini?</span>
      </label>
      <div className="flex gap-2 rounded-full bg-white p-1.5 shadow-[inset_0_0_0_1px_rgba(22,38,61,0.1)] focus-within:shadow-[inset_0_0_0_1px_#69b5ff,0_0_0_4px_rgba(105,181,255,0.25)]">
        <input
          id={`caption-${generationId}`}
          name="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={HUMAN_CAPTION_MAX}
          required
          autoComplete="off"
          placeholder="your caption goes here…"
          className="min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-ink-3"
        />
        <button
          type="submit"
          disabled={pending || text.trim().length === 0}
          className="btn btn-primary btn-sm shrink-0"
        >
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
      <div className="flex justify-between gap-3 px-2 text-xs text-ink-3">
        <span>
          {state.error ? (
            <span role="alert" className="text-down-ink">
              {state.error}
            </span>
          ) : state.success ? (
            <span className="font-medium text-human-ink">
              you&apos;re in the ring 🥊 people vote without knowing it&apos;s you.
            </span>
          ) : (
            "It gets mixed in with the AI captions, anonymously."
          )}
        </span>
        <span className="tabular-nums">
          {text.length}/{HUMAN_CAPTION_MAX}
        </span>
      </div>
    </form>
  );
}
