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

const CAPSULE =
  "flex w-11 shrink-0 flex-col items-center rounded-full bg-white py-1 shadow-[inset_0_0_0_1px_rgba(22,38,61,0.08)]";
const ARROW =
  "flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition active:scale-75 disabled:cursor-not-allowed";

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
        className={`${CAPSULE} text-ink-3 transition hover:text-ink`}
      >
        <span aria-hidden className="flex h-7 items-center text-[13px]">▲</span>
        <span className="text-sm font-bold tabular-nums text-ink">{score}</span>
        <span aria-hidden className="flex h-7 items-center text-[13px]">▼</span>
        <span className="sr-only">Sign in to vote</span>
      </Link>
    );
  }

  if (locked) {
    return (
      <div title="You can't vote on your own caption" className={`${CAPSULE} justify-center gap-0.5 py-3 text-ink-3`}>
        <span className="text-sm font-bold tabular-nums text-ink">{score}</span>
        <span className="text-[9px] font-semibold uppercase leading-none tracking-wide">votes</span>
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
    <div className={CAPSULE}>
      <button
        type="button"
        onClick={() => vote(1)}
        disabled={pending}
        aria-pressed={state.vote === 1}
        aria-label="Upvote"
        className={`${ARROW} ${
          state.vote === 1 ? "orb text-ink" : "text-ink-3 hover:bg-powder hover:text-ink"
        }`}
      >
        ▲
      </button>
      <span
        aria-live="polite"
        className={`py-0.5 text-sm font-bold tabular-nums ${
          state.vote === 1 ? "text-human-ink" : state.vote === -1 ? "text-down-ink" : "text-ink"
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
          state.vote === -1 ? "bg-down-soft text-down-ink" : "text-ink-3 hover:bg-powder hover:text-ink"
        }`}
      >
        ▼
      </button>
      {error && (
        <span role="alert" className="mt-1 w-24 text-center text-[10px] leading-tight text-down-ink">
          {error}
        </span>
      )}
    </div>
  );
}
