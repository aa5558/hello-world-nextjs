"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { castVote } from "@/app/votes/actions";
import { Ink } from "@/app/components/ui";
import { Sparkles } from "@/app/components/Sparkles";
import { Tilt } from "@/app/components/Tilt";
import { play } from "@/lib/sound";
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
    play("vote");
    startTransition(async () => {
      const result = await castVote(id, 1);
      if ("error" in result) {
        setPicked(null);
        setError(result.error);
        return;
      }
      setReveal(result.reveal);
      play("reveal");
    });
  }

  const done = Boolean(picked && reveal && !pending);
  const lines = reveal?.authorType === "ai" ? AI_LINES : HUMAN_LINES;
  const line = lines[(picked ?? "a").charCodeAt(0) % lines.length];

  const billboard = (caption: Caption, i: number) => {
    const isPick = picked === caption.id;
    const faded = picked !== null && !isPick;
    const glow = i === 0 ? "glow-pink" : "glow-cyan";
    return (
      <Tilt key={caption.id} className="rounded-[28px]" max={12} lift={34} light={i === 0 ? "pink" : "cyan"}>
        <button
          type="button"
          onClick={() => choose(caption.id)}
          disabled={picked !== null}
          aria-pressed={isPick}
          data-caption-id={caption.id}
          className={`panel ${glow} relative flex min-h-36 w-full flex-col justify-between gap-4 rounded-[28px] p-6 text-left text-[19px] leading-snug text-white transition duration-500 sm:min-h-52 sm:text-[22px] ${
            isPick ? "lit chosen" : faded ? "scale-95 opacity-25 blur-[1px]" : "lit [--glow-strength:0.6] hover:brightness-125"
          } disabled:cursor-default`}
        >
          {isPick && done && <Sparkles />}
          <span className={`tube ${glow} text-[11px]`}>{i === 0 ? "caption A" : "caption B"}</span>
          <span>“{caption.text}”</span>
          <span className="min-h-5 text-sm">
            {isPick &&
              (done && reveal ? (
                <span className={`tube rise ${reveal.authorType === "ai" ? "glow-violet" : "glow-green"} text-[12px]`}>
                  {reveal.authorType === "ai" ? "Written by AI" : `Written by ${reveal.authorName ?? "a classmate"}`}
                </span>
              ) : (
                <span className="dots text-white" aria-label="Counting your vote">
                  <i />
                  <i />
                  <i />
                </span>
              ))}
          </span>
        </button>
      </Tilt>
    );
  };

  return (
    <div className="screen-in flex w-full flex-col items-center gap-6 sm:gap-8">
      <h1 className="word glow-cyan text-center text-5xl sm:text-7xl" aria-live="polite">
        {done ? <Ink key="line" text={line} /> : "Which one’s funnier?"}
      </h1>

      {/* The photo floats between the two billboards. */}
      <div className="grid w-full items-center gap-4 [perspective:1400px] lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
        <div className="relative mx-auto lg:col-start-2 lg:row-start-1">
          <span aria-hidden className="spotlight" />
          <div className="frame glow-violet">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={alt} className="max-h-[32svh] w-auto max-w-[78vw] rounded-[12px] object-contain lg:max-h-[46svh] lg:max-w-[340px]" />
          </div>
        </div>
        <div className="lg:col-start-1 lg:row-start-1 lg:[transform:rotateY(10deg)]">{billboard(captions[0], 0)}</div>
        {captions[1] && <div className="lg:col-start-3 lg:row-start-1 lg:[transform:rotateY(-10deg)]">{billboard(captions[1], 1)}</div>}
      </div>

      {error && (
        <p role="alert" className="text-sm text-down-ink">
          {error}
        </p>
      )}

      <div className="flex min-h-14 flex-col items-center gap-3">
        {done ? (
          <>
            <Link href={nextHref} className="btn-neon btn-big glow-green rise">
              Again? <span aria-hidden>→</span>
            </Link>
            <p className="rise flex gap-4 text-sm text-ink-3" style={{ animationDelay: "120ms" }}>
              <Link href={`/g/${generationId}`} className="underline-offset-4 hover:text-cyan hover:underline">
                every caption on this photo
              </Link>
              <Link href="/results" className="underline-offset-4 hover:text-cyan hover:underline">
                who&apos;s winning tonight
              </Link>
            </p>
          </>
        ) : (
          <p className="text-sm text-ink-3">
            {signedIn ? "Tap the one that made you laugh." : "Tap one to sign in and vote."}{" "}
            <Link href={nextHref} className="underline-offset-4 hover:text-cyan hover:underline">
              skip
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
