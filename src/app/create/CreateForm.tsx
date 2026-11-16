"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { IMAGE_PROMPT_IDEAS, IMAGE_PROMPT_MAX, VIBES, type Vibe } from "@/lib/captions";
import type { LibraryImage } from "@/lib/library";
import { Ink } from "@/app/components/ui";
import { LIGHT, setRoomLight, Tilt } from "@/app/components/Tilt";
import { play } from "@/lib/sound";
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


const VIBE_GLOW: Record<Vibe, string> = {
  midwest: "glow-gold",
  online: "glow-green",
  columbia: "glow-cyan",
  newyorker: "glow-pink",
};

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
  const [settling, setSettling] = useState(false);
  const [picking, setPicking] = useState<Vibe | null>(null);
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
    setSettling(true);
    play("select");
  }

  // After a photo lands, let it settle into the frame under the spotlight
  // for a moment, then move on by itself.
  useEffect(() => {
    if (!settling) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => {
      setSettling(false);
      setStep((s) => (s === 0 ? 1 : s));
    }, reduced ? 0 : 1100);
    return () => clearTimeout(t);
  }, [settling]);

  // The room takes on each step's colour; it darkens while the AI works.
  useEffect(() => {
    const colours = [LIGHT.pink, LIGHT.violet, LIGHT.cyan, LIGHT.pink];
    setRoomLight(pending ? "40, 20, 60" : colours[step]);
  }, [step, pending]);
  useEffect(() => () => setRoomLight(null), []);

  const chosenLibrary = libraryChoices.find((image) => image.id === libraryId) ?? null;
  const previewUrl = source === "upload" ? preview : source === "library" ? chosenLibrary?.url ?? null : null;
  const ready =
    source === "upload" ? Boolean(preview) : source === "library" ? Boolean(chosenLibrary) : imagePrompt.trim().length >= 3;

  const go = (to: number) => setStep(Math.max(0, Math.min(to, STEPS.length - 1)));

  return (
    <form action={formAction} className="relative mx-auto flex min-h-[100svh] w-full max-w-4xl flex-col px-5 pb-10 pt-20 sm:px-8 sm:pt-24">
      <input type="hidden" name="source" value={source} />
      {source === "library" && libraryId && <input type="hidden" name="library_image" value={libraryId} />}
      <input type="hidden" name="vibe" value={vibe} />
      <input type="hidden" name="submission_id" value={submissionId} />

      {/* While the AI works, the room goes dark around the photo. */}
      {pending && <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-black/55 transition-opacity duration-700" />}

      {/* Progress + back */}
      <div className="relative z-10 flex h-10 items-center justify-between">
        {step > 0 && !pending ? (
          <button type="button" onClick={() => go(step - 1)} className="tube glow-violet text-[11px] text-ink-2 transition hover:text-white">
            ← back
          </button>
        ) : (
          <span />
        )}
        <ol aria-label={`Step ${step + 1} of ${STEPS.length}`} className="flex gap-1.5">
          {STEPS.map((name, i) => (
            <li
              key={name}
              className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? "w-6 bg-pink shadow-[0_0_10px_#ff3cac]" : i < step ? "w-1.5 bg-pink/70" : "w-1.5 bg-ice"}`}
            />
          ))}
        </ol>
      </div>

      {/* 1. The moment */}
      <section hidden={step !== 0} className="screen-in relative z-10 flex flex-1 flex-col items-center justify-center gap-8 py-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="word glow-pink text-6xl sm:text-8xl">
            <Ink text={surprised && source === "library" ? "Surprise." : "Show me the moment."} />
          </h1>
          <p className="rise text-sm text-ink-3 [animation-delay:500ms]">tonight&apos;s prompt · “{dailyPrompt}”</p>
        </div>

        {/* The floating picture frame. Click it, or drop a photo on it. */}
        <div className={`relative ${source === "upload" ? "" : "hidden"}`}>
          {preview && <span aria-hidden className="spotlight" />}
          <Tilt className="rounded-[22px]" max={8} lift={20} light="pink">
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
              className={`frame glow-pink group flex aspect-[4/3] w-[min(82vw,420px)] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden text-center transition duration-500 ${
                dragging ? "scale-[1.04] [--glow:45,226,255]" : ""
              } ${preview ? "[transform:rotateY(-4deg)_rotateX(2deg)]" : ""}`}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Your selected photo" className="rise h-full w-full rounded-[12px] object-cover" />
              ) : (
                <>
                  <span aria-hidden className={`tube glow-pink text-5xl transition duration-300 group-hover:scale-110 ${dragging ? "glow-cyan" : ""}`}>
                    +
                  </span>
                  <span className="tube glow-pink text-sm">{dragging ? "drop it" : "add a photo"}</span>
                  <span className="text-xs text-ink-3">tap the frame, or drop a photo on it · up to 4MB</span>
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
          </Tilt>
        </div>
        {fileError && source === "upload" && (
          <p role="alert" className="text-center text-sm text-down-ink">
            {fileError}
          </p>
        )}

        {source === "library" && !browsing && chosenLibrary && (
          <figure className="relative flex flex-col items-center gap-3">
            <span aria-hidden className="spotlight" />
            <Tilt className="rounded-[22px]" max={8} light="gold">
              <div className="frame glow-gold [transform:rotateY(-4deg)_rotateX(2deg)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={chosenLibrary.url} alt={chosenLibrary.altText} className="rise max-h-[36svh] w-auto max-w-[78vw] rounded-[12px] object-contain" />
              </div>
            </Tilt>
            <figcaption className="tube glow-gold text-[11px]">
              {chosenLibrary.title}
              {chosenLibrary.id === dailyDrop?.id ? " · today's photo" : ""}
            </figcaption>
          </figure>
        )}

        {source === "library" && browsing && (
          <div role="radiogroup" aria-label="Library photo" className="rise grid w-full max-w-lg grid-cols-3 gap-3 sm:grid-cols-4">
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
                    play("select");
                  }}
                  className={`frame relative aspect-square overflow-hidden !p-1.5 transition hover:scale-105 ${libraryId === image.id ? "glow-cyan" : "glow-violet opacity-80 hover:opacity-100"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="h-full w-full rounded-[10px] object-cover" />
                  {isDrop && <span className="tube glow-gold absolute left-2 top-2 text-[9px]">today</span>}
                </button>
              );
            })}
          </div>
        )}

        {source === "ai" && (
          <div className="rise flex w-full max-w-md flex-col gap-2">
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
                <button key={idea} type="button" onClick={() => setImagePrompt(idea)} className="chip-neon glow-violet text-xs">
                  {idea}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          {ready && !settling && (
            <button type="button" onClick={() => go(1)} className="btn-neon glow-pink rise">
              Next <span aria-hidden>→</span>
            </button>
          )}
          {/* Small lit objects for the other ways to get a photo. */}
          <div className="flex flex-wrap justify-center gap-2">
            {source !== "upload" && (
              <button type="button" onClick={() => setSource("upload")} className="chip-neon glow-pink">
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
                  play("select");
                }}
                className="chip-neon glow-gold"
              >
                use today&apos;s photo
              </button>
            )}
            {libraryChoices.length > 0 && (
              <Link href={surpriseHref} className="chip-neon glow-green">
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
                className="chip-neon glow-violet"
              >
                browse our photos
              </button>
            )}
            {source !== "ai" && aiPhotosEnabled && (
              <button type="button" onClick={() => setSource("ai")} className="chip-neon glow-cyan">
                or describe one
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. The vibe: floating neon signs. The chosen one comes forward. */}
      <section hidden={step !== 1} className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 py-6">
        {step === 1 && (
          <h2 className="word glow-violet text-center text-6xl sm:text-8xl">
            <Ink text="What's the vibe?" />
          </h2>
        )}
        <div role="radiogroup" aria-label="Caption style" className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
          {(Object.keys(VIBES) as Vibe[]).map((key, i) => {
            const isPick = picking === key;
            const faded = picking !== null && !isPick;
            return (
              <Tilt key={key} className="rise rounded-[24px]" max={10} style={{ animationDelay: `${120 + i * 80}ms` }}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={vibe === key}
                  onClick={() => {
                    if (picking) return;
                    setVibe(key);
                    setPicking(key);
                    play("select");
                    setTimeout(() => {
                      setPicking(null);
                      go(2);
                    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420);
                  }}
                  className={`panel ${VIBE_GLOW[key]} flex w-full flex-col items-start gap-1 rounded-[24px] px-6 py-5 text-left transition duration-300 ${
                    isPick ? "lit chosen" : vibe === key && !picking ? "lit" : ""
                  } ${faded ? "scale-95 opacity-30" : ""}`}
                >
                  <span className={`tube ${VIBE_GLOW[key]} text-lg sm:text-xl`}>{VIBES[key].label}</span>
                  <span className="text-sm text-ink-3">{VIBE_TAGLINES[key]}</span>
                </button>
              </Tilt>
            );
          })}
        </div>
      </section>

      {/* 3. Context: one floating field that lights up when focused. */}
      <section hidden={step !== 2} className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10 py-6">
        {step === 2 && (
          <h2 className="word glow-cyan text-center text-6xl sm:text-8xl">
            <Ink text="Anything we should know?" />
          </h2>
        )}
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
          className="neon-input max-w-xl text-xl sm:text-3xl"
        />
        <div className="flex flex-col items-center gap-3">
          <button type="button" onClick={() => go(3)} className="btn-neon glow-cyan">
            {context.trim() ? "Next" : "Skip"} <span aria-hidden>→</span>
          </button>
          <p className="text-sm text-ink-3">Optional. The AI gets funnier with it.</p>
        </div>
      </section>

      {/* 4. The punchline */}
      <section hidden={step !== 3} className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 py-6">
        {step === 3 && (
          <h2 className="word glow-pink text-center text-6xl sm:text-8xl">{pending ? <Ink key="w" text="Writing…" /> : <Ink text="Ready for the punchline?" />}</h2>
        )}
        {previewUrl && (
          <div className="relative">
            <span aria-hidden className="spotlight" />
            <div className={`frame glow-pink ${pending ? "breathe [--glow:45,226,255]" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="" className="max-h-[30svh] w-auto max-w-[78vw] rounded-[12px] object-contain" />
              {pending && <span aria-hidden className="light-wave" />}
            </div>
          </div>
        )}
        {!pending && (
          <p className="flex flex-wrap justify-center gap-2 text-sm">
            <button type="button" onClick={() => go(1)} className="chip-neon glow-violet">
              {VIBES[vibe].label}
            </button>
            <button type="button" onClick={() => go(2)} className="chip-neon glow-cyan max-w-[18rem] truncate">
              {context.trim() ? `“${context.trim()}”` : "no context"}
            </button>
          </p>
        )}

        {pending ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 text-ink-2">
            <span className="dots text-cyan">
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
            <button type="submit" disabled={!ready} onClick={() => play("select")} className="btn-neon btn-big glow-pink">
              Make it funny <span aria-hidden>→</span>
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
