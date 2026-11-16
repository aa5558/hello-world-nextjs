"use client";

import { useState, useTransition } from "react";
import { checkGuess, nextGuessRound } from "@/app/play/actions";
import { Sparkles } from "@/app/components/Sparkles";
import { Action, Ink, Quiet } from "@/app/components/ui";
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
    startTransition(async () => {
      const res = await checkGuess(round.captionId, answer);
      if (!res) {
        setGuessed(null);
        return;
      }
      setResult(res);
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={round.imageUrl}
        alt="The photo this caption was written for"
        className="max-h-[30svh] w-auto max-w-full rounded-[28px] object-contain shadow-[0_40px_80px_-40px_rgba(22,21,20,0.45)]"
      />
      <p className="max-w-2xl text-2xl leading-snug text-ink sm:text-3xl">“{round.text}”</p>

      {result ? (
        <div className="flex flex-col items-center gap-5" aria-live="polite">
          <h1 className="word relative text-5xl sm:text-7xl">
            {result.correct && <Sparkles />}
            <Ink text={result.correct ? "Called it." : "Fooled you."} />
          </h1>
          <p className="text-lg text-ink-2">
            {result.authorType === "ai" ? "The AI wrote that." : `${result.authorName ?? "A classmate"} wrote that.`}
          </p>
          <p className="text-sm tabular-nums text-ink-3">
            {score.right}/{score.total} right
          </p>
          <Action onClick={again} disabled={pending}>
            Again?
          </Action>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <h1 className="word text-5xl sm:text-7xl">Human or AI?</h1>
          <div className="grid w-full max-w-md grid-cols-2 gap-3">
            {(
              [
                ["human", "Human"],
                ["ai", "AI"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => guess(value)}
                disabled={guessed !== null}
                aria-pressed={guessed === value}
                className={`rounded-[24px] px-6 py-6 text-2xl font-medium transition duration-300 active:scale-[0.97] ${
                  guessed === value
                    ? "chosen bg-ink text-white"
                    : guessed
                      ? "bg-white/50 text-ink-3 opacity-40 ring-1 ring-line"
                      : "bg-white text-ink ring-1 ring-line hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(22,21,20,0.35)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {score.total > 0 && (
            <p className="text-sm tabular-nums text-ink-3">
              {score.right}/{score.total} right
            </p>
          )}
          <Quiet onClick={again}>skip</Quiet>
        </div>
      )}
    </div>
  );
}
