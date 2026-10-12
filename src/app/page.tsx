import Link from "next/link";
import { Countdown } from "@/app/components/Countdown";
import { GenerationCard } from "@/app/components/GenerationCard";
import { GuessGame } from "@/app/components/GuessGame";
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
  { sort: "new", label: "🆕 New" },
  { sort: "top", label: "🔥 Top this week" },
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

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-navy/70 dark:text-columbia/80">
            Humans vs. AI caption battles
          </p>
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            Can Columbia students be funnier than AI?
          </h1>
          <p className="text-black/60 dark:text-white/60">
            Every photo gets 4 captions from Gemini. Add your own, vote blind,
            then see who really wrote each one.
          </p>
        </div>
        <ScoreboardCard scoreboard={scoreboard} />
      </section>

      {!user && (
        <section className="flex flex-col gap-2 rounded-2xl bg-columbia/40 p-4 text-navy dark:bg-columbia/10 dark:text-columbia">
          <p className="font-semibold">👋 Just looking around? You can:</p>
          <ul className="flex flex-col gap-1 text-sm">
            <li>🎯 Play <span className="font-semibold">Human or AI?</span> right below, no account needed</li>
            <li>📊 Browse every battle and today&apos;s leaderboard</li>
            <li>
              ✍️{" "}
              <Link href="/login" className="font-semibold underline">
                Sign in with Google
              </Link>{" "}
              to vote, reveal authors, and write your own captions
            </li>
          </ul>
        </section>
      )}

      {!user && <GuessGame initialRound={guessRound} signedIn={false} />}

      <Link
        href="/challenge"
        className="group relative flex flex-col gap-2 overflow-hidden rounded-2xl bg-navy p-5 text-white shadow-md transition active:scale-[0.99]"
      >
        <span className="absolute -right-6 -top-6 text-8xl opacity-15" aria-hidden>
          📸
        </span>
        <span className="text-xs font-bold uppercase tracking-widest text-columbia">
          Today&apos;s challenge · <Countdown initialMs={msUntilNextChallenge()} /> left
        </span>
        <span className="text-2xl font-bold leading-snug">{getDailyPrompt(today)}</span>
        {yesterdayWinner && (
          <span className="text-sm text-white/75">
            🏆 Yesterday:{" "}
            {yesterdayWinner.authorType === "human"
              ? `${yesterdayWinner.authorName ?? "a human"} beat the AI`
              : "Gemini took the crown"}
          </span>
        )}
        <span className="mt-1 self-start rounded-full bg-columbia px-4 py-1.5 text-sm font-semibold text-navy group-hover:bg-white">
          See the leaderboard →
        </span>
      </Link>

      <Link
        href="/surprise"
        className="flex items-center gap-4 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5 transition hover:ring-black/15 active:scale-[0.99] dark:ring-white/10 dark:hover:ring-white/25"
      >
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy to-indigo-700 text-2xl"
          aria-hidden
        >
          🎲
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-bold">Surprise Me</span>
          <span className="text-sm text-black/60 dark:text-white/60">
            Roll a random campus photo and out-write Gemini on it. No photo needed.
          </span>
        </span>
        <span className="ml-auto shrink-0 font-semibold text-navy dark:text-columbia">→</span>
      </Link>

      {user && <GuessGame initialRound={guessRound} signedIn />}

      <div className="flex items-center justify-between gap-2">
        <nav className="flex gap-2 text-sm">
          {TABS.map((tab) => (
            <Link
              key={tab.sort}
              href={tab.sort === "new" ? "/" : `/?sort=${tab.sort}`}
              className={`rounded-full px-3 py-1.5 font-medium ${
                tab.sort === sort
                  ? "bg-navy text-white dark:bg-columbia dark:text-navy"
                  : "bg-surface ring-1 ring-black/10 dark:ring-white/15"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <Link
          href={user ? "/create" : "/login?next=/create"}
          className="hidden rounded-full bg-navy px-4 py-1.5 text-sm font-semibold text-white sm:block dark:bg-columbia dark:text-navy"
        >
          + Post a photo
        </Link>
      </div>

      {error && (
        <p className="text-red-600">Error loading the feed: {error}</p>
      )}

      {!error && generations.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-8 text-center ring-1 ring-black/5 dark:ring-white/10">
          <p className="text-black/60 dark:text-white/60">
            {sort === "top"
              ? "No photos this week yet."
              : "Nothing here yet. Be the first to post today."}
          </p>
          <Link
            href={user ? "/create" : "/login?next=/create"}
            className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white"
          >
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
    </main>
  );
}
