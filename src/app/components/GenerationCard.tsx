import Link from "next/link";
import { VIBES, isVibe } from "@/lib/captions";
import type { FeedGeneration } from "@/lib/feed";
import { VoteButtons } from "./VoteButtons";

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function GenerationCard({
  generation,
  currentUserId,
}: {
  generation: FeedGeneration;
  currentUserId?: string;
}) {
  const vibeLabel = isVibe(generation.vibe)
    ? VIBES[generation.vibe].label
    : generation.vibe;

  return (
    <article
      id={`g-${generation.id}`}
      className="overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/15 dark:bg-white/5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={generation.imageUrl}
        alt={generation.context ?? "Uploaded photo"}
        className="max-h-[480px] w-full bg-black/5 object-contain"
      />

      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-black/50 dark:text-white/50">
          <span className="rounded-full bg-black/5 px-2 py-0.5 font-medium text-black/70 dark:bg-white/10 dark:text-white/70">
            {vibeLabel}
          </span>
          {generation.userId === currentUserId && <span>· your post</span>}
          <Link href={`/g/${generation.id}`} className="hover:underline">
            · {timeAgo(generation.createdAt)}
          </Link>
        </div>

        {generation.context && (
          <p className="text-sm text-black/70 dark:text-white/70">
            “{generation.context}”
          </p>
        )}

        <ol className="flex flex-col gap-2">
          {generation.captions.map((caption, index) => (
            <li
              key={caption.id}
              className="flex items-center gap-2 rounded-lg bg-black/[0.03] p-2 dark:bg-white/5"
            >
              <VoteButtons
                captionId={caption.id}
                upvotes={caption.upvotes}
                downvotes={caption.downvotes}
                myVote={caption.myVote}
                signedIn={Boolean(currentUserId)}
              />
              <p className="flex-1 text-[15px] leading-snug">
                {index === 0 && caption.score > 0 && (
                  <span className="mr-1" title="Top caption">
                    👑
                  </span>
                )}
                {caption.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
