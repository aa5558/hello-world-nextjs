import type { Metadata } from "next";
import Link from "next/link";
import { CaptionRow } from "@/app/components/CaptionRow";
import { Countdown } from "@/app/components/Countdown";
import { RevealBadge } from "@/app/components/RevealBadge";
import { getDailyWinner, getLeaderboard } from "@/lib/battles";
import {
  getChallengeDate,
  getDailyPrompt,
  msUntilNextChallenge,
  shiftDay,
} from "@/lib/captions";
import { getFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Daily Caption Challenge — Morningside Memes",
  description: "A new photo prompt every day at midnight. Top caption wins.",
};

export default async function ChallengePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = getChallengeDate();
  const yesterday = shiftDay(today, -1);

  const [{ entries, error }, { generations: photos }, winner] =
    await Promise.all([
      getLeaderboard(supabase, today, user?.id),
      getFeed(supabase, { day: today }),
      getDailyWinner(supabase, yesterday),
    ]);

  const postHref = user ? "/create" : "/login?next=/create";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <section className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-navy p-6 text-white shadow-md">
        <span className="absolute -right-4 -top-6 text-9xl opacity-10" aria-hidden>
          🏆
        </span>
        <p className="text-xs font-bold uppercase tracking-widest text-columbia">
          Daily caption challenge
        </p>
        <h1 className="text-3xl font-black leading-tight">{getDailyPrompt(today)}</h1>
        <p className="text-sm text-white/75">
          Post a photo for today&apos;s prompt, or caption someone else&apos;s.
          The top-voted caption at midnight wins the day.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link
            href={postHref}
            className="rounded-full bg-columbia px-4 py-2 text-sm font-semibold text-navy hover:bg-white"
          >
            📸 Post a photo
          </Link>
          <span className="text-sm text-white/75">
            ⏳ <Countdown initialMs={msUntilNextChallenge()} /> left
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">🏆 Yesterday&apos;s winner</h2>
        {winner ? (
          <Link
            href={`/g/${winner.generationId}`}
            className="flex gap-4 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 p-4 ring-1 ring-amber-300 transition hover:ring-amber-400 dark:from-amber-500/15 dark:to-amber-500/5 dark:ring-amber-500/40"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={winner.imageUrl}
              alt=""
              className="h-24 w-24 shrink-0 rounded-xl object-cover"
            />
            <div className="flex min-w-0 flex-col gap-2">
              {winner.dailyPrompt && (
                <p className="text-xs text-amber-900/70 dark:text-amber-200/70">
                  “{winner.dailyPrompt}”
                </p>
              )}
              <p className="font-semibold leading-snug">👑 {winner.text}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <RevealBadge
                  reveal={{
                    authorType: winner.authorType,
                    authorName: winner.authorName,
                    isMine: false,
                  }}
                />
                <span className="font-semibold tabular-nums">
                  +{winner.score} votes
                </span>
              </div>
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                {winner.authorType === "human"
                  ? "A human beat the AI 🎉"
                  : "The AI won this one. Get it back today."}
              </p>
            </div>
          </Link>
        ) : (
          <p className="rounded-2xl bg-surface p-4 text-sm text-black/60 ring-1 ring-black/5 dark:text-white/60 dark:ring-white/10">
            No winner yesterday. Nobody upvoted a caption in time. Don&apos;t
            let that happen today.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">📊 Today&apos;s leaderboard</h2>
          <span className="text-xs text-black/50 dark:text-white/50">
            {entries.length} {entries.length === 1 ? "caption" : "captions"}
          </span>
        </div>
        {error && <p className="text-red-600">Error loading the leaderboard: {error}</p>}
        {!error && entries.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-8 text-center ring-1 ring-black/5 dark:ring-white/10">
            <p className="text-black/60 dark:text-white/60">
              No entries yet today. First photo gets everyone&apos;s attention.
            </p>
            <Link
              href={postHref}
              className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white dark:bg-columbia dark:text-navy"
            >
              Start today&apos;s challenge
            </Link>
            <Link
              href="/surprise"
              className="text-sm font-semibold text-navy hover:underline dark:text-columbia"
            >
              No photo? 🎲 Caption a random one
            </Link>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {entries.map((entry, index) => (
              <CaptionRow
                key={entry.id}
                caption={entry}
                signedIn={Boolean(user)}
                rank={index + 1}
                thumbnail={
                  <Link href={`/g/${entry.generationId}`} className="shrink-0" title="Open photo">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.imageUrl}
                      alt="Photo for this caption"
                      loading="lazy"
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                  </Link>
                }
              />
            ))}
          </ol>
        )}
      </section>

      {photos.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">✍️ Caption today&apos;s photos</h2>
          <p className="-mt-2 text-sm text-black/60 dark:text-white/60">
            Tap a photo to throw your own caption into the battle, or{" "}
            <Link href="/surprise" className="font-semibold text-navy hover:underline dark:text-columbia">
              🎲 roll a random one
            </Link>
            .
          </p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <Link
                key={photo.id}
                href={`/g/${photo.id}`}
                className="group relative aspect-square overflow-hidden rounded-xl bg-black/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.imageUrl}
                  alt={photo.context ?? "Today's photo"}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {photo.captions.length} 💬
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
