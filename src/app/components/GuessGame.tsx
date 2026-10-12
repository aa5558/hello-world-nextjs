"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { checkGuess, nextGuessRound } from "@/app/play/actions";
import type { GuessResult, GuessRound } from "@/lib/guess";
import { RevealBadge } from "./RevealBadge";

// "Human or AI?": guess who wrote a caption from a past challenge. Playable
// without an account, so first-time visitors can try the core idea before
// signing in.
export function GuessGame({
  initialRound,
  signedIn,
}: {
  initialRound: GuessRound | null;
  signedIn: boolean;
}) {
  const [round, setRound] = useState(initialRound);
  const [seen, setSeen] = useState<string[]>(
    initialRound ? [initialRound.captionId] : []
  );
  const [result, setResult] = useState<GuessResult | null>(null);
  const [tally, setTally] = useState({ correct: 0, played: 0 });
  const [streak, setStreak] = useState(0);
  const [pending, startTransition] = useTransition();

  if (!round) return null;

  function guess(choice: "ai" | "human") {
    if (!round) return;
    startTransition(async () => {
      const outcome = await checkGuess(round.captionId, choice);
      if (!outcome) return;
      setResult(outcome);
      setTally((t) => ({
        correct: t.correct + (outcome.correct ? 1 : 0),
        played: t.played + 1,
      }));
      setStreak((s) => (outcome.correct ? s + 1 : 0));
    });
  }

  function next() {
    startTransition(async () => {
      // Start over once every past caption has been shown.
      let upcoming = await nextGuessRound(seen);
      let nextSeen = seen;
      if (!upcoming) {
        nextSeen = [];
        upcoming = await nextGuessRound(round ? [round.captionId] : []);
      }
      if (upcoming) {
        setRound(upcoming);
        setSeen([...nextSeen, upcoming.captionId]);
        setResult(null);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold">🎯 Human or AI?</h2>
        {tally.played > 0 && (
          <span className="text-xs font-semibold tabular-nums text-black/55 dark:text-white/55">
            {tally.correct}/{tally.played} right
            {streak >= 2 && ` · 🔥 ${streak} streak`}
          </span>
        )}
      </div>
      <p className="-mt-2 text-sm text-black/60 dark:text-white/60">
        A caption from a past battle. Did a classmate write it, or Gemini?
      </p>

      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={round.imageUrl}
          alt="Photo for this caption"
          className="h-24 w-24 shrink-0 rounded-xl object-cover"
        />
        <p className="self-center text-[15px] font-medium leading-snug">
          “{round.text}”
        </p>
      </div>

      {result ? (
        <div className="flex flex-col gap-3">
          <div
            className={`animate-reveal flex flex-wrap items-center gap-2 rounded-xl p-3 text-sm font-semibold ${
              result.correct
                ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-200"
            }`}
          >
            <span>{result.correct ? "✅ Correct!" : "❌ Nope."}</span>
            <span className="font-normal">Written by</span>
            <RevealBadge
              reveal={{
                authorType: result.authorType,
                authorName: result.authorName,
                isMine: false,
              }}
            />
            <span className="font-normal text-black/50 dark:text-white/50">
              · {result.score > 0 ? `+${result.score}` : result.score} votes
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={next}
              disabled={pending}
              className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-columbia dark:text-navy"
            >
              {pending ? "Loading…" : "Next caption →"}
            </button>
            <Link
              href={`/g/${round.generationId}`}
              className="text-sm font-medium text-navy hover:underline dark:text-columbia"
            >
              See the full battle
            </Link>
          </div>
          {!signedIn && tally.played >= 2 && (
            <p className="rounded-xl bg-columbia/40 p-3 text-sm text-navy dark:bg-columbia/15 dark:text-columbia">
              Think you could write a better one?{" "}
              <Link href="/login" className="font-semibold underline">
                Sign in with Google
              </Link>{" "}
              to vote on today&apos;s battles and enter your own captions.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => guess("human")}
            disabled={pending}
            className="rounded-xl bg-emerald-600 px-3 py-3 font-semibold text-white transition active:scale-95 disabled:opacity-50"
          >
            🧑‍🎓 Human
          </button>
          <button
            type="button"
            onClick={() => guess("ai")}
            disabled={pending}
            className="rounded-xl bg-violet-600 px-3 py-3 font-semibold text-white transition active:scale-95 disabled:opacity-50"
          >
            🤖 AI
          </button>
        </div>
      )}
    </section>
  );
}
