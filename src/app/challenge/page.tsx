import type { Metadata } from "next";
import Link from "next/link";
import { CaptionRow } from "@/app/components/CaptionRow";
import { Countdown } from "@/app/components/Countdown";
import { Icon } from "@/app/components/Icon";
import { EmptyCard } from "@/app/components/PageHero";
import { RevealBadge } from "@/app/components/RevealBadge";
import { getDailyWinner, getLeaderboard } from "@/lib/battles";
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
  title: "The Daily Drop — Morningside Memes",
  description: "A new prompt (and sometimes a photo) every day at midnight. Top caption wins.",
};

export default async function ChallengePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = getChallengeDate();
  const yesterday = shiftDay(today, -1);

  const [{ entries, error }, { generations: photos }, winner, drop] =
    await Promise.all([
      getLeaderboard(supabase, today, user?.id),
      getFeed(supabase, { day: today }),
      getDailyWinner(supabase, yesterday),
      getDailyDrop(supabase, today),
    ]);

  const postHref = user ? "/create" : "/login?next=/create";
  const dropHref = drop
    ? user
      ? `/create?image=${drop.id}`
      : `/login?next=${encodeURIComponent(`/create?image=${drop.id}`)}`
    : postHref;
  const humanEntries = entries.filter((e) => e.reveal?.authorType === "human" && e.reveal.isMine).length;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pt-8 sm:px-6 sm:pt-12">
      {/* Today's drop */}
      <section className="animate-fade-up relative grid overflow-hidden rounded-[40px] bg-ice text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] lg:grid-cols-[1.1fr_0.9fr]">
        <span aria-hidden className="absolute -left-16 -top-24 h-80 w-80 rounded-full bg-white/50 blur-3xl" />
        <div className="relative flex flex-col gap-5 px-6 py-10 sm:px-12 sm:py-14">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip bg-ink text-white">
              <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-sky" aria-hidden /> the daily drop
            </span>
            <span className="chip bg-white/70 text-ink">
              ⏳ <Countdown initialMs={msUntilNextChallenge()} /> left
            </span>
          </div>
          <h1 className="display text-5xl sm:text-7xl">{getDailyPrompt(today)}</h1>
          <p className="max-w-lg text-[17px] leading-relaxed text-ink-2">
            {drop
              ? "Today's photo just dropped. Make it a meme, or caption someone else's take. Top-voted caption at midnight takes the crown."
              : "Post a photo for today's prompt, or caption someone else's. Top-voted caption at midnight takes the crown."}
          </p>
          <dl className="flex flex-wrap gap-2 text-sm">
            <div className="rounded-full bg-white/70 px-4 py-2">
              <dt className="sr-only">Photos today</dt>
              <dd><span className="display text-lg tabular-nums">{photos.length}</span> {photos.length === 1 ? "photo" : "photos"}</dd>
            </div>
            <div className="rounded-full bg-white/70 px-4 py-2">
              <dt className="sr-only">Captions today</dt>
              <dd><span className="display text-lg tabular-nums">{entries.length}</span> {entries.length === 1 ? "caption" : "captions"} in the ring</dd>
            </div>
            {humanEntries > 0 && (
              <div className="rounded-full bg-human-soft px-4 py-2 text-human-ink">
                <dt className="sr-only">Your entries</dt>
                <dd>you&apos;re in with {humanEntries} ✍️</dd>
              </div>
            )}
          </dl>
          <div className="flex flex-wrap gap-3">
            <Link href={dropHref} className="btn btn-primary btn-lg">
              {drop ? "✨ Meme today's drop" : "📸 Post a photo"}
            </Link>
            <Link href="/surprise" className="btn btn-ghost btn-lg">
              🎲 Caption a random one
            </Link>
          </div>
        </div>
        <div className="relative min-h-72 p-3 lg:p-4">
          {drop ? (
            <figure className="relative h-full min-h-72 overflow-hidden rounded-[30px] bg-powder shadow-[0_30px_60px_-30px_rgba(22,38,61,0.5)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={drop.url} alt={drop.altText} className="absolute inset-0 h-full w-full object-cover" />
              <figcaption className="chip glass absolute bottom-3 left-3 text-ink">📍 {drop.title}</figcaption>
            </figure>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[30px] bg-white/50 p-8 text-center">
              <span aria-hidden className="animate-float text-[6rem] leading-none">🏆</span>
              <p className="text-sm text-ink-2">No featured photo today. Bring your own.</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Leaderboard */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">live</p>
              <h2 className="display mt-1 text-4xl">
                Today&apos;s <span className="serif">leaderboard</span>
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
                🎲 Caption a random one
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

          <Link href={postHref} className="btn btn-ice self-start">
            Enter today&apos;s challenge <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </aside>
      </div>
    </main>
  );
}
