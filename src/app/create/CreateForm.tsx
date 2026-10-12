"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  IMAGE_PROMPT_IDEAS,
  IMAGE_PROMPT_MAX,
  VIBES,
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
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="source" value={source} />

      <div
        role="tablist"
        aria-label="Photo source"
        className={`grid gap-1 rounded-xl bg-black/5 p-1 dark:bg-white/10 ${
          aiPhotosEnabled ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        {(
          [
            { value: "upload", label: "📷 Upload a photo" },
            { value: "surprise", label: "🎲 Surprise Me" },
            // Hidden until paid Gemini image generation is switched on.
            ...(aiPhotosEnabled
              ? [{ value: "ai", label: "🎨 Generate with AI" } as const]
              : []),
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={source === option.value}
            onClick={() => setSource(option.value)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              source === option.value
                ? "bg-surface shadow-sm"
                : "text-black/55 dark:text-white/55"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {source === "surprise" && (
        <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-indigo-700 px-5 py-8 text-center text-white">
          <span className="text-6xl" aria-hidden>
            🎲
          </span>
          <p className="text-xl font-black">No photo? No problem.</p>
          <p className="max-w-sm text-sm text-white/80">
            We&apos;ll pull a random photo someone on campus already posted.
            Write a caption for it and go head-to-head with Gemini. Don&apos;t
            like it? Roll again.
          </p>
          <Link
            href="/surprise"
            className="mt-1 rounded-full bg-columbia px-6 py-2.5 font-bold text-navy shadow-sm transition hover:bg-white active:scale-95"
          >
            🎲 Roll a random photo
          </Link>
        </div>
      )}

      {/* Kept mounted (just hidden) so a chosen file survives switching tabs. */}
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-black/15 bg-surface p-4 text-sm text-black/60 hover:border-black/30 dark:border-white/20 dark:text-white/60 ${
          source === "upload" ? "" : "hidden"
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Selected photo"
            className="max-h-80 rounded-lg object-contain"
          />
        ) : (
          <span className="py-10 text-center">
            Tap to choose a photo
            <br />
            <span className="text-xs">PNG, JPEG, or WEBP, up to 4MB</span>
          </span>
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
          <label htmlFor="image_prompt" className="text-sm font-medium">
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
            className="rounded-xl border border-black/15 bg-surface px-3 py-2 dark:border-white/20"
          />
          <div className="flex flex-wrap gap-1.5">
            {IMAGE_PROMPT_IDEAS.map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => setImagePrompt(idea)}
                className="rounded-full bg-columbia/40 px-2.5 py-1 text-xs text-navy hover:bg-columbia dark:bg-columbia/15 dark:text-columbia"
              >
                {idea}
              </button>
            ))}
          </div>
          <p className="text-xs text-black/50 dark:text-white/50">
            Gemini draws the photo, then writes four captions for it. Limit 5
            AI photos a day.
          </p>
        </div>
      )}

      {source !== "surprise" && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="context" className="text-sm font-medium">
              Context <span className="font-normal text-black/50 dark:text-white/50">(optional)</span>
            </label>
            <input
              id="context"
              name="context"
              maxLength={200}
              placeholder="e.g. 2am in Butler, week 3 of the semester"
              className="rounded-xl border border-black/15 bg-surface px-3 py-2 dark:border-white/20"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Caption voice</legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(VIBES) as Vibe[]).map((vibe, index) => (
                <label
                  key={vibe}
                  className="cursor-pointer rounded-xl border border-black/15 bg-surface px-3 py-2 text-sm has-[:checked]:border-navy has-[:checked]:bg-navy has-[:checked]:text-white dark:border-white/20 dark:has-[:checked]:border-columbia dark:has-[:checked]:bg-columbia dark:has-[:checked]:text-navy"
                >
                  <input
                    type="radio"
                    name="vibe"
                    value={vibe}
                    defaultChecked={index === 0}
                    className="sr-only"
                  />
                  {VIBES[vibe].label}
                </label>
              ))}
            </div>
          </fieldset>

          {state.error && (
            <p role="alert" className="text-sm text-red-600">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-navy px-4 py-3 font-semibold text-white disabled:opacity-50 dark:bg-columbia dark:text-navy"
          >
            {pending
              ? source === "ai"
                ? "Drawing your photo, then captioning… (up to 30s)"
                : "Writing captions…"
              : source === "ai"
                ? "Generate photo + captions"
                : "Generate captions"}
          </button>
        </>
      )}
    </form>
  );
}
