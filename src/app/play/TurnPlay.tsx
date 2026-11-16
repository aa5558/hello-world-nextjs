"use client";

import { useActionState, useState } from "react";
import { submitCaption, type CaptionFormState } from "@/app/captions/actions";
import { Sparkles } from "@/app/components/Sparkles";
import { Action, Ink, Quiet } from "@/app/components/ui";
import { CueOnMount } from "@/app/components/CueOnMount";
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
      {/* The stage: a photo under a spotlight. */}
      <div className="relative">
        <span aria-hidden className="spotlight" />
        {done && <Sparkles />}
        <div className="frame glow-gold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={alt} className="max-h-[36svh] w-auto max-w-[78vw] rounded-[12px] object-contain" />
        </div>
      </div>

      {done ? (
        <div className="flex flex-col items-center gap-5" aria-live="polite">
          <CueOnMount cue="publish" />
          <h1 className="word glow-green text-6xl sm:text-8xl">
            <Ink text="It's in." />
          </h1>
          <p className="max-w-sm text-lg text-ink-2">“{text}” is now in the battle, blind. The crowd decides.</p>
          <Action href={againHref} tone="green">
            Again?
          </Action>
          <Quiet href={`/g/${generationId}`}>see it next to the AI&apos;s</Quiet>
        </div>
      ) : signedIn ? (
        <form action={formAction} className="flex w-full max-w-xl flex-col items-center gap-5">
          <input type="hidden" name="generation_id" value={generationId} />
          <div className="flex flex-col items-center gap-2">
            <Microphone />
            <h1 className="word glow-gold text-6xl sm:text-8xl">Open mic.</h1>
          </div>
          <input
            id="turn-caption"
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={HUMAN_CAPTION_MAX}
            aria-label="Your caption"
            placeholder="the mic is yours…"
            className="neon-input text-2xl"
          />
          {state.error && (
            <p role="alert" className="text-sm text-down-ink">
              {state.error}
            </p>
          )}
          <Action type="submit" disabled={pending || text.trim().length === 0} tone="gold">
            {pending ? "Adding…" : "Add my caption"}
          </Action>
          <Quiet href={againHref}>another photo</Quiet>
        </form>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <Microphone />
          <h1 className="word glow-gold text-6xl sm:text-8xl">Open mic.</h1>
          <p className="text-lg text-ink-2">Sign in to take the mic.</p>
          <Action href="/login?next=/play%3Fmode%3Dturn" tone="gold">
            Sign in
          </Action>
        </div>
      )}
    </div>
  );
}

// A glowing microphone on a stand.
function Microphone() {
  return (
    <svg aria-hidden viewBox="0 0 64 96" className="h-16 w-12 drop-shadow-[0_0_12px_rgba(255,207,90,0.8)]" fill="none" stroke="#ffcf5a" strokeWidth={2.5} strokeLinecap="round">
      <rect x="20" y="4" width="24" height="38" rx="12" fill="rgba(255,207,90,0.15)" />
      <path d="M12 30v4a20 20 0 0040 0v-4M32 54v30M18 88h28" />
      <path d="M26 16h12M26 24h12M26 32h12" strokeWidth={1.5} opacity={0.7} />
    </svg>
  );
}
