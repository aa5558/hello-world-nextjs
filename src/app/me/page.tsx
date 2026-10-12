import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PostOwnerControls } from "@/app/components/PostOwnerControls";
import { RevealBadge } from "@/app/components/RevealBadge";
import { timeAgo } from "@/app/components/GenerationCard";
import { getMyCaptions } from "@/lib/battles";
import { VIBES, isVibe } from "@/lib/captions";
import { getFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Posts — Morningside Memes",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col rounded-2xl bg-surface p-3 ring-1 ring-black/5 dark:ring-white/10">
      <span className="text-2xl font-black tabular-nums">{value}</span>
      <span className="text-xs text-black/55 dark:text-white/55">{label}</span>
    </div>
  );
}

function signed(n: number) {
  return n > 0 ? `+${n}` : `${n}`;
}

export default async function MyPostsPage(props: PageProps<"/me">) {
  const searchParams = await props.searchParams;
  const tab = searchParams.tab === "captions" ? "captions" : "photos";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/me");
  }

  const [{ generations: photos, error }, myCaptions] = await Promise.all([
    getFeed(supabase, { ownerId: user.id, userId: user.id }),
    getMyCaptions(supabase),
  ]);

  const captionWins = myCaptions.filter((c) => c.rank === 1 && c.score > 0).length;
  const captionPoints = myCaptions.reduce((sum, c) => sum + c.score, 0);
  const best = [...myCaptions].sort((a, b) => b.score - a.score)[0];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight">My Posts</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Your photos, your captions, and how they&apos;re doing against Gemini.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Photos posted" value={photos.length} />
        <Stat label="Captions written" value={myCaptions.length} />
        <Stat label="Net votes on your captions" value={signed(captionPoints)} />
        <Stat label="Photos you're #1 on" value={captionWins} />
      </section>

      {best && best.score > 0 && (
        <Link
          href={`/g/${best.generationId}`}
          className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/30"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={best.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              ⭐ Your best caption · {signed(best.score)}
            </p>
            <p className="truncate font-medium">{best.text}</p>
          </div>
        </Link>
      )}

      <nav className="flex gap-2 text-sm">
        {[
          { key: "photos", label: `📸 My photos (${photos.length})`, href: "/me" },
          {
            key: "captions",
            label: `✍️ My captions (${myCaptions.length})`,
            href: "/me?tab=captions",
          },
        ].map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`rounded-full px-3 py-1.5 font-medium ${
              tab === item.key
                ? "bg-navy text-white dark:bg-columbia dark:text-navy"
                : "bg-surface ring-1 ring-black/10 dark:ring-white/15"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "photos" && (
        <section className="flex flex-col gap-3">
          {error && <p className="text-red-600">Error loading your photos: {error}</p>}
          {!error && photos.length === 0 && (
            <EmptyState
              text="You haven't posted a photo yet. Gemini is waiting."
              href="/create"
              cta="Post your first photo"
            />
          )}
          {photos.map((photo) => {
            const vibe = isVibe(photo.vibe) ? VIBES[photo.vibe].label : photo.vibe;
            const humans = photo.captions.filter(
              (c) => c.reveal?.authorType === "human"
            ).length;
            return (
              <article
                key={photo.id}
                className="flex flex-col gap-3 rounded-2xl bg-surface p-3 ring-1 ring-black/5 dark:ring-white/10"
              >
                <Link href={`/g/${photo.id}`} className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.imageUrl}
                    alt={photo.context ?? "Your photo"}
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="truncate text-sm font-semibold">
                      {photo.dailyPrompt ?? "Photo"}
                    </p>
                    <p className="text-xs text-black/55 dark:text-white/55">
                      {vibe} · {timeAgo(photo.createdAt)}
                    </p>
                    <p className="text-xs text-black/55 dark:text-white/55">
                      {photo.captions.length} captions · {humans}{" "}
                      {humans === 1 ? "human challenger" : "human challengers"}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 text-sm font-semibold text-navy dark:text-columbia">
                    Open →
                  </span>
                </Link>
                <PostOwnerControls generationId={photo.id} context={photo.context} />
                <ol className="flex flex-col gap-1.5">
                  {photo.captions.map((caption, index) => (
                    <li
                      key={caption.id}
                      className="flex items-start gap-2 rounded-lg bg-black/[0.025] px-2 py-1.5 text-sm dark:bg-white/5"
                    >
                      <span className="w-8 shrink-0 text-right font-bold tabular-nums">
                        {signed(caption.score)}
                      </span>
                      <span className="flex-1">
                        {index === 0 && caption.score > 0 && "👑 "}
                        {caption.text}
                      </span>
                      <RevealBadge reveal={caption.reveal} />
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </section>
      )}

      {tab === "captions" && (
        <section className="flex flex-col gap-2">
          {myCaptions.length === 0 && (
            <EmptyState
              text="You haven't written a caption yet. Pick any photo and try to beat the AI."
              href="/challenge"
              cta="Go to today's challenge"
            />
          )}
          {myCaptions.map((caption) => (
            <Link
              key={caption.id}
              href={`/g/${caption.generationId}`}
              className="flex items-center gap-3 rounded-2xl bg-surface p-3 ring-1 ring-black/5 transition hover:ring-black/15 dark:ring-white/10 dark:hover:ring-white/25"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={caption.imageUrl}
                alt=""
                loading="lazy"
                className="h-14 w-14 shrink-0 rounded-lg object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="leading-snug">{caption.text}</p>
                <p className="text-xs text-black/55 dark:text-white/55">
                  ▲ {caption.upvotes} · ▼ {caption.downvotes} ·{" "}
                  {timeAgo(caption.createdAt)} · tap to edit or delete
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-lg font-black tabular-nums">
                  {signed(caption.score)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    caption.rank === 1 && caption.score > 0
                      ? "bg-amber-400 text-amber-950"
                      : "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60"
                  }`}
                >
                  #{caption.rank} of {caption.total}
                </span>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

function EmptyState({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-8 text-center ring-1 ring-black/5 dark:ring-white/10">
      <p className="text-black/60 dark:text-white/60">{text}</p>
      <Link
        href={href}
        className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white dark:bg-columbia dark:text-navy"
      >
        {cta}
      </Link>
    </div>
  );
}
