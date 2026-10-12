"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { castVote } from "@/app/votes/actions";
import type { Reveal } from "@/lib/feed";

type VoteState = { upvotes: number; downvotes: number; vote: -1 | 0 | 1 };

function applyVote(state: VoteState, vote: -1 | 0 | 1): VoteState {
  return {
    upvotes: state.upvotes - (state.vote === 1 ? 1 : 0) + (vote === 1 ? 1 : 0),
    downvotes:
      state.downvotes - (state.vote === -1 ? 1 : 0) + (vote === -1 ? 1 : 0),
    vote,
  };
}

const ARROW =
  "flex h-9 w-10 items-center justify-center rounded-lg text-lg transition active:scale-90 disabled:cursor-not-allowed";

export function VoteButtons({
  captionId,
  upvotes,
  downvotes,
  myVote,
  signedIn,
  locked = false,
  onReveal,
}: {
  captionId: string;
  upvotes: number;
  downvotes: number;
  myVote: -1 | 0 | 1;
  signedIn: boolean;
  // The viewer's own caption: show the score but don't allow voting.
  locked?: boolean;
  onReveal?: (reveal: Reveal) => void;
}) {
  const pathname = usePathname();
  const [state, setState] = useState<VoteState>({
    upvotes,
    downvotes,
    vote: myVote,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const score = state.upvotes - state.downvotes;

  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        title="Sign in to vote"
        className="flex w-10 shrink-0 flex-col items-center text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
      >
        <span aria-hidden className="text-lg">▲</span>
        <span className="text-sm font-bold tabular-nums">{score}</span>
        <span aria-hidden className="text-lg">▼</span>
        <span className="sr-only">Sign in to vote</span>
      </Link>
    );
  }

  if (locked) {
    return (
      <div
        title="You can't vote on your own caption"
        className="flex w-10 shrink-0 flex-col items-center justify-center gap-0.5 text-black/40 dark:text-white/40"
      >
        <span className="text-sm font-bold tabular-nums text-foreground">
          {score}
        </span>
        <span className="text-[10px] leading-none">votes</span>
      </div>
    );
  }

  function vote(clicked: -1 | 1) {
    const next = state.vote === clicked ? 0 : clicked;
    const previous = state;
    setState(applyVote(state, next));
    setError(null);

    startTransition(async () => {
      const result = await castVote(captionId, next);
      if ("error" in result) {
        setState(previous);
        setError(result.error);
      } else {
        setState(result);
        if (result.reveal) onReveal?.(result.reveal);
      }
    });
  }

  return (
    <div className="flex w-10 shrink-0 flex-col items-center">
      <button
        type="button"
        onClick={() => vote(1)}
        disabled={pending}
        aria-pressed={state.vote === 1}
        aria-label="Upvote"
        className={`${ARROW} ${
          state.vote === 1
            ? "bg-orange-100 text-orange-600 dark:bg-orange-500/20"
            : "text-black/35 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/10"
        }`}
      >
        ▲
      </button>
      <span
        aria-live="polite"
        className={`text-sm font-bold tabular-nums ${
          state.vote === 1
            ? "text-orange-600"
            : state.vote === -1
              ? "text-indigo-600 dark:text-indigo-400"
              : ""
        }`}
      >
        {score}
      </span>
      <button
        type="button"
        onClick={() => vote(-1)}
        disabled={pending}
        aria-pressed={state.vote === -1}
        aria-label="Downvote"
        className={`${ARROW} ${
          state.vote === -1
            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
            : "text-black/35 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/10"
        }`}
      >
        ▼
      </button>
      {error && (
        <span role="alert" className="mt-1 w-20 text-center text-[10px] text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
