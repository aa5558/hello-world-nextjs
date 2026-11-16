"use client";

import { useActionState, useState } from "react";
import { submitCaption, type CaptionFormState } from "@/app/captions/actions";
import { Sparkles } from "@/app/components/Sparkles";
import { Action, Ink, Quiet } from "@/app/components/ui";
import { HUMAN_CAPTION_MAX } from "@/lib/captions";

const initial: CaptionFormState = {};

// Your turn: a random photo someone already posted. You write the caption;
// it joins that photo's battle, blind, next to the AI's.
export function TurnPlay({
  signedIn,
  generationId,
  imageUrl,
  alt,
  againHref,
}: {
  signedIn: boolean;
  generationId: string;
  imageUrl: string;
  alt: string;
  againHref: string;
}) {
  const [state, formAction, pending] = useActionState(submitCaption, initial);
  const [text, setText] = useState("");
  const done = Boolean(state.success);

  return (
    <div className="flex w-full flex-col items-center gap-6 sm:gap-8">
      <div className="relative">
        {done && <Sparkles />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          className="max-h-[40svh] w-auto max-w-full rounded-[28px] object-contain shadow-[0_40px_80px_-40px_rgba(22,21,20,0.45)]"
        />
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-5" aria-live="polite">
          <h1 className="word text-5xl sm:text-7xl">
            <Ink text="It's in." />
          </h1>
          <p className="max-w-sm text-lg text-ink-2">“{text}” is now in the battle, blind. Classmates decide.</p>
          <Action href={againHref}>Again?</Action>
          <Quiet href={`/g/${generationId}`}>see it next to the AI&apos;s</Quiet>
        </div>
      ) : signedIn ? (
        <form action={formAction} className="flex w-full max-w-xl flex-col items-center gap-5">
          <input type="hidden" name="generation_id" value={generationId} />
          <label htmlFor="turn-caption" className="word text-5xl sm:text-7xl">
            Your turn.
          </label>
          <input
            id="turn-caption"
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={HUMAN_CAPTION_MAX}
            aria-label="Your caption"
            placeholder="write the caption…"
            className="w-full border-0 border-b-[1.5px] border-ink/15 bg-transparent px-1 py-3 text-center text-2xl text-ink outline-none transition placeholder:text-ink-3/70 focus:border-ink"
          />
          {state.error && (
            <p role="alert" className="text-sm text-down-ink">
              {state.error}
            </p>
          )}
          <Action type="submit" disabled={pending || text.trim().length === 0}>
            {pending ? "Adding…" : "Add my caption"}
          </Action>
          <Quiet href={againHref}>another photo</Quiet>
        </form>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <h1 className="word text-5xl sm:text-7xl">Your turn.</h1>
          <p className="text-lg text-ink-2">Sign in to write the caption.</p>
          <Action href="/login?next=/play%3Fmode%3Dturn">Sign in</Action>
        </div>
      )}
    </div>
  );
}
