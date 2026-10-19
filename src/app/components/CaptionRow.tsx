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
      ? "bg-human-soft/70 ring-human/25"
      : reveal?.authorType === "ai"
        ? "bg-ai-soft/70 ring-ai/25"
        : "bg-background ring-line";

  if (deleted) return null;

  return (
    <li className={`flex items-center gap-3 rounded-[22px] p-2 pr-3 ring-1 transition-colors duration-500 ${tint}`}>
      {rank !== undefined && (
        <span
          className={`display flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
            rank === 1
              ? "bg-butter text-butter-ink shadow-[inset_0_1px_0_#fff,0_6px_14px_-8px_rgba(122,86,0,0.6)]"
              : rank <= 3
                ? "orb text-ink"
                : "bg-white text-ink-3 ring-1 ring-line"
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
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
        <p className="break-words text-[15.5px] font-medium leading-snug text-ink">
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
