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
    <section id="guess" className="card flex scroll-mt-24 flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">mini game · no account needed</p>
          <h2 className="display mt-1 text-3xl">
            Human or <span className="serif text-4xl">AI?</span>
          </h2>
        </div>
        {tally.played > 0 && (
          <span className="chip shrink-0 bg-powder tabular-nums text-ink">
            {tally.correct}/{tally.played} right
            {streak >= 2 && ` · 🔥 ${streak}`}
          </span>
        )}
      </div>
      <p className="-mt-2 text-sm text-ink-2">
        A caption from a past battle. Did a classmate write it, or Gemini?
      </p>

      <div className="flex items-center gap-4 rounded-[22px] bg-background p-3 ring-1 ring-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={round.captionId}
          src={round.imageUrl}
          alt="Photo for this caption"
          className="animate-pop h-24 w-24 shrink-0 rounded-2xl object-cover sm:h-28 sm:w-28"
        />
        <p key={`t-${round.captionId}`} className="animate-fade-up text-[17px] font-medium leading-snug text-ink">
          “{round.text}”
        </p>
      </div>

      {result ? (
        <div className="flex flex-col gap-3">
          <div
            className={`animate-reveal flex flex-wrap items-center gap-2 rounded-[22px] p-4 text-sm font-semibold ${
              result.correct ? "bg-human-soft text-ink" : "bg-down-soft text-ink"
            }`}
          >
            <span className="display text-lg">{result.correct ? "called it ✅" : "nope, fooled you ❌"}</span>
            <span className="font-normal text-ink-2">written by</span>
            <RevealBadge
              reveal={{
                authorType: result.authorType,
                authorName: result.authorName,
                isMine: false,
              }}
            />
            <span className="font-normal text-ink-2">
              · {result.score > 0 ? `+${result.score}` : result.score} votes
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={next} disabled={pending} className="btn btn-primary">
              {pending ? "Loading…" : "Next caption →"}
            </button>
            <Link href={`/g/${round.generationId}`} className="btn btn-ghost">
              See the full battle
            </Link>
          </div>
          {!signedIn && tally.played >= 2 && (
            <p className="rounded-[22px] bg-powder p-4 text-sm text-ink">
              Think you could write a better one?{" "}
              <Link href="/login" className="font-semibold underline underline-offset-2">
                Sign in with Google
              </Link>{" "}
              to vote on today&apos;s battles and enter your own captions.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => guess("human")} disabled={pending} className="btn btn-human btn-lg">
            🧑‍🎓 Human
          </button>
          <button type="button" onClick={() => guess("ai")} disabled={pending} className="btn btn-ai btn-lg">
            🤖 AI
          </button>
        </div>
      )}
    </section>
  );
}
