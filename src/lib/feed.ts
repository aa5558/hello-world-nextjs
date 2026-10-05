import type { SupabaseClient } from "@supabase/supabase-js";

export type FeedCaption = {
  id: string;
  text: string;
  upvotes: number;
  downvotes: number;
  score: number;
  myVote: -1 | 0 | 1;
};

export type FeedGeneration = {
  id: string;
  userId: string;
  imageUrl: string;
  context: string | null;
  vibe: string;
  dailyPrompt: string | null;
  createdAt: string;
  captions: FeedCaption[];
  topScore: number;
};

type GenerationRow = {
  id: string;
  user_id: string;
  image_path: string;
  context: string | null;
  vibe: string;
  daily_prompt: string | null;
  created_at: string;
  captions: Omit<FeedCaption, "myVote">[];
};

const GENERATION_COLUMNS =
  "id, user_id, image_path, context, vibe, daily_prompt, created_at, captions(id, text, upvotes, downvotes, score)";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type FeedSort = "new" | "top";

// Loads generations with their captions, plus the signed-in user's own
// votes (RLS only returns the caller's rows from caption_votes).
export async function getFeed(
  supabase: SupabaseClient,
  { sort, id, userId }: { sort?: FeedSort; id?: string; userId?: string }
): Promise<{ generations: FeedGeneration[]; error?: string }> {
  let query = supabase
    .from("generations")
    .select(GENERATION_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(60);

  if (id) {
    query = query.eq("id", id);
  } else if (sort === "top") {
    query = query.gte("created_at", new Date(Date.now() - WEEK_MS).toISOString());
  }

  const { data, error } = await query.returns<GenerationRow[]>();
  if (error) {
    return { generations: [], error: error.message };
  }

  const rows = data ?? [];
  const captionIds = rows.flatMap((row) => row.captions.map((c) => c.id));

  const myVotes = new Map<string, -1 | 1>();
  if (userId && captionIds.length > 0) {
    const { data: votes } = await supabase
      .from("caption_votes")
      .select("caption_id, vote")
      .in("caption_id", captionIds)
      .returns<{ caption_id: string; vote: -1 | 1 }[]>();
    votes?.forEach((v) => myVotes.set(v.caption_id, v.vote));
  }

  const generations = rows.map((row) => {
    const captions = row.captions
      .map((c) => ({ ...c, myVote: myVotes.get(c.id) ?? 0 }) as FeedCaption)
      .sort((a, b) => b.score - a.score);

    return {
      id: row.id,
      userId: row.user_id,
      imageUrl: supabase.storage.from("generations").getPublicUrl(row.image_path)
        .data.publicUrl,
      context: row.context,
      vibe: row.vibe,
      dailyPrompt: row.daily_prompt,
      createdAt: row.created_at,
      captions,
      topScore: captions[0]?.score ?? 0,
    };
  });

  if (sort === "top") {
    generations.sort((a, b) => b.topScore - a.topScore);
  }

  return { generations };
}
