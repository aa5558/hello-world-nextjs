"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { IMAGE_PROMPT_IDEAS, IMAGE_PROMPT_MAX, VIBES, type Vibe } from "@/lib/captions";
import type { LibraryImage } from "@/lib/library";
import { Ink } from "@/app/components/ui";
import { createGeneration, type CreateFormState } from "./actions";

const initialState: CreateFormState = {};

type Source = "upload" | "library" | "ai";

const VIBE_TAGLINES: Record<Vibe, string> = {
  midwest: "Ope. Polite chaos.",
  online: "lowercase, deadpan, unwell",
  columbia: "Lit Hum references only",
  newyorker: "Unimpressed. Correct.",
};

// What the screen says while the server writes and posts. The server
// doesn't stream progress, so these advance on a timer and hold on the last
// line until the redirect.
const COOKING = [
  "Looking very closely at your photo…",
  "Pitching jokes to the writers' room…",
  "Cutting the ones that didn't land…",
  "Plating four captions…",
];

const MAX_BYTES = 4 * 1024 * 1024;

const STEPS = ["moment", "vibe", "context", "punchline"] as const;

// One screen, one question. All steps live in one form and stay mounted
// (only hidden), so going back never loses the photo or what you typed, and
// the submission is exactly the same as before: one server action that
// writes the AI captions and publishes the post together.
export function CreateForm({
  aiPhotosEnabled,
  dailyDrop,
  library,
  initialImageId,
  submissionId,
  dailyPrompt,
  surpriseHref,
  surprised,
}: {
  dailyPrompt: string;
  // Where "Surprise me" / "try another" goes (a random released library photo).
  surpriseHref: string;
  surprised: boolean;
  // One id per form, used as the new post's id, so submitting twice can't
  // create two posts.
  submissionId: string;
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

  const [step, setStep] = useState(0);
  const [browsing, setBrowsing] = useState(false);
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

  useEffect(() => {
    if (step === 2) contextInput.current?.focus();
  }, [step]);

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
    setSource("upload");
    setStep(1);
  }

  const chosenLibrary = libraryChoices.find((image) => image.id === libraryId) ?? null;
  const previewUrl = source === "upload" ? preview : source === "library" ? chosenLibrary?.url ?? null : null;
  const ready =
    source === "upload" ? Boolean(preview) : source === "library" ? Boolean(chosenLibrary) : imagePrompt.trim().length >= 3;

  const go = (to: number) => setStep(Math.max(0, Math.min(to, STEPS.length - 1)));

  return (
    <form action={formAction} className="mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col px-5 pb-10 pt-20 sm:px-8 sm:pt-24">
      <input type="hidden" name="source" value={source} />
      {source === "library" && libraryId && <input type="hidden" name="library_image" value={libraryId} />}
      <input type="hidden" name="vibe" value={vibe} />
      <input type="hidden" name="submission_id" value={submissionId} />

      {/* Progress + back */}
      <div className="flex h-10 items-center justify-between">
        {step > 0 && !pending ? (
          <button type="button" onClick={() => go(step - 1)} className="text-sm text-ink-3 transition hover:text-ink">
            ← back
          </button>
        ) : (
          <span />
        )}
        <ol aria-label={`Step ${step + 1} of ${STEPS.length}`} className="flex gap-1.5">
          {STEPS.map((name, i) => (
            <li
              key={name}
              className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? "w-6 bg-ink" : i < step ? "w-1.5 bg-ink" : "w-1.5 bg-ice"}`}
            />
          ))}
        </ol>
      </div>

      {/* 1. The moment */}
      <section hidden={step !== 0} className="screen-in flex flex-1 flex-col justify-center gap-8 py-8">
        <div className="flex flex-col items-center gap-3">
          <h1 className="word text-center text-6xl sm:text-8xl">
            <Ink text={surprised && source === "library" ? "Surprise." : "Show me the moment."} />
          </h1>
          <p className="rise text-sm text-ink-3 [animation-delay:400ms]">today&apos;s prompt · “{dailyPrompt}”</p>
        </div>

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
          className={`rise group relative mx-auto flex aspect-[4/3] w-full max-w-md cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-[32px] border-[1.5px] border-dashed text-center transition duration-300 [animation-delay:150ms] ${
            dragging ? "scale-[1.02] border-punch bg-white" : "border-ink/15 bg-white/60 hover:border-ink/40 hover:bg-white"
          } ${source === "upload" ? "" : "hidden"}`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your selected photo" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-2xl text-white transition duration-300 group-hover:scale-110">
                +
              </span>
              <span className="text-lg font-medium text-ink">Add a photo</span>
              <span className="text-sm text-ink-3">tap, or drop it here · up to 4MB</span>
            </>
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
          <p role="alert" className="text-center text-sm text-down-ink">
            {fileError}
          </p>
        )}

        {source === "library" && !browsing && chosenLibrary && (
          <figure className="rise mx-auto flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={chosenLibrary.url} alt={chosenLibrary.altText} className="max-h-[38svh] w-auto max-w-full rounded-[28px] object-contain shadow-[0_40px_80px_-40px_rgba(22,21,20,0.45)]" />
            <figcaption className="text-sm text-ink-3">
              {chosenLibrary.title}
              {chosenLibrary.id === dailyDrop?.id ? " · today's photo" : ""}
            </figcaption>
          </figure>
        )}

        {source === "library" && browsing && (
          <div role="radiogroup" aria-label="Library photo" className="rise mx-auto grid w-full max-w-lg grid-cols-3 gap-2 sm:grid-cols-4">
            {libraryChoices.map((image) => {
              const isDrop = image.id === dailyDrop?.id;
              return (
                <button
                  key={image.id}
                  type="button"
                  role="radio"
                  aria-checked={libraryId === image.id}
                  aria-label={`${image.title}${isDrop ? " (today's drop)" : ""}`}
                  onClick={() => {
                    setLibraryId(image.id);
                    setBrowsing(false);
                  }}
                  className={`relative aspect-square overflow-hidden rounded-[18px] transition ${
                    libraryId === image.id ? "ring-[3px] ring-ink ring-offset-2 ring-offset-background" : "opacity-80 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                  {isDrop && <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium">today</span>}
                </button>
              );
            })}
          </div>
        )}

        {source === "ai" && (
          <div className="rise mx-auto flex w-full max-w-md flex-col gap-2">
            <label htmlFor="image_prompt" className="text-sm text-ink-2">
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
                <button key={idea} type="button" onClick={() => setImagePrompt(idea)} className="chip bg-powder text-ink">
                  {idea}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          {ready && (
            <NextButton onClick={() => go(1)} />
          )}
          <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-ink-3">
            {source !== "upload" && (
              <button type="button" onClick={() => setSource("upload")} className="underline-offset-4 hover:text-ink hover:underline">
                upload my own
              </button>
            )}
            {dailyDrop && !(source === "library" && libraryId === dailyDrop.id && !browsing) && (
              <button
                type="button"
                onClick={() => {
                  setSource("library");
                  setLibraryId(dailyDrop.id);
                  setBrowsing(false);
                }}
                className="underline-offset-4 hover:text-ink hover:underline"
              >
                use today&apos;s photo
              </button>
            )}
            {libraryChoices.length > 0 && (
              <Link href={surpriseHref} className="underline-offset-4 hover:text-ink hover:underline">
                {surprised && source === "library" ? "try another" : "surprise me"}
              </Link>
            )}
            {libraryChoices.length > 1 && !(source === "library" && browsing) && (
              <button
                type="button"
                onClick={() => {
                  setSource("library");
                  setBrowsing(true);
                }}
                className="underline-offset-4 hover:text-ink hover:underline"
              >
                browse our photos
              </button>
            )}
            {source !== "ai" && aiPhotosEnabled && (
              <button type="button" onClick={() => setSource("ai")} className="underline-offset-4 hover:text-ink hover:underline">
                or describe one
              </button>
            )}
          </p>
        </div>
      </section>

      {/* 2. The vibe */}
      <section hidden={step !== 1} className="flex flex-1 flex-col justify-center gap-8 py-8">
        {step === 1 && <h2 className="word rise text-center text-6xl sm:text-8xl">What&apos;s the vibe?</h2>}
        <div role="radiogroup" aria-label="Caption style" className="mx-auto grid w-full max-w-xl gap-2.5">
          {(Object.keys(VIBES) as Vibe[]).map((key, i) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={vibe === key}
              onClick={() => {
                setVibe(key);
                go(2);
              }}
              className={`rise group flex items-center justify-between gap-4 rounded-[22px] px-6 py-5 text-left transition duration-300 ${
                vibe === key ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-line hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-26px_rgba(22,21,20,0.4)]"
              }`}
              style={{ animationDelay: `${80 + i * 60}ms` }}
            >
              <span>
                <span className="block text-xl font-medium tracking-tight">{VIBES[key].label}</span>
                <span className={`block text-sm ${vibe === key ? "text-white/60" : "text-ink-3"}`}>{VIBE_TAGLINES[key]}</span>
              </span>
              <span aria-hidden className="text-lg opacity-40 transition group-hover:translate-x-1 group-hover:opacity-100">
                →
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Context */}
      <section hidden={step !== 2} className="flex flex-1 flex-col justify-center gap-8 py-8">
        {step === 2 && <h2 className="word rise text-center text-6xl sm:text-8xl">Anything we should know?</h2>}
        <input
          id="context"
          name="context"
          aria-label="Context (optional)"
          ref={contextInput}
          defaultValue=""
          onChange={(e) => setContext(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              go(3);
            }
          }}
          maxLength={200}
          placeholder="2am in Butler, week 3 of the semester…"
          className="mx-auto w-full max-w-xl border-0 border-b-[1.5px] border-ink/15 bg-transparent px-1 py-3 text-center text-xl text-ink outline-none transition placeholder:text-ink-3/70 focus:border-ink sm:text-3xl"
        />
        <div className="flex flex-col items-center gap-3">
          <NextButton onClick={() => go(3)} label={context.trim() ? "Next" : "Skip"} />
          <p className="text-sm text-ink-3">Optional. The AI gets funnier with it.</p>
        </div>
      </section>

      {/* 4. The punchline */}
      <section hidden={step !== 3} className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
        {step === 3 && (
          <h2 className="word rise text-center text-6xl sm:text-8xl">
            {pending ? "Writing…" : "Ready for the punchline?"}
          </h2>
        )}
        {previewUrl && (
          <div className={`relative overflow-hidden rounded-[28px] ${pending ? "breathe" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="max-h-[30svh] w-auto max-w-full object-contain" />
            {pending && <span aria-hidden className="studio-scan absolute inset-x-0 h-24" />}
          </div>
        )}
        {!pending && (
          <p className="flex flex-wrap justify-center gap-2 text-sm">
            <button type="button" onClick={() => go(1)} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-line hover:ring-ink/30">
              {VIBES[vibe].label}
            </button>
            <button type="button" onClick={() => go(2)} className="max-w-[18rem] truncate rounded-full bg-white px-3 py-1.5 text-ink-2 ring-1 ring-line hover:ring-ink/30">
              {context.trim() ? `“${context.trim()}”` : "no context"}
            </button>
          </p>
        )}

        {pending ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 text-ink-2">
            <span className="dots text-ink">
              <i />
              <i />
              <i />
            </span>
            <span key={stage} className="rise text-base">
              {COOKING[stage]}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button
              type="submit"
              disabled={!ready}
              className="group inline-flex items-center gap-3 rounded-full bg-punch px-9 py-4 text-lg font-medium text-white shadow-[0_20px_40px_-20px_rgba(255,91,46,0.9)] transition hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40"
            >
              Generate &amp; post <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
            </button>
            <p className="max-w-xs text-center text-sm text-ink-3">
              The AI writes four captions and posts your meme in one go. Then classmates vote, blind.
            </p>
          </div>
        )}

        {state.error && (
          <p role="alert" className="max-w-md text-center text-sm text-down-ink">
            {state.error}
          </p>
        )}
      </section>
    </form>
  );
}

function NextButton({ onClick, label = "Next" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rise group inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-lg font-medium text-white transition hover:scale-[1.03] active:scale-[0.97]"
    >
      {label} <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
    </button>
  );
}
