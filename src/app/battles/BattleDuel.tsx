"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/app/components/Icon";
import { Sparkles } from "@/app/components/Sparkles";
import { castVote } from "@/app/votes/actions";
import type { Reveal } from "@/lib/feed";

type DuelCaption = { id: string; text: string };

const HUMAN_LINES = ["A classmate wrote that. Humans 1, robots 0.", "That was a real person. Comedy lives.", "Human-made. The AI is taking notes."];
const AI_LINES = ["That was the AI. It got you this time.", "Gemini wrote that one. Don't tell anyone.", "Machine-made. Respect the algorithm, I guess."];

function line(lines: string[], seed: string) {
  return lines[seed.charCodeAt(0) % lines.length];
}

export function BattleDuel({
  signedIn,
  generationId,
  imageUrl,
  title,
  captions,
  nextHref,
}: {
  signedIn: boolean;
  generationId: string;
  imageUrl: string;
  title: string | null;
  captions: DuelCaption[];
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
      router.push("/login?next=/battles");
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

  return (
    <section className="card overflow-hidden" aria-live="polite">
      <div className="relative bg-powder">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title ?? "A campus photo"} className="max-h-[34vh] w-full object-cover sm:max-h-[42vh]" />
        {title && (
          <p className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1 text-xs font-medium text-ink-2 backdrop-blur">
            {title}
          </p>
        )}
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        {captions.map((caption, i) => {
          const isPick = picked === caption.id;
          const dimmed = picked !== null && !isPick;
          return (
            <button
              key={caption.id}
              type="button"
              onClick={() => choose(caption.id)}
              disabled={picked !== null}
              aria-pressed={isPick}
              data-caption-id={caption.id}
              className={`group relative flex min-h-36 flex-col justify-between gap-4 rounded-[20px] border p-5 text-left transition duration-300 ${
                isPick
                  ? "glow-pick border-transparent bg-white"
                  : dimmed
                    ? "border-line bg-white/60 opacity-55"
                    : "border-line bg-white hover:-translate-y-0.5 hover:border-lavender hover:shadow-[0_18px_40px_-24px_rgba(74,35,102,0.45)] active:scale-[0.98]"
              } disabled:cursor-default`}
            >
              {isPick && done && <Sparkles />}
              <span className="text-[17px] font-medium leading-snug text-ink">“{caption.text}”</span>
              <span className="flex items-center justify-between text-xs font-semibold">
                <span className="text-ink-3">{i === 0 ? "Caption A" : "Caption B"}</span>
                {isPick ? (
                  done && reveal ? (
                    <span className={`chip animate-pop ${reveal.authorType === "ai" ? "bg-ai-soft text-ai-ink" : "bg-human-soft text-human-ink"}`}>
                      {reveal.authorType === "ai" ? "Written by AI" : `Written by ${reveal.authorName ?? "a classmate"}`}
                    </span>
                  ) : (
                    <span className="chip bg-lavender text-plum">Counting…</span>
                  )
                ) : (
                  !picked && (
                    <span className="chip bg-powder text-plum opacity-0 transition group-hover:opacity-100">
                      Pick this one
                    </span>
                  )
                )}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mx-5 mb-4 rounded-2xl bg-down-soft p-3 text-sm text-down-ink">
          {error}
        </p>
      )}

      <div className="flex flex-col items-center gap-3 border-t border-line px-5 py-4 sm:flex-row sm:justify-between">
        <p className="text-sm text-ink-2">
          {done && reveal
            ? line(reveal.authorType === "ai" ? AI_LINES : HUMAN_LINES, picked ?? "a")
            : signedIn
              ? "Authors stay hidden until you vote."
              : "Sign in with Google to vote. Authors stay hidden until you do."}
        </p>
        <div className="flex gap-2">
          {done && (
            <Link href={`/g/${generationId}`} className="btn btn-ghost btn-sm">
              See all captions
            </Link>
          )}
          <Link href={nextHref} className={`btn btn-sm ${done ? "btn-primary animate-pop" : "btn-ghost"}`}>
            {done ? "Next battle" : "Skip"} <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
