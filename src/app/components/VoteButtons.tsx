"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { castVote } from "@/app/votes/actions";

type VoteState = { upvotes: number; downvotes: number; vote: -1 | 0 | 1 };

function applyVote(state: VoteState, vote: -1 | 0 | 1): VoteState {
  return {
    upvotes: state.upvotes - (state.vote === 1 ? 1 : 0) + (vote === 1 ? 1 : 0),
    downvotes:
      state.downvotes - (state.vote === -1 ? 1 : 0) + (vote === -1 ? 1 : 0),
    vote,
  };
}

export function VoteButtons({
  captionId,
  upvotes,
  downvotes,
  myVote,
  signedIn,
}: {
  captionId: string;
  upvotes: number;
  downvotes: number;
  myVote: -1 | 0 | 1;
  signedIn: boolean;
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
        className="flex w-12 shrink-0 flex-col items-center text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
      >
        <span aria-hidden>▲</span>
        <span className="text-sm font-semibold tabular-nums">{score}</span>
        <span aria-hidden>▼</span>
        <span className="sr-only">Sign in to vote</span>
      </Link>
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
      }
    });
  }

  return (
    <div className="flex w-12 shrink-0 flex-col items-center">
      <button
        type="button"
        onClick={() => vote(1)}
        disabled={pending}
        aria-pressed={state.vote === 1}
        aria-label="Upvote"
        className={`rounded px-2 hover:bg-black/5 dark:hover:bg-white/10 ${
          state.vote === 1 ? "text-orange-600" : "text-black/40 dark:text-white/40"
        }`}
      >
        ▲
      </button>
      <span
        className={`text-sm font-semibold tabular-nums ${
          state.vote === 1
            ? "text-orange-600"
            : state.vote === -1
              ? "text-indigo-600"
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
        className={`rounded px-2 hover:bg-black/5 dark:hover:bg-white/10 ${
          state.vote === -1 ? "text-indigo-600" : "text-black/40 dark:text-white/40"
        }`}
      >
        ▼
      </button>
      {error && (
        <span role="alert" className="mt-1 text-center text-[10px] text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
