"use client";

import { useActionState, useState } from "react";
import { VIBES, type Vibe } from "@/lib/captions";
import { createGeneration, type CreateFormState } from "./actions";

const initialState: CreateFormState = {};

export function CreateForm() {
  const [state, formAction, pending] = useActionState(
    createGeneration,
    initialState
  );
  const [preview, setPreview] = useState<string | null>(null);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-black/15 p-4 text-sm text-black/60 hover:border-black/30 dark:border-white/20 dark:text-white/60">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Selected photo"
            className="max-h-80 rounded-lg object-contain"
          />
        ) : (
          <span className="py-10">Tap to choose a photo (PNG, JPEG, or WEBP, up to 4MB)</span>
        )}
        <input
          name="image"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required
          onChange={handleImageChange}
          className="sr-only"
        />
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="context" className="text-sm font-medium">
          Context <span className="font-normal text-black/50 dark:text-white/50">(optional)</span>
        </label>
        <input
          id="context"
          name="context"
          maxLength={200}
          placeholder="e.g. 2am in Butler, week 3 of the semester"
          className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Caption voice</legend>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(VIBES) as Vibe[]).map((vibe, index) => (
            <label
              key={vibe}
              className="cursor-pointer rounded-lg border border-black/15 px-3 py-2 text-sm has-[:checked]:border-black has-[:checked]:bg-black has-[:checked]:text-white dark:border-white/20 dark:has-[:checked]:border-white dark:has-[:checked]:bg-white dark:has-[:checked]:text-black"
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
        className="rounded-md bg-black px-4 py-2 font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Writing captions…" : "Generate captions"}
      </button>
    </form>
  );
}
