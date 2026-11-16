import type { Metadata } from "next";
import { getDailyWinner, getLeaderboard, getScoreboard } from "@/lib/battles";
import { getChallengeDate, getDailyPrompt, msUntilNextChallenge, shiftDay } from "@/lib/captions";
import { getFeed } from "@/lib/feed";
import { getDailyDrop } from "@/lib/library";
import { createClient } from "@/lib/supabase/server";
import { ResultsReveal } from "./ResultsReveal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Results · Morningside Memes",
  description: "Today's prompt, today's top captions, yesterday's winner, and Humans vs AI.",
};

// Results: the daily challenge and the leaderboard, revealed one step at a
// time. Every number comes from the database; authors appear only where the
// existing rules allow (your own captions, ones you voted on, finished days).
export default async function ResultsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = getChallengeDate();
  const [{ entries, error }, { generations: photos }, winner, scoreboard, drop] = await Promise.all([
    getLeaderboard(supabase, today, user?.id),
    getFeed(supabase, { day: today }),
    getDailyWinner(supabase, shiftDay(today, -1)),
    getScoreboard(supabase),
    getDailyDrop(supabase, today),
  ]);

  const createPath = drop ? `/create?image=${drop.id}` : "/create";

  return (
    <ResultsReveal
      prompt={getDailyPrompt(today)}
      msLeft={msUntilNextChallenge()}
      photosToday={photos.length}
      entries={entries}
      loadError={Boolean(error)}
      winner={winner}
      scoreboard={scoreboard}
      drop={drop ? { url: drop.url, alt: drop.altText, title: drop.title } : null}
      createHref={user ? createPath : `/login?next=${encodeURIComponent(createPath)}`}
    />
  );
}
