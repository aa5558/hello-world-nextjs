import type { SupabaseClient } from "@supabase/supabase-js";
import { getDailyWinner } from "@/lib/battles";
import { getChallengeDate, shiftDay } from "@/lib/captions";

export type Champion = {
  day: string;
  prompt: string | null;
  captionId: string;
  generationId: string;
  text: string;
  imageUrl: string;
  authorType: "ai" | "human";
  authorName: string | null;
  score: number;
  upvotes: number;
  downvotes: number;
  // Another caption had the same score and upvotes; the database's final
  // tiebreak (earlier post wins) decided it.
  wonOnTiebreak: boolean;
};

// Winners of the most recent finished rounds (newest first), straight from
// daily_winner(), which only answers for finished days and only when a
// caption actually got upvoted. Vote counts come from the caption's public
// tallies. Nothing is invented: rounds without a winner are simply absent.
export async function getRecentChampions(supabase: SupabaseClient, days = 7): Promise<Champion[]> {
  const today = getChallengeDate();
  const dayList = Array.from({ length: days }, (_, i) => shiftDay(today, -(i + 1)));
  const winners = await Promise.all(dayList.map(async (day) => ({ day, w: await getDailyWinner(supabase, day) })));
  const found = winners.filter((x): x is { day: string; w: NonNullable<typeof x.w> } => x.w !== null);
  if (found.length === 0) return [];

  const { data: tallies } = await supabase
    .from("captions")
    .select("id, upvotes, downvotes")
    .in("id", found.map((x) => x.w.captionId))
    .returns<{ id: string; upvotes: number; downvotes: number }[]>();
  const byId = new Map((tallies ?? []).map((t) => [t.id, t]));

  return Promise.all(
    found.map(async ({ day, w }) => {
      const t = byId.get(w.captionId);
      const upvotes = t?.upvotes ?? 0;
      // Was it a tie on the public keys (score and upvotes)?
      const { count } = await supabase
        .from("captions")
        .select("id, generations!inner(challenge_date)", { count: "exact", head: true })
        .eq("generations.challenge_date", day)
        .eq("score", w.score)
        .eq("upvotes", upvotes);
      return {
        day,
        prompt: w.dailyPrompt,
        captionId: w.captionId,
        generationId: w.generationId,
        text: w.text,
        imageUrl: w.imageUrl,
        authorType: w.authorType,
        authorName: w.authorName,
        score: w.score,
        upvotes,
        downvotes: t?.downvotes ?? 0,
        wonOnTiebreak: (count ?? 0) > 1,
      };
    })
  );
}

export function prettyDay(day: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}
