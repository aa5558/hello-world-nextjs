import Link from "next/link";
import { Countdown } from "@/app/components/Countdown";
import { GenerationCard } from "@/app/components/GenerationCard";
import { GuessGame } from "@/app/components/GuessGame";
import { Icon } from "@/app/components/Icon";
import { ScoreboardCard } from "@/app/components/ScoreboardCard";
import { getDailyWinner, getScoreboard } from "@/lib/battles";
import {
  getChallengeDate,
  getDailyPrompt,
  msUntilNextChallenge,
  shiftDay,
} from "@/lib/captions";
import { getFeed, type FeedGeneration, type FeedSort } from "@/lib/feed";
import { getGuessRound } from "@/lib/guess";
import { getDailyDrop } from "@/lib/library";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABS: { sort: FeedSort; label: string }[] = [
  { sort: "new", label: "Fresh" },
  { sort: "top", label: "Top this week" },
];

const STEPS = [
  { n: "01", title: "Drop a photo", body: "Anything from campus life. Dining hall plates count." },
  { n: "02", title: "Let the AI cook", body: "Gemini writes four captions in the voice you pick." },
  { n: "03", title: "Vote blind", body: "Humans and AI, mixed together. Vote to reveal who wrote what." },
];

type View = "battles" | "wall";

function feedHref(sort: FeedSort, view: View) {
  const params = new URLSearchParams();
  if (sort !== "new") params.set("sort", sort);
  if (view !== "battles") params.set("view", view);
  const query = params.toString();
  return query ? `/feed?${query}#feed` : "/feed#feed";
}

export default async function Home(props: PageProps<"/feed">) {
  const searchParams = await props.searchParams;
  const sort: FeedSort = searchParams.sort === "top" ? "top" : "new";
  const view: View = searchParams.view === "wall" ? "wall" : "battles";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = getChallengeDate();
  const [{ generations, error }, scoreboard, yesterdayWinner, guessRound, drop] =
    await Promise.all([
      getFeed(supabase, { sort, userId: user?.id }),
      getScoreboard(supabase),
      getDailyWinner(supabase, shiftDay(today, -1)),
      getGuessRound(supabase),
      getDailyDrop(supabase, today),
    ]);

  const postHref = user ? "/create" : "/login?next=/create";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-5 pb-20 pt-16 sm:px-8">
      <header className="flex flex-col gap-3 pt-10">
        <h1 className="word text-6xl sm:text-8xl">Everything.</h1>
        <p className="max-w-md text-ink-2">Every meme on campus, captions mixed blind. Vote to see who wrote what.</p>
      </header>

      {/* Scoreboard + Daily Drop */}
      <section className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-2">
          <ScoreboardCard scoreboard={scoreboard} />
        </div>
        <Link
          href="/challenge"
          className="lift group relative flex min-h-64 flex-col justify-between gap-6 overflow-hidden rounded-[32px] bg-ice p-6 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-8 md:col-span-3"
        >
          <span aria-hidden className="absolute -right-8 -top-10 h-56 w-56 rounded-full bg-white/50 blur-2xl" />
          {drop ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={drop.url}
              alt=""
              className="absolute -bottom-6 right-6 h-44 w-36 rotate-6 rounded-[22px] object-cover shadow-[0_24px_40px_-20px_rgba(22,21,20,0.6)] ring-4 ring-white transition-transform duration-500 group-hover:rotate-2 group-hover:scale-105 sm:h-52 sm:w-44"
            />
          ) : (
            <span aria-hidden className="absolute -bottom-6 right-6 text-[7rem] leading-none opacity-90 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105">
              📸
            </span>
          )}
          <div className="relative flex flex-wrap items-center gap-2">
            <span className="chip bg-white/70 text-ink">{drop ? "today's challenge · photo dropped" : "today's challenge"}</span>
            <span className="chip bg-ink text-white">
              ⏳ <Countdown initialMs={msUntilNextChallenge()} /> left
            </span>
          </div>
          <div className="relative flex max-w-[60%] flex-col gap-3 sm:max-w-sm">
            <p className="display text-4xl sm:text-5xl">{getDailyPrompt(today)}</p>
            {yesterdayWinner && (
              <p className="text-sm text-ink-2">
                🏆 Yesterday:{" "}
                {yesterdayWinner.authorType === "human"
                  ? `${yesterdayWinner.authorName ?? "a human"} beat the AI`
                  : "Gemini took the crown"}
              </p>
            )}
            <span className="mt-1 inline-flex items-center gap-1.5 self-start text-sm font-semibold">
              Enter the Daily Drop
              <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      </section>

      {/* How it works, for first-time visitors */}
      {!user && (
        <section className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="card flex flex-col gap-2 p-5">
              <span className="display text-sm text-sky-deep">{step.n}</span>
              <h2 className="display text-2xl">{step.title}</h2>
              <p className="text-sm leading-relaxed text-ink-2">{step.body}</p>
            </div>
          ))}
          <p className="text-sm text-ink-2 sm:col-span-3">
            Just looking around? Play <a href="#guess" className="font-semibold text-ink underline underline-offset-2">Human or AI?</a>{" "}
            and browse every battle without an account.{" "}
            <Link href="/login" className="font-semibold text-ink underline underline-offset-2">
              Sign in with Google
            </Link>{" "}
            to vote, reveal authors, and write your own captions.
          </p>
        </section>
      )}

      <div className="mx-auto w-full max-w-3xl">
        <GuessGame initialRound={guessRound} signedIn={Boolean(user)} />
      </div>

      {/* Feed */}
      <section id="feed" className="flex scroll-mt-24 flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">the feed</p>
            <h2 className="display mt-1 text-4xl sm:text-5xl">
              {sort === "top" ? (
                <>
                  Top <span className="serif">this week</span>
                </>
              ) : (
                <>
                  Fresh <span className="serif">battles</span>
                </>
              )}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Sort" className="flex gap-1 rounded-full bg-powder/80 p-1 text-sm">
              {TABS.map((tab) => (
                <Link
                  key={tab.sort}
                  href={feedHref(tab.sort, view)}
                  aria-current={tab.sort === sort ? "page" : undefined}
                  className={`rounded-full px-3.5 py-1.5 font-medium transition ${
                    tab.sort === sort ? "bg-white text-ink shadow-[0_2px_8px_-2px_rgba(22,21,20,0.18)]" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
            <nav aria-label="Layout" className="flex gap-1 rounded-full bg-white p-1 text-sm ring-1 ring-line">
              {(
                [
                  { key: "battles", label: "Battles", icon: "flame" },
                  { key: "wall", label: "Photo wall", icon: "grid" },
                ] as const
              ).map((item) => (
                <Link
                  key={item.key}
                  href={feedHref(sort, item.key)}
                  aria-current={view === item.key ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
                    view === item.key ? "bg-ink text-white" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-[22px] bg-down-soft p-4 text-sm text-down-ink">
            We couldn&apos;t load the feed: {error}
          </p>
        )}

        {!error && generations.length === 0 && (
          <div className="card flex flex-col items-center gap-4 p-10 text-center">
            <span className="orb flex h-16 w-16 items-center justify-center rounded-full text-3xl">📸</span>
            <p className="display text-2xl">
              {sort === "top" ? "No photos this week yet." : "It's quiet. Too quiet."}
            </p>
            <p className="text-sm text-ink-2">
              {sort === "top" ? "Be the one who changes that." : "Nothing here yet. Be the first to post today."}
            </p>
            <Link href={postHref} className="btn btn-primary">
              Post a photo
            </Link>
          </div>
        )}

        {view === "battles" ? (
          <div className="columns-1 gap-5 md:columns-2 [&>*]:mb-5 [&>*]:break-inside-avoid">
            {generations.map((generation) => (
              <GenerationCard key={generation.id} generation={generation} currentUserId={user?.id} />
            ))}
          </div>
        ) : (
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3 [&>*]:break-inside-avoid">
            {generations.map((generation) => (
              <WallTile key={generation.id} generation={generation} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function WallTile({ generation }: { generation: FeedGeneration }) {
  const top = generation.captions[0];
  return (
    <Link href={`/g/${generation.id}`} className="group relative block overflow-hidden rounded-[22px] bg-powder ring-1 ring-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={generation.imageUrl} alt={generation.context ?? "Campus photo"} loading="lazy" className="w-full transition duration-500 group-hover:scale-105" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent p-3 pt-10 text-white">
        {top && <p className="line-clamp-3 text-[13px] font-semibold leading-snug">“{top.text}”</p>}
        <p className="mt-1 text-[11px] text-white/75">
          {generation.captions.length} captions · {top && top.score > 0 ? `top +${top.score}` : "no votes yet"}
        </p>
      </div>
    </Link>
  );
}
