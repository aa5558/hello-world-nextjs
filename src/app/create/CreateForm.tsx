"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  IMAGE_PROMPT_IDEAS,
  IMAGE_PROMPT_MAX,
  VIBES,
  VIBE_EMOJI,
  type Vibe,
} from "@/lib/captions";
import type { LibraryImage } from "@/lib/library";
import { createGeneration, type CreateFormState } from "./actions";

const initialState: CreateFormState = {};

type Source = "upload" | "library" | "ai";

const VIBE_TAGLINES: Record<Vibe, string> = {
  midwest: "Ope. Polite chaos.",
  online: "lowercase, deadpan, unwell",
  columbia: "Lit Hum references only",
  newyorker: "Unimpressed. Correct.",
};

// What the loading screen says while the server runs the prompt chain. The
// server doesn't stream progress, so these advance on a timer and hold on
// the last line until the redirect.
const COOKING = [
  "Looking very closely at your photo…",
  "Pitching jokes to the writers' room…",
  "Cutting the ones that didn't land…",
  "Plating four captions…",
];

const MAX_BYTES = 4 * 1024 * 1024;

export function CreateForm({
  aiPhotosEnabled,
  dailyDrop,
  library,
  initialImageId,
}: {
  aiPhotosEnabled: boolean;
  dailyDrop: LibraryImage | null;
  library: LibraryImage[];
  initialImageId: string | null;
}) {
  const [state, formAction, pending] = useActionState(createGeneration, initialState);
  const libraryChoices = dailyDrop
    ? [dailyDrop, ...library.filter((image) => image.id !== dailyDrop.id)]
    : library;
  const initialLibrary = libraryChoices.find((image) => image.id === initialImageId) ?? null;

  const [source, setSource] = useState<Source>(initialLibrary ? "library" : "upload");
  const [libraryId, setLibraryId] = useState<string | null>(initialLibrary?.id ?? libraryChoices[0]?.id ?? null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [vibe, setVibe] = useState<Vibe>("columbia");
  const [context, setContext] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [stage, setStage] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const contextInput = useRef<HTMLInputElement>(null);

  // A photo (or context) chosen before the page finished loading is already
  // in the inputs but React never saw the change event; pick it up on mount.
  useEffect(() => {
    const file = fileInput.current?.files?.[0];
    if (file) acceptFile(file);
    const typed = contextInput.current?.value;
    if (typed) setContext(typed);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, COOKING.length - 1)), 3200);
    return () => {
      clearInterval(timer);
      setStage(0);
    };
  }, [pending]);

  function acceptFile(file: File | undefined) {
    setFileError(null);
    if (!file) return setPreview(null);
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setFileError("That file type won't work. Use a PNG, JPEG, or WEBP.");
      return setPreview(null);
    }
    if (file.size > MAX_BYTES) {
      setFileError("That photo is over 4MB. Try a smaller one or a screenshot of it.");
      return setPreview(null);
    }
    setPreview(URL.createObjectURL(file));
  }

  const chosenLibrary = libraryChoices.find((image) => image.id === libraryId) ?? null;
  const previewUrl = source === "upload" ? preview : source === "library" ? chosenLibrary?.url ?? null : null;
  const ready =
    source === "upload" ? Boolean(preview) : source === "library" ? Boolean(chosenLibrary) : imagePrompt.trim().length >= 3;

  const sources: { value: Source; label: string; hint: string }[] = [
    { value: "upload", label: "Upload", hint: "your camera roll" },
    ...(libraryChoices.length ? [{ value: "library" as const, label: "Pick a photo", hint: dailyDrop ? "incl. today's drop" : "from the library" }] : []),
    ...(aiPhotosEnabled ? [{ value: "ai" as const, label: "Generate", hint: "describe it" }] : []),
  ];

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10">
      <input type="hidden" name="source" value={source} />
      {source === "library" && libraryId && <input type="hidden" name="library_image" value={libraryId} />}
      <input type="hidden" name="vibe" value={vibe} />

      <div className="flex min-w-0 flex-col gap-8">
        {/* 01 Photo */}
        <section aria-labelledby="step-photo" className="flex flex-col gap-4">
          <StepTitle n="01" id="step-photo" title="The photo" sub="Anything from campus life counts." />

          {sources.length > 1 && (
            <div role="radiogroup" aria-label="Photo source" className="flex flex-wrap gap-2">
              {sources.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={source === option.value}
                  onClick={() => setSource(option.value)}
                  className={`flex flex-col items-start rounded-[18px] px-4 py-2.5 text-left text-sm transition ${
                    source === option.value
                      ? "bg-ink text-white shadow-[0_10px_24px_-14px_rgba(22,38,61,0.9)]"
                      : "bg-white text-ink ring-1 ring-line hover:ring-sky"
                  }`}
                >
                  <span className="font-semibold">{option.label}</span>
                  <span className={`text-[11px] ${source === option.value ? "text-white/70" : "text-ink-3"}`}>{option.hint}</span>
                </button>
              ))}
            </div>
          )}

          {/* Kept mounted (just hidden) so a chosen file survives switching sources. */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file && fileInput.current) {
                const transfer = new DataTransfer();
                transfer.items.add(file);
                fileInput.current.files = transfer.files;
                acceptFile(file);
              }
            }}
            className={`group relative flex min-h-56 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[30px] border-2 border-dashed text-sm transition ${
              dragging ? "border-sky bg-powder" : "border-ice bg-white/70 hover:border-sky hover:bg-powder/40"
            } ${source === "upload" ? "" : "hidden"}`}
          >
            {preview ? (
              <span className="flex w-full items-center gap-4 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Your selected photo" className="h-28 w-28 rounded-[22px] object-cover" />
                <span className="flex flex-col gap-1">
                  <span className="display text-xl text-ink">Looking good.</span>
                  <span className="text-ink-2">Tap or drop to swap it.</span>
                </span>
              </span>
            ) : (
              <span className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <span className="orb flex h-16 w-16 items-center justify-center rounded-[22px] text-2xl transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-6">
                  📸
                </span>
                <span className="display text-2xl text-ink">Drop a photo here</span>
                <span className="text-ink-2">or tap to choose · PNG, JPEG, WEBP · up to 4MB</span>
              </span>
            )}
            <input
              ref={fileInput}
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required={source === "upload"}
              onChange={(e) => acceptFile(e.target.files?.[0])}
              className="sr-only"
            />
          </label>
          {fileError && source === "upload" && (
            <p role="alert" className="rounded-[18px] bg-down-soft px-4 py-2.5 text-sm text-down-ink">
              {fileError}
            </p>
          )}

          {source === "library" && (
            <div role="radiogroup" aria-label="Library photo" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {libraryChoices.map((image) => {
                const isDrop = image.id === dailyDrop?.id;
                return (
                  <button
                    key={image.id}
                    type="button"
                    role="radio"
                    aria-checked={libraryId === image.id}
                    aria-label={`${image.title}${isDrop ? " (today's drop)" : ""}`}
                    onClick={() => setLibraryId(image.id)}
                    className={`group relative aspect-square overflow-hidden rounded-[20px] bg-powder transition ${
                      libraryId === image.id ? "ring-4 ring-sky" : "ring-1 ring-line hover:ring-sky"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    {isDrop && <span className="chip absolute left-1.5 top-1.5 bg-butter px-2 py-0.5 text-[10px] text-butter-ink">today&apos;s drop</span>}
                  </button>
                );
              })}
            </div>
          )}

          {source === "ai" && (
            <div className="flex flex-col gap-2">
              <label htmlFor="image_prompt" className="text-sm font-semibold">
                Describe the photo you want
              </label>
              <textarea
                id="image_prompt"
                name="image_prompt"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                maxLength={IMAGE_PROMPT_MAX}
                required
                rows={3}
                placeholder="e.g. A raccoon pulling an all-nighter in Butler Library"
                className="field rounded-[22px]"
              />
              <div className="flex flex-wrap gap-1.5">
                {IMAGE_PROMPT_IDEAS.map((idea) => (
                  <button key={idea} type="button" onClick={() => setImagePrompt(idea)} className="chip bg-powder text-ink transition hover:bg-ice">
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 02 Voice */}
        <section aria-labelledby="step-voice" className="flex flex-col gap-4">
          <StepTitle n="02" id="step-voice" title="The voice" sub="Who's the AI pretending to be?" />
          <div role="radiogroup" aria-labelledby="step-voice" className="grid grid-cols-2 gap-2">
            {(Object.keys(VIBES) as Vibe[]).map((key) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={vibe === key}
                onClick={() => setVibe(key)}
                className={`group flex items-center gap-3 rounded-[22px] p-3 text-left transition ${
                  vibe === key ? "bg-ice ring-2 ring-sky" : "bg-white ring-1 ring-line hover:ring-sky"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] text-xl transition-transform ${
                    vibe === key ? "orb scale-105" : "bg-powder group-hover:-rotate-6"
                  }`}
                >
                  {VIBE_EMOJI[key]}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight text-ink">{VIBES[key].label}</span>
                  <span className="block truncate text-xs text-ink-2">{VIBE_TAGLINES[key]}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 03 Context */}
        <section aria-labelledby="step-context" className="flex flex-col gap-3">
          <StepTitle n="03" id="step-context" title="The context" sub="Optional, but the AI gets funnier with it." />
          <input
            id="context"
            name="context"
            aria-labelledby="step-context"
            ref={contextInput}
            defaultValue=""
            onChange={(e) => setContext(e.target.value)}
            maxLength={200}
            placeholder="e.g. 2am in Butler, week 3 of the semester"
            className="field"
          />
        </section>
      </div>

      {/* Live preview + submit */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card overflow-hidden p-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-gradient-to-br from-powder to-ice">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className={`h-full w-full object-cover transition duration-700 ${pending ? "scale-105 blur-[2px]" : ""}`} />
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-2 text-ink-3">
                <span className="text-4xl" aria-hidden>
                  {source === "ai" ? "🎨" : "🖼️"}
                </span>
                <span className="text-sm">{source === "ai" ? "Your AI photo shows up after posting" : "Your photo shows up here"}</span>
              </span>
            )}
            <span className="chip glass absolute left-3 top-3 text-ink">
              {VIBE_EMOJI[vibe]} {VIBES[vibe].label}
            </span>
            {pending && <span aria-hidden className="studio-scan absolute inset-x-0 h-24" />}
          </div>
          <div className="flex flex-col gap-2 p-3">
            {context && <p className="serif text-xl leading-tight text-ink">“{context}”</p>}
            {pending ? (
              <div role="status" aria-live="polite" className="flex flex-col gap-2">
                {COOKING.map((line, i) => (
                  <p
                    key={line}
                    className={`flex items-center gap-2 text-sm transition-all duration-500 ${
                      i < stage ? "text-ink-3" : i === stage ? "font-semibold text-ink" : "text-ink-3/50"
                    }`}
                  >
                    <span aria-hidden className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${i < stage ? "bg-human text-white" : i === stage ? "orb animate-pulse" : "bg-powder"}`}>
                      {i < stage ? "✓" : ""}
                    </span>
                    {line}
                  </p>
                ))}
              </div>
            ) : (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 rounded-[14px] bg-background px-3 py-2.5 ring-1 ring-line">
                  <span className="h-2 w-2 rounded-full bg-ai/60" aria-hidden />
                  <span className="h-2.5 rounded-full bg-powder" style={{ width: `${80 - i * 12}%` }} />
                </div>
              ))
            )}
          </div>
        </div>

        {state.error && (
          <p role="alert" className="rounded-[20px] bg-down-soft px-4 py-3 text-sm text-down-ink">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending || !ready} className="btn btn-primary btn-lg w-full">
          {pending ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
              Let it cook…
            </>
          ) : (
            "Let the AI cook ✨"
          )}
        </button>
        <p className="text-center text-xs text-ink-3">
          {ready ? "Gemini writes four captions. Then it's you vs. the machine." : "Pick a photo to unlock the button."}
        </p>
      </aside>
    </form>
  );
}

function StepTitle({ n, id, title, sub }: { n: string; id: string; title: string; sub: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="display text-sm text-sky-deep">{n}</span>
      <div>
        <h2 id={id} className="display text-2xl text-ink">
          {title}
        </h2>
        <p className="text-sm text-ink-2">{sub}</p>
      </div>
    </div>
  );
}
