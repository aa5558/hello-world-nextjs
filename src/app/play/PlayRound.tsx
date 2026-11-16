"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { castVote } from "@/app/votes/actions";
import type { Reveal } from "@/lib/feed";

type Caption = { id: string; text: string };

const HUMAN_LINES = ["A classmate wrote that.", "That one's human.", "Human-made. Comedy lives."];
const AI_LINES = ["That was the AI.", "Gemini wrote that one.", "Machine-made. It got you."];

export function PlayRound({
  signedIn,
  generationId,
  imageUrl,
  alt,
  captions,
  nextHref,
}: {
  signedIn: boolean;
  generationId: string;
  imageUrl: string;
  alt: string;
  captions: Caption[];
  nextHref: string;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(id: string) {
    if (picked) return;
    if (!signedIn) {
      router.push("/login?next=/play");
      return;
    }
    setPicked(id);
    setError(null);
    startTransition(async () => {
      const result = await castVote(id, 1);
      if ("error" in result) {
        setPicked(null);
        setError(result.error);
        return;
      }
      setReveal(result.reveal);
    });
  }

  const done = Boolean(picked && reveal && !pending);
  const lines = reveal?.authorType === "ai" ? AI_LINES : HUMAN_LINES;
  const line = lines[(picked ?? "a").charCodeAt(0) % lines.length];

  return (
    <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col items-center justify-center gap-6 px-5 pb-10 pt-20 sm:gap-8 sm:px-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        className="max-h-[38svh] w-auto max-w-full rounded-[28px] object-contain shadow-[0_40px_80px_-40px_rgba(22,21,20,0.45)] sm:max-h-[44svh]"
      />

      <h1 className="word text-center text-5xl sm:text-6xl" aria-live="polite">
        {done ? line : "Which one’s funnier?"}
      </h1>

      <div className="grid w-full gap-3 sm:grid-cols-2 sm:gap-4">
        {captions.map((caption) => {
          const isPick = picked === caption.id;
          const faded = picked !== null && !isPick;
          return (
            <button
              key={caption.id}
              type="button"
              onClick={() => choose(caption.id)}
              disabled={picked !== null}
              aria-pressed={isPick}
              data-caption-id={caption.id}
              className={`relative flex min-h-28 flex-col items-start justify-between gap-4 rounded-[24px] p-5 text-left text-[18px] leading-snug transition duration-500 sm:min-h-36 sm:p-6 sm:text-xl ${
                isPick
                  ? "chosen bg-ink text-white shadow-[0_30px_60px_-30px_rgba(22,21,20,0.6)]"
                  : faded
                    ? "bg-white/40 text-ink-3 opacity-40 ring-1 ring-line"
                    : "bg-white text-ink ring-1 ring-line hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(22,21,20,0.35)] active:scale-[0.98]"
              } disabled:cursor-default`}
            >
              <span>“{caption.text}”</span>
              {isPick && (
                <span className="text-sm font-medium">
                  {done && reveal ? (
                    <span className={`rise inline-flex items-center gap-2 ${reveal.authorType === "ai" ? "text-[#a9b8ff]" : "text-[#ffb59e]"}`}>
                      <span aria-hidden className={`h-2 w-2 rounded-full ${reveal.authorType === "ai" ? "bg-ai" : "bg-human"}`} />
                      {reveal.authorType === "ai" ? "Written by AI" : `Written by ${reveal.authorName ?? "a classmate"}`}
                    </span>
                  ) : (
                    <span className="dots text-white/70" aria-label="Counting your vote">
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm text-down-ink">
          {error}
        </p>
      )}

      <div className="flex min-h-14 flex-col items-center gap-3">
        {done ? (
          <>
            <Link
              href={nextHref}
              className="rise inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-lg font-medium text-white transition hover:scale-[1.03] active:scale-[0.97]"
            >
              Again? <span aria-hidden>→</span>
            </Link>
            <Link href={`/g/${generationId}`} className="rise text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline" style={{ animationDelay: "120ms" }}>
              see every caption on this photo
            </Link>
          </>
        ) : (
          <p className="text-sm text-ink-3">
            {signedIn ? "Tap the one that made you laugh." : "Tap one to sign in and vote."}{" "}
            <Link href={nextHref} className="underline-offset-4 hover:text-ink hover:underline">
              skip
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
