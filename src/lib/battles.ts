import type { SupabaseClient } from "@supabase/supabase-js";
import {
  byScore,
  getCaptionViewerState,
  imageUrl,
  type FeedCaption,
} from "@/lib/feed";

export type Scoreboard = {
  humanWins: number;
  aiWins: number;
  battles: number;
};

// All-time Humans vs. Gemini tally. See battle_scoreboard() in the
// migration for how a photo is won.
export async function getScoreboard(
  supabase: SupabaseClient
): Promise<Scoreboard> {
  const { data } = await supabase.rpc("battle_scoreboard");
  const row = (data as { human_wins: number; ai_wins: number; battles: number }[] | null)?.[0];
  return {
    humanWins: row?.human_wins ?? 0,
    aiWins: row?.ai_wins ?? 0,
    battles: row?.battles ?? 0,
  };
}

export type DailyWinner = {
  captionId: string;
  text: string;
  score: number;
  authorType: "ai" | "human";
  authorName: string | null;
  generationId: string;
  imageUrl: string;
  dailyPrompt: string | null;
};

// The top caption from a finished challenge day, author revealed. Returns
// null for today (voting is still open) or if nobody upvoted anything.
export async function getDailyWinner(
  supabase: SupabaseClient,
  day: string
): Promise<DailyWinner | null> {
  const { data } = await supabase.rpc("daily_winner", { p_day: day });
  const row = (
    data as
      | {
          caption_id: string;
          text: string;
          score: number;
          author_type: "ai" | "human";
          author_name: string | null;
          generation_id: string;
          image_path: string;
          daily_prompt: string | null;
        }[]
      | null
  )?.[0];
  if (!row) return null;
  return {
    captionId: row.caption_id,
    text: row.text,
    score: row.score,
    authorType: row.author_type,
    authorName: row.author_name,
    generationId: row.generation_id,
    imageUrl: imageUrl(supabase, row.image_path),
    dailyPrompt: row.daily_prompt,
  };
}

export type LeaderboardEntry = FeedCaption & {
  generationId: string;
  imageUrl: string;
};

// Every caption on photos from one challenge day, best first. Authors stay
// hidden unless the viewer has earned the reveal.
export async function getLeaderboard(
  supabase: SupabaseClient,
  day: string,
  userId?: string
): Promise<{ entries: LeaderboardEntry[]; error?: string }> {
  const { data, error } = await supabase
    .from("captions")
    .select(
      "id, text, upvotes, downvotes, score, generation_id, generations!inner(image_path, challenge_date)"
    )
    .eq("generations.challenge_date", day)
    .order("score", { ascending: false })
    .limit(50)
    .returns<
      (Omit<FeedCaption, "myVote" | "reveal"> & {
        generation_id: string;
        generations: { image_path: string };
      })[]
    >();

  if (error) {
    return { entries: [], error: error.message };
  }

  const rows = data ?? [];
  const { myVotes, reveals } = await getCaptionViewerState(
    supabase,
    userId,
    rows.map((row) => row.id)
  );

  const entries = rows
    .map((row): LeaderboardEntry => ({
      id: row.id,
      text: row.text,
      upvotes: row.upvotes,
      downvotes: row.downvotes,
      score: row.score,
      myVote: myVotes.get(row.id) ?? 0,
      reveal: reveals.get(row.id) ?? null,
      generationId: row.generation_id,
      imageUrl: imageUrl(supabase, row.generations.image_path),
    }))
    .sort(byScore);

  return { entries };
}

export type MyCaption = {
  id: string;
  generationId: string;
  text: string;
  upvotes: number;
  downvotes: number;
  score: number;
  createdAt: string;
  imageUrl: string;
  rank: number;
  total: number;
};

// The signed-in user's own human-written captions, newest first.
export async function getMyCaptions(
  supabase: SupabaseClient
): Promise<MyCaption[]> {
  const { data } = await supabase.rpc("my_captions");
  const rows = (data ?? []) as {
    caption_id: string;
    generation_id: string;
    text: string;
    upvotes: number;
    downvotes: number;
    score: number;
    created_at: string;
    image_path: string;
    rank: number;
    total: number;
  }[];

  return rows.map((row) => ({
    id: row.caption_id,
    generationId: row.generation_id,
    text: row.text,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    score: row.score,
    createdAt: row.created_at,
    imageUrl: imageUrl(supabase, row.image_path),
    rank: row.rank,
    total: row.total,
  }));
}
