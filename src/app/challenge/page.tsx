import type { Metadata } from "next";
import Link from "next/link";
import { CaptionRow } from "@/app/components/CaptionRow";
import { Countdown } from "@/app/components/Countdown";
import { EmptyCard } from "@/app/components/PageHero";
import { RevealBadge } from "@/app/components/RevealBadge";
import { ScoreboardCard } from "@/app/components/ScoreboardCard";
import { getDailyWinner, getLeaderboard, getScoreboard } from "@/lib/battles";
import {
  getChallengeDate,
  getDailyPrompt,
  msUntilNextChallenge,
  shiftDay,
} from "@/lib/captions";
import { getFeed } from "@/lib/feed";
import { getDailyDrop } from "@/lib/library";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard · Morningside Memes",
  description: "A new prompt (and sometimes a photo) every day at midnight. Top caption wins.",
};

export default async function ChallengePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = getChallengeDate();
  const yesterday = shiftDay(today, -1);

  const [{ entries, error }, { generations: photos }, winner, drop, scoreboard] =
    await Promise.all([
      getLeaderboard(supabase, today, user?.id),
      getFeed(supabase, { day: today }),
      getDailyWinner(supabase, yesterday),
      getDailyDrop(supabase, today),
      getScoreboard(supabase),
    ]);

  const postHref = user ? "/create" : "/login?next=/create";
  const dropHref = drop
    ? user
      ? `/create?image=${drop.id}`
      : `/login?next=${encodeURIComponent(`/create?image=${drop.id}`)}`
    : postHref;
  const humanEntries = entries.filter((e) => e.reveal?.authorType === "human" && e.reveal.isMine).length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 pt-8 sm:px-6 sm:pt-12">
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-gold-ink">Leaderboard</p>
        <h1 className="display text-4xl sm:text-6xl">
          Who&apos;s the funniest on <span className="serif text-plum">campus?</span>
        </h1>
        <p className="max-w-xl text-[16px] text-ink-2">
          Today&apos;s top captions for the daily prompt, ranked by votes. The best one at midnight takes
          the crown.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Leaderboard */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="display text-3xl">
                Today&apos;s <span className="serif">ranking</span>
              </h2>
            </div>
            <span className="chip bg-powder text-ink">
              {entries.length} {entries.length === 1 ? "caption" : "captions"}
            </span>
          </div>
          {error && (
            <p role="alert" className="rounded-[22px] bg-down-soft p-4 text-sm text-down-ink">
              We couldn&apos;t load the leaderboard: {error}
            </p>
          )}
          {!error && entries.length === 0 ? (
            <EmptyCard
              emoji="📸"
              title="No entries yet today."
              body="First photo gets everyone's attention. Just saying."
            >
              <Link href={postHref} className="btn btn-primary">
                Start today&apos;s challenge
              </Link>
              <Link href="/surprise" className="btn btn-ghost">
                Caption a random one
              </Link>
            </EmptyCard>
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
                        className="h-14 w-14 rounded-2xl object-cover transition hover:scale-105"
                      />
                    </Link>
                  }
                />
              ))}
            </ol>
          )}
        </section>

        <aside className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          {/* Today's prompt */}
          <section className="flex flex-col gap-4 overflow-hidden rounded-[24px] border border-gold/40 bg-gold-soft/70 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip bg-plum text-white">Today&apos;s prompt</span>
              <span className="chip bg-white/80 text-ink">
                <Countdown initialMs={msUntilNextChallenge()} /> left
              </span>
            </div>
            <p className="display text-3xl">{getDailyPrompt(today)}</p>
            {drop && (
              <figure className="flex flex-col gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={drop.url} alt={drop.altText} className="aspect-[4/3] w-full rounded-2xl object-cover" />
                <figcaption className="text-xs text-ink-3">{drop.title}</figcaption>
              </figure>
            )}
            <p className="text-sm text-ink-2">
              {photos.length} {photos.length === 1 ? "photo" : "photos"} · {entries.length}{" "}
              {entries.length === 1 ? "caption" : "captions"} today
              {humanEntries > 0 && <> · you&apos;re in with {humanEntries}</>}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={dropHref} className="btn btn-primary btn-sm">
                {drop ? "Meme today's photo" : "Post a photo"}
              </Link>
              <Link href="/surprise" className="btn btn-ghost btn-sm">
                Caption a random one
              </Link>
            </div>
          </section>

          <ScoreboardCard scoreboard={scoreboard} />
          {/* Yesterday's winner */}
          <section className="flex flex-col gap-3">
            <h2 className="display text-3xl">
              Yesterday&apos;s <span className="serif">champ</span>
            </h2>
            {winner ? (
              <Link
                href={`/g/${winner.generationId}`}
                className="card lift group flex flex-col gap-4 overflow-hidden p-2"
              >
                <div className="relative overflow-hidden rounded-[22px] bg-powder">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={winner.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                  <span className="chip absolute left-3 top-3 bg-butter text-butter-ink shadow-sm">🏆 winner</span>
                </div>
                <div className="flex flex-col gap-2 px-3 pb-3">
                  {winner.dailyPrompt && <p className="text-xs text-ink-3">“{winner.dailyPrompt}”</p>}
                  <p className="text-lg font-semibold leading-snug">👑 {winner.text}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <RevealBadge
                      reveal={{
                        authorType: winner.authorType,
                        authorName: winner.authorName,
                        isMine: false,
                      }}
                    />
                    <span className="font-semibold tabular-nums">+{winner.score} votes</span>
                  </div>
                  <p className="text-sm font-medium text-ink-2">
                    {winner.authorType === "human"
                      ? "A human beat the AI 🎉"
                      : "The AI won this one. Get it back today."}
                  </p>
                </div>
              </Link>
            ) : (
              <p className="card p-5 text-sm text-ink-2">
                No winner yesterday. Nobody upvoted a caption in time. Don&apos;t let that happen today.
              </p>
            )}
          </section>

          {photos.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="display text-3xl">
                Caption <span className="serif">today&apos;s photos</span>
              </h2>
              <p className="text-sm text-ink-2">
                Tap a photo to throw your caption into the battle, or{" "}
                <Link href="/surprise" className="font-semibold text-ink underline underline-offset-2">
                  roll a random one
                </Link>
                .
              </p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <Link
                    key={photo.id}
                    href={`/g/${photo.id}`}
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-powder"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.imageUrl}
                      alt={photo.context ?? "Today's photo"}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                    />
                    <span className="chip glass absolute bottom-1.5 right-1.5 px-2 py-0.5 text-[10px] text-ink">
                      {photo.captions.length} 💬
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </aside>
      </div>
    </main>
  );
}
