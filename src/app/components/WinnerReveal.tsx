"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "@/app/components/Sparkles";
import type { Champion } from "@/lib/champions";
import { prettyDay } from "@/lib/champions";
import { play } from "@/lib/sound";

type Phase = "dark" | "votes" | "winner-is" | "drumroll" | "champion";

// When each phase starts (ms). Short: the champion is on screen at ~3.9 s.
const AT: [Phase, number][] = [
  ["votes", 350],
  ["winner-is", 1700],
  ["drumroll", 3000],
  ["champion", 3900],
];

const CONFETTI = Array.from({ length: 44 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  color: ["#ff3cac", "#2de2ff", "#ffcf5a", "#a3ff47", "#ffffff", "#a46bff"][i % 6],
  delay: `${(i % 11) * 0.09}s`,
  dur: `${2.2 + (i % 5) * 0.35}s`,
  drift: `${((i % 7) - 3) * 9}vw`,
  spin: `${360 + (i % 4) * 220}deg`,
}));

// The awards ceremony for a finished round. Opened only by the person
// choosing to watch (from Results), never on top of creating or voting.
// Skip jumps straight to the champion; reduced motion starts there.
export function WinnerReveal({ champion, onClose }: { champion: Champion; onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("dark");
  const closeRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("champion");
      return;
    }
    timers.current = AT.map(([p, t]) => setTimeout(() => setPhase(p), t));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase !== "champion") return;
    play("reveal");
    closeRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function skip() {
    timers.current.forEach(clearTimeout);
    setPhase("champion");
  }

  const who = champion.authorType === "ai" ? "The AI (Gemini)" : champion.authorName ?? "A classmate";
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Winner reveal" className="reveal-stage">
      <span aria-hidden className="reveal-beam" />

      {phase !== "champion" ? (
        <div className="relative flex min-h-[50vh] flex-col items-center justify-center gap-6 text-center" aria-live="polite">
          {phase === "votes" && <p className="tube glow-cyan reveal-line text-2xl sm:text-4xl">The votes are in…</p>}
          {phase === "winner-is" && <p className="tube glow-pink reveal-line text-2xl sm:text-4xl">And the winner is…</p>}
          {phase === "drumroll" && (
            <span className="dots text-gold" aria-label="Drumroll">
              <i />
              <i />
              <i />
            </span>
          )}
          <button type="button" onClick={skip} className="chip-neon glow-violet fixed bottom-6 right-6">
            Skip
          </button>
        </div>
      ) : (
        <>
          {!reduced && (
            <div aria-hidden className="confetti">
              {CONFETTI.map((c, i) => (
                <i
                  key={i}
                  style={{
                    left: c.left,
                    background: c.color,
                    boxShadow: `0 0 8px ${c.color}`,
                    ["--delay" as string]: c.delay,
                    ["--dur" as string]: c.dur,
                    ["--drift" as string]: c.drift,
                    ["--spin" as string]: c.spin,
                  }}
                />
              ))}
            </div>
          )}
          <div className="champion-in relative flex w-full max-w-xl flex-col items-center gap-5 text-center">
            <p className="tube glow-gold text-[11px]">
              {prettyDay(champion.day)} round{champion.prompt ? ` · “${champion.prompt}”` : ""}
            </p>
            <div className="neon-ring ring-gold relative rounded-[30px]">
              <Sparkles />
              <div className="frame glow-gold relative flex flex-col items-center gap-4 rounded-[28px] px-5 pb-6 pt-8 sm:px-8">
                <span className="fight glow-gold absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-background px-5 py-1.5 text-sm sm:text-base">
                  Champion
                </span>
                <Trophy />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={champion.imageUrl} alt="The winning meme's photo" className="max-h-[30svh] w-auto max-w-full rounded-[14px] object-contain" />
                <h2 className="word glow-gold text-3xl leading-tight sm:text-5xl">“{champion.text}”</h2>
                <p className="text-lg text-white">{who}</p>
                <p className="tube glow-cyan text-sm tabular-nums">
                  +{champion.score} net · {champion.upvotes} {champion.upvotes === 1 ? "upvote" : "upvotes"}
                  {champion.downvotes > 0 ? ` · ${champion.downvotes} down` : ""}
                </p>
                {champion.wonOnTiebreak && (
                  <p className="text-xs text-ink-3">Tied on votes; won the tiebreak by posting first.</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button ref={closeRef} type="button" onClick={onClose} className="btn-neon glow-gold">
                Back to the results
              </button>
              <Link href={`/g/${champion.generationId}`} className="chip-neon glow-violet">
                see the meme
              </Link>
            </div>
          </div>
        </>
      )}
    </div>,
    document.body
  );
}

function Trophy() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="h-12 w-12" style={{ filter: "drop-shadow(0 0 10px rgba(255,207,90,0.9))" }} fill="none" stroke="#ffcf5a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 8h18v9a9 9 0 01-18 0V8z" fill="rgba(255,207,90,0.25)" />
      <path d="M15 12H9a6 6 0 006 7M33 12h6a6 6 0 01-6 7M24 26v8M17 40h14M19 34h10v6H19z" />
    </svg>
  );
}
