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
import { getFeed, type FeedSort } from "@/lib/feed";
import { getGuessRound } from "@/lib/guess";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABS: { sort: FeedSort; label: string }[] = [
  { sort: "new", label: "🆕 Fresh" },
  { sort: "top", label: "🔥 Top this week" },
];

const STEPS = [
  { n: "01", title: "Drop a photo", body: "Anything from campus life. Dining hall plates count." },
  { n: "02", title: "Let the AI cook", body: "Gemini writes four captions in the voice you pick." },
  { n: "03", title: "Vote blind", body: "Humans and AI, mixed together. Vote to reveal who wrote what." },
];

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const sort: FeedSort = searchParams.sort === "top" ? "top" : "new";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = getChallengeDate();
  const [{ generations, error }, scoreboard, yesterdayWinner, guessRound] =
    await Promise.all([
      getFeed(supabase, { sort, userId: user?.id }),
      getScoreboard(supabase),
      getDailyWinner(supabase, shiftDay(today, -1)),
      getGuessRound(supabase),
    ]);

  const postHref = user ? "/create" : "/login?next=/create";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 pt-8 sm:px-6 sm:pt-14">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="animate-fade-up flex flex-col items-start gap-6">
          <span className="chip glass py-1.5 pl-2 pr-3 text-ink-2">
            <span className="animate-pulse-dot h-2 w-2 rounded-full bg-sky" aria-hidden />
            live on morningside heights
          </span>
          <h1 className="display text-[3.1rem] text-ink sm:text-7xl lg:text-[5.4rem]">
            Your humor.
            <br />
            Our AI.
            <br />
            Let&apos;s see who&apos;s <span className="serif text-[1.08em] text-sky-deep">funnier.</span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-ink-2">
            Upload a photo, let AI do its thing, and see whose caption wins.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={postHref} className="btn btn-primary btn-lg">
              Let&apos;s make something iconic <Icon name="arrow" className="h-5 w-5" />
            </Link>
            {user ? (
              <Link href="/surprise" className="btn btn-ghost btn-lg">
                🎲 Surprise me
              </Link>
            ) : (
              <a href="#guess" className="btn btn-ghost btn-lg">
                🎯 Play Human or AI?
              </a>
            )}
          </div>
        </div>
        <div className="animate-fade-up relative [animation-delay:120ms]">
          <span aria-hidden className="animate-float absolute -left-4 -top-6 z-10 text-4xl drop-shadow-sm sm:-left-8">
            🧑‍🎓
          </span>
          <span aria-hidden className="animate-float absolute -bottom-5 -right-2 z-10 text-4xl drop-shadow-sm [animation-delay:-3s]">
            🤖
          </span>
          <ScoreboardCard scoreboard={scoreboard} />
        </div>
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

      {/* Bento: today's challenge + surprise me */}
      <section className="grid gap-4 md:grid-cols-5">
        <Link
          href="/challenge"
          className="lift group relative flex min-h-64 flex-col justify-between gap-6 overflow-hidden rounded-[32px] bg-ice p-6 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:p-8 md:col-span-3"
        >
          <span aria-hidden className="absolute -right-8 -top-10 h-56 w-56 rounded-full bg-white/50 blur-2xl" />
          <span aria-hidden className="absolute -bottom-6 right-6 text-[7rem] leading-none opacity-90 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105">
            📸
          </span>
          <div className="relative flex flex-wrap items-center gap-2">
            <span className="chip bg-white/70 text-ink">today&apos;s challenge</span>
            <span className="chip bg-ink text-white">
              ⏳ <Countdown initialMs={msUntilNextChallenge()} /> left
            </span>
          </div>
          <div className="relative flex max-w-md flex-col gap-3">
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
              See the leaderboard
              <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>

        <Link
          href="/surprise"
          className="card lift group relative flex flex-col justify-between gap-6 overflow-hidden p-6 sm:p-8 md:col-span-2"
        >
          <span className="orb flex h-16 w-16 items-center justify-center rounded-[22px] text-3xl transition-transform duration-500 group-hover:rotate-12">
            🎲
          </span>
          <div className="flex flex-col gap-2">
            <p className="display text-3xl">
              Surprise <span className="serif text-4xl">me</span>
            </p>
            <p className="text-sm leading-relaxed text-ink-2">
              No photo? Roll a random one from around campus and out-write Gemini on it.
            </p>
            <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold">
              Roll the dice <Icon name="arrow" className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </section>

      {!user && (
        <div className="mx-auto w-full max-w-3xl">
          <GuessGame initialRound={guessRound} signedIn={false} />
        </div>
      )}

      {/* Feed */}
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
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
            <div className="flex items-center gap-2">
              <nav aria-label="Sort" className="flex gap-1 rounded-full bg-powder/80 p-1 text-sm">
                {TABS.map((tab) => (
                  <Link
                    key={tab.sort}
                    href={tab.sort === "new" ? "/" : `/?sort=${tab.sort}`}
                    aria-current={tab.sort === sort ? "page" : undefined}
                    className={`rounded-full px-3.5 py-1.5 font-medium transition ${
                      tab.sort === sort
                        ? "bg-white text-ink shadow-[0_2px_8px_-2px_rgba(22,38,61,0.18)]"
                        : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    {tab.label}
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

          {generations.map((generation) => (
            <GenerationCard
              key={generation.id}
              generation={generation}
              currentUserId={user?.id}
            />
          ))}
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          {user && <GuessGame initialRound={guessRound} signedIn />}
          <div className="card flex flex-col gap-3 p-5">
            <p className="eyebrow">got a photo?</p>
            <p className="display text-2xl">
              Your meme era <span className="serif">starts here.</span>
            </p>
            <p className="text-sm text-ink-2">Post it, let Gemini take four swings, then try to beat it.</p>
            <Link href={postHref} className="btn btn-ice mt-1 self-start">
              + Post a photo
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
