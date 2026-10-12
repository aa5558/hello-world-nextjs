"use client";

import { useState, type ReactNode } from "react";
import type { FeedCaption, Reveal } from "@/lib/feed";
import { CaptionOwnerActions } from "./CaptionOwnerActions";
import { RevealBadge } from "./RevealBadge";
import { VoteButtons } from "./VoteButtons";

// One caption in a battle: vote on it, and find out who wrote it.
export function CaptionRow({
  caption,
  signedIn,
  rank,
  leading = false,
  thumbnail,
}: {
  caption: FeedCaption;
  signedIn: boolean;
  // Leaderboard position, shown as a number badge.
  rank?: number;
  // The current top caption on its photo.
  leading?: boolean;
  // Shown before the vote buttons, e.g. the photo on the leaderboard.
  thumbnail?: ReactNode;
}) {
  const [reveal, setReveal] = useState<Reveal | null>(caption.reveal);
  const [justRevealed, setJustRevealed] = useState(false);
  const [text, setText] = useState(caption.text);
  const [deleted, setDeleted] = useState(false);

  function handleReveal(next: Reveal) {
    if (!reveal) setJustRevealed(true);
    setReveal(next);
  }

  const tint =
    reveal?.authorType === "human"
      ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-500/5"
      : reveal?.authorType === "ai"
        ? "border-violet-200 bg-violet-50/60 dark:border-violet-500/25 dark:bg-violet-500/5"
        : "border-black/5 bg-black/[0.025] dark:border-white/10 dark:bg-white/5";

  if (deleted) return null;

  return (
    <li className={`flex items-center gap-2 rounded-xl border p-2 transition-colors ${tint}`}>
      {rank !== undefined && (
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            rank === 1
              ? "bg-amber-400 text-amber-950"
              : rank <= 3
                ? "bg-columbia text-navy"
                : "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60"
          }`}
        >
          {rank}
        </span>
      )}
      {thumbnail}
      <VoteButtons
        captionId={caption.id}
        upvotes={caption.upvotes}
        downvotes={caption.downvotes}
        myVote={caption.myVote}
        signedIn={signedIn}
        locked={reveal?.isMine}
        onReveal={handleReveal}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-[15px] leading-snug break-words">
          {leading && caption.score > 0 && (
            <span className="mr-1" title="Top caption">
              👑
            </span>
          )}
          {text}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <RevealBadge reveal={reveal} animate={justRevealed} />
          {reveal?.isMine && (
            <CaptionOwnerActions
              captionId={caption.id}
              text={text}
              hasVotes={caption.upvotes + caption.downvotes > 0}
              onEdited={setText}
              onDeleted={() => setDeleted(true)}
            />
          )}
        </div>
      </div>
    </li>
  );
}
