import Link from "next/link";
import { VIBES, VIBE_EMOJI, isVibe } from "@/lib/captions";
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
  const isMine = generation.userId === currentUserId;

  return (
    <article id={`g-${generation.id}`} className="card overflow-hidden p-2">
      <Link href={`/g/${generation.id}`} className="group relative block overflow-hidden rounded-[22px] bg-powder">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={generation.imageUrl}
          alt={generation.context ?? "Uploaded photo"}
          loading="lazy"
          className="max-h-[520px] w-full object-contain transition duration-500 group-hover:scale-[1.015]"
        />
        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <span className="chip glass text-ink">
            {VIBE_EMOJI[generation.vibe] ?? "✨"} {vibeLabel}
          </span>
          <span className="chip glass text-ink-2">{timeAgo(generation.createdAt)}</span>
        </div>
        {generation.imageSource === "ai" && (
          <span
            title={generation.imagePrompt ?? undefined}
            className="chip glass pointer-events-none absolute bottom-3 left-3 text-ai-ink"
          >
            🎨 AI-generated photo
          </span>
        )}
      </Link>

      <div className="flex flex-col gap-4 px-3 pb-3 pt-4 sm:px-4">
        {generation.dailyPrompt && (
          <Link href="/challenge" className="chip max-w-full self-start bg-powder text-ink transition hover:bg-ice">
            <span aria-hidden>📅</span>
            <span className="truncate">{generation.dailyPrompt}</span>
          </Link>
        )}

        {generation.imageSource === "ai" && generation.imagePrompt && (
          <p className="text-xs text-ink-3">🎨 Prompt: {generation.imagePrompt}</p>
        )}

        {generation.context && (
          <p className="serif text-[22px] leading-tight text-ink">“{generation.context}”</p>
        )}

        {isMine && <PostOwnerControls generationId={generation.id} context={generation.context} />}

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="display text-xl">
            {generation.captions.length} captions <span className="serif text-2xl text-ink-2">in the ring</span>
          </h3>
          {hiddenCount > 0 && (
            <span className="text-xs font-medium text-ink-3">
              {signedIn ? "vote to reveal who wrote it 👀" : "sign in to vote & reveal"}
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

        <div className="pt-1">
          {!signedIn ? (
            <Link href={`/login?next=/g/${generation.id}`} className="btn btn-ice w-full">
              ✍️ Sign in to add your own caption
            </Link>
          ) : captionForm === "open" ? (
            <div className="rounded-[22px] bg-background p-4 ring-1 ring-line">
              <AddCaptionForm generationId={generation.id} />
            </div>
          ) : (
            <details className="group rounded-[22px] bg-background ring-1 ring-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-[22px] px-4 py-3 text-sm font-semibold text-ink transition hover:bg-powder">
                <span>✍️ Add your caption</span>
                <span className="text-ink-3 group-open:hidden">beat the AI →</span>
                <span className="hidden text-ink-3 group-open:inline">close</span>
              </summary>
              <div className="px-4 pb-4 pt-1">
                <AddCaptionForm generationId={generation.id} />
              </div>
            </details>
          )}
        </div>
      </div>
    </article>
  );
}
