import Link from "next/link";
import { VIBES, isVibe } from "@/lib/captions";
import type { FeedGeneration } from "@/lib/feed";
import { AddCaptionForm } from "./AddCaptionForm";
import { CaptionRow } from "./CaptionRow";
import { PostOwnerControls } from "./PostOwnerControls";

export function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// A photo and its caption battle: AI and human captions mixed together,
// authors hidden until you vote.
export function GenerationCard({
  generation,
  currentUserId,
  captionForm = "collapsed",
}: {
  generation: FeedGeneration;
  currentUserId?: string;
  // "open" on a post's own page, "collapsed" in feeds.
  captionForm?: "open" | "collapsed";
}) {
  const vibeLabel = isVibe(generation.vibe)
    ? VIBES[generation.vibe].label
    : generation.vibe;
  const signedIn = Boolean(currentUserId);
  const hiddenCount = generation.captions.filter((c) => !c.reveal).length;

  return (
    <article
      id={`g-${generation.id}`}
      className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-black/5 dark:ring-white/10"
    >
      <Link href={`/g/${generation.id}`} className="block bg-black/5 dark:bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={generation.imageUrl}
          alt={generation.context ?? "Uploaded photo"}
          loading="lazy"
          className="max-h-[480px] w-full object-contain"
        />
      </Link>

      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-black/50 dark:text-white/50">
          <span className="rounded-full bg-columbia/50 px-2 py-0.5 font-semibold text-navy dark:bg-columbia/20 dark:text-columbia">
            {vibeLabel}
          </span>
          {generation.dailyPrompt && (
            <Link href="/challenge" className="truncate hover:underline">
              📅 {generation.dailyPrompt}
            </Link>
          )}
          {generation.imageSource === "ai" && (
            <span
              title={generation.imagePrompt ?? undefined}
              className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-800 dark:bg-violet-500/20 dark:text-violet-200"
            >
              🎨 AI-generated photo
            </span>
          )}
          {generation.userId === currentUserId && <span>· your post</span>}
          <Link href={`/g/${generation.id}`} className="hover:underline">
            · {timeAgo(generation.createdAt)}
          </Link>
        </div>

        {generation.imageSource === "ai" && generation.imagePrompt && (
          <p className="text-xs text-black/50 dark:text-white/50">
            🎨 Prompt: {generation.imagePrompt}
          </p>
        )}

        {generation.context && (
          <p className="text-sm text-black/70 dark:text-white/70">
            “{generation.context}”
          </p>
        )}

        {generation.userId === currentUserId && (
          <PostOwnerControls
            generationId={generation.id}
            context={generation.context}
          />
        )}

        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold">
            ⚔️ {generation.captions.length} captions battling
          </h3>
          {hiddenCount > 0 && (
            <span className="text-xs text-black/50 dark:text-white/50">
              {signedIn ? "Vote to reveal who wrote it" : "Sign in to vote & reveal"}
            </span>
          )}
        </div>

        <ol className="flex flex-col gap-2">
          {generation.captions.map((caption, index) => (
            <CaptionRow
              key={caption.id}
              caption={caption}
              signedIn={signedIn}
              leading={index === 0}
            />
          ))}
        </ol>

        <div className="border-t border-black/5 pt-3 dark:border-white/10">
          {!signedIn ? (
            <Link
              href={`/login?next=/g/${generation.id}`}
              className="text-sm font-semibold text-navy underline-offset-2 hover:underline dark:text-columbia"
            >
              ✍️ Sign in to add your own caption
            </Link>
          ) : captionForm === "open" ? (
            <AddCaptionForm generationId={generation.id} />
          ) : (
            <details className="group">
              <summary className="cursor-pointer list-none text-sm font-semibold text-navy dark:text-columbia">
                ✍️ Add your caption{" "}
                <span className="text-black/40 group-open:hidden dark:text-white/40">
                  — beat the AI
                </span>
              </summary>
              <div className="pt-3">
                <AddCaptionForm generationId={generation.id} />
              </div>
            </details>
          )}
        </div>
      </div>
    </article>
  );
}
