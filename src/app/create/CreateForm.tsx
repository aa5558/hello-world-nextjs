"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  IMAGE_PROMPT_IDEAS,
  IMAGE_PROMPT_MAX,
  VIBES,
  VIBE_EMOJI,
  type Vibe,
} from "@/lib/captions";
import { createGeneration, type CreateFormState } from "./actions";

const initialState: CreateFormState = {};

type Tab = "upload" | "surprise" | "ai";

export function CreateForm({ aiPhotosEnabled }: { aiPhotosEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(
    createGeneration,
    initialState
  );
  const [source, setSource] = useState<Tab>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState("");

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="source" value={source} />

      <div
        role="tablist"
        aria-label="Photo source"
        className={`grid gap-1 rounded-full bg-powder p-1 ${aiPhotosEnabled ? "grid-cols-3" : "grid-cols-2"}`}
      >
        {(
          [
            { value: "upload", label: "📷 Upload" },
            { value: "surprise", label: "🎲 Surprise Me" },
            // Hidden until paid Gemini image generation is switched on.
            ...(aiPhotosEnabled
              ? [{ value: "ai", label: "🎨 Generate" } as const]
              : []),
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={source === option.value}
            onClick={() => setSource(option.value)}
            className={`rounded-full px-3 py-2.5 text-sm font-semibold transition ${
              source === option.value
                ? "bg-white text-ink shadow-[0_2px_10px_-2px_rgba(22,38,61,0.2)]"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {source === "surprise" && (
        <div className="animate-fade-up relative flex flex-col items-center gap-4 overflow-hidden rounded-[28px] bg-ice px-6 py-10 text-center">
          <span className="orb animate-float flex h-20 w-20 items-center justify-center rounded-[26px] text-4xl">🎲</span>
          <p className="display text-3xl">
            No photo? <span className="serif">No problem.</span>
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-ink-2">
            We&apos;ll pull a random photo someone on campus already posted. Write a caption for it and go
            head-to-head with Gemini. Don&apos;t like it? Roll again.
          </p>
          <Link href="/surprise" className="btn btn-primary btn-lg mt-1">
            🎲 Roll a random photo
          </Link>
        </div>
      )}

      {/* Kept mounted (just hidden) so a chosen file survives switching tabs. */}
      <label
        className={`group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[28px] border-2 border-dashed border-ice bg-background text-sm text-ink-2 transition hover:border-sky hover:bg-powder/50 ${
          source === "upload" ? "" : "hidden"
        } ${preview ? "p-2" : "p-6"}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected photo" className="max-h-96 rounded-[22px] object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="orb flex h-16 w-16 items-center justify-center rounded-full text-2xl transition-transform duration-300 group-hover:-translate-y-1">
              📷
            </span>
            <span className="display text-xl text-ink">Tap to choose a photo</span>
            <span className="text-xs text-ink-3">PNG, JPEG, or WEBP, up to 4MB</span>
          </span>
        )}
        {preview && (
          <span className="chip glass absolute bottom-4 right-4 text-ink">Tap to change</span>
        )}
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required={source === "upload"}
          onChange={handleImageChange}
          className="sr-only"
        />
      </label>

      {source === "ai" && (
        <div className="flex flex-col gap-2">
          <label htmlFor="image_prompt" className="text-sm font-semibold">
            Describe the photo you want
          </label>
          <textarea
            id="image_prompt"
            name="image_prompt"
            value={imagePrompt}
            onChange={(event) => setImagePrompt(event.target.value)}
            maxLength={IMAGE_PROMPT_MAX}
            required
            rows={3}
            placeholder="e.g. A raccoon pulling an all-nighter in Butler Library"
            className="field rounded-[22px]"
          />
          <div className="flex flex-wrap gap-1.5">
            {IMAGE_PROMPT_IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setImagePrompt(idea)}
                className="chip bg-powder text-ink transition hover:bg-ice"
              >
                {idea}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-3">
            Gemini draws the photo, then writes four captions for it. Limit 5 AI photos a day.
          </p>
        </div>
      )}

      {source !== "surprise" && (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="context" className="text-sm font-semibold">
              Context <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <input
              id="context"
              name="context"
              maxLength={200}
              placeholder="e.g. 2am in Butler, week 3 of the semester"
              className="field"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-semibold">Pick the AI&apos;s voice</legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(VIBES) as Vibe[]).map((vibe, index) => (
                <label
                  key={vibe}
                  className="flex cursor-pointer items-center gap-3 rounded-[20px] bg-background px-3 py-3 text-sm font-medium text-ink ring-1 ring-line transition hover:ring-sky has-[:checked]:bg-ice has-[:checked]:ring-2 has-[:checked]:ring-sky has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-sky"
                >
                  <input
                    type="radio"
                    name="vibe"
                    value={vibe}
                    defaultChecked={index === 0}
                    className="sr-only"
                  />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm" aria-hidden>
                    {VIBE_EMOJI[vibe]}
                  </span>
                  <span className="leading-tight">{VIBES[vibe].label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {state.error && (
            <p role="alert" className="rounded-[20px] bg-down-soft px-4 py-3 text-sm text-down-ink">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full">
            {pending ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
                {source === "ai" ? "Drawing your photo, then captioning… (up to 30s)" : "The AI is cooking…"}
              </>
            ) : source === "ai" ? (
              "Generate photo + captions ✨"
            ) : (
              "Let the AI cook ✨"
            )}
          </button>
        </>
      )}
    </form>
  );
}
