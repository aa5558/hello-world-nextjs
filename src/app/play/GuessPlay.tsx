"use client";

import { useState, useTransition } from "react";
import { checkGuess, nextGuessRound } from "@/app/play/actions";
import { Sparkles } from "@/app/components/Sparkles";
import { Action, Ink, Quiet } from "@/app/components/ui";
import { Tilt } from "@/app/components/Tilt";
import { play } from "@/lib/sound";
import type { GuessResult, GuessRound } from "@/lib/guess";

// Human or AI? One caption from a finished battle. Two answers. The truth.
// Works without an account (the database only uses finished days).
export function GuessPlay({ initialRound }: { initialRound: GuessRound | null }) {
  const [round, setRound] = useState(initialRound);
  const [result, setResult] = useState<GuessResult | null>(null);
  const [guessed, setGuessed] = useState<"human" | "ai" | null>(null);
  const [seen, setSeen] = useState<string[]>(initialRound ? [initialRound.captionId] : []);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [pending, startTransition] = useTransition();

  if (!round) {
    return (
      <div className="flex flex-col items-center gap-6">
        <h1 className="word text-5xl sm:text-7xl">No rounds yet.</h1>
        <p className="max-w-sm text-lg text-ink-2">
          Human or AI? uses captions from finished days. Come back tomorrow, or play the other modes.
        </p>
        <Action href="/play">Which one&apos;s funnier?</Action>
      </div>
    );
  }

  function guess(answer: "human" | "ai") {
    if (!round || guessed) return;
    setGuessed(answer);
    play("vote");
    startTransition(async () => {
      const res = await checkGuess(round.captionId, answer);
      if (!res) {
        setGuessed(null);
        return;
      }
      setResult(res);
      play("reveal");
      setScore((s) => ({ right: s.right + (res.correct ? 1 : 0), total: s.total + 1 }));
    });
  }

  function again() {
    startTransition(async () => {
      const next = await nextGuessRound(seen);
      setResult(null);
      setGuessed(null);
      if (next) {
        setSeen((s) => [...s, next.captionId].slice(-50));
        setRound(next);
      } else {
        setRound(null);
      }
    });
  }

  return (
    <div key={round.captionId} className="screen-in flex w-full flex-col items-center gap-6 sm:gap-8">
      {/* The caption hangs on a floating sign; the photo glows behind it. */}
      <div className="relative flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={round.imageUrl}
          alt="The photo this caption was written for"
          className="frame glow-violet max-h-[24svh] w-auto max-w-[70vw] rounded-[18px] object-contain opacity-80"
        />
        <Tilt className="-mt-8 rounded-[24px]" max={8}>
          <p className="panel lit glow-violet max-w-2xl rounded-[24px] px-6 py-5 text-xl leading-snug text-white sm:text-2xl">“{round.text}”</p>
        </Tilt>
      </div>

      {result ? (
        <div className="flex flex-col items-center gap-5" aria-live="polite">
          <h1 className={`word ${result.correct ? "glow-green" : "glow-pink"} relative text-6xl sm:text-8xl`}>
            {result.correct && <Sparkles />}
            <Ink text={result.correct ? "Called it." : "Fooled you."} />
          </h1>
          <p className="text-lg text-ink-2">
            {result.authorType === "ai" ? "The AI wrote that." : `${result.authorName ?? "A classmate"} wrote that.`}
          </p>
          <p key={score.total} className="tube glow-gold animate-pop text-sm tabular-nums">
            {score.right}/{score.total} right
          </p>
          <Action onClick={again} disabled={pending} tone="green">
            Again?
          </Action>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center gap-5">
          <h1 className="word glow-violet text-6xl sm:text-8xl">Human or AI?</h1>
          <div className="grid w-full max-w-lg grid-cols-2 gap-4">
            {(
              [
                ["human", "Human", "glow-green", "green"],
                ["ai", "AI", "glow-violet", "violet"],
              ] as const
            ).map(([value, label, glow, light]) => (
              <Tilt key={value} className="rounded-[26px]" max={14} lift={30} light={light}>
                <button
                  type="button"
                  onClick={() => guess(value)}
                  disabled={guessed !== null}
                  aria-pressed={guessed === value}
                  className={`panel ${glow} tube w-full rounded-[26px] px-6 py-8 text-2xl transition duration-300 sm:text-3xl ${
                    guessed === value ? "lit chosen" : guessed ? "scale-95 opacity-25" : "lit hover:brightness-125 active:translate-y-1"
                  }`}
                >
                  {label}
                </button>
              </Tilt>
            ))}
          </div>
          {score.total > 0 && (
            <p className="tube glow-gold text-sm tabular-nums">
              {score.right}/{score.total} right
            </p>
          )}
          <Quiet onClick={again}>skip</Quiet>
        </div>
      )}
    </div>
  );
}
