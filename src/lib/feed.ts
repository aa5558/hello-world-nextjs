import type { SupabaseClient } from "@supabase/supabase-js";

// Who wrote a caption. Only known once the viewer has voted on it, wrote it,
// or owns the photo; the database never sends it otherwise.
export type Reveal = {
  authorType: "ai" | "human";
  authorName: string | null;
  isMine: boolean;
};

export type FeedCaption = {
  id: string;
  text: string;
  upvotes: number;
  downvotes: number;
  score: number;
  myVote: -1 | 0 | 1;
  reveal: Reveal | null;
};

export type FeedGeneration = {
  id: string;
  userId: string;
  imageUrl: string;
  imageSource: "upload" | "ai";
  imagePrompt: string | null;
  context: string | null;
  vibe: string;
  dailyPrompt: string | null;
  challengeDate: string;
  createdAt: string;
  captions: FeedCaption[];
  topScore: number;
};

type GenerationRow = {
  id: string;
  user_id: string;
  image_path: string;
  image_source: "upload" | "ai";
  image_prompt: string | null;
  context: string | null;
  vibe: string;
  daily_prompt: string | null;
  challenge_date: string;
  created_at: string;
  captions: Omit<FeedCaption, "myVote" | "reveal">[];
};

type RevealRow = {
  caption_id: string;
  author_type: "ai" | "human";
  author_name: string | null;
  is_mine: boolean;
};

const GENERATION_COLUMNS =
  "id, user_id, image_path, image_source, image_prompt, context, vibe, daily_prompt, challenge_date, created_at, captions(id, text, upvotes, downvotes, score)";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type FeedSort = "new" | "top";

export function imageUrl(supabase: SupabaseClient, imagePath: string) {
  return supabase.storage.from("generations").getPublicUrl(imagePath).data
    .publicUrl;
}

// Highest score first. Ties are broken by the (random) caption id rather
// than insertion order, so human captions added later don't always sink to
// the bottom and give themselves away.
export function byScore(a: { score: number; id: string }, b: { score: number; id: string }) {
  return b.score - a.score || a.id.localeCompare(b.id);
}

// The signed-in user's votes and the authors they're allowed to see for a
// set of captions. Both come back empty for signed-out visitors.
export async function getCaptionViewerState(
  supabase: SupabaseClient,
  userId: string | undefined,
  captionIds: string[]
) {
  const myVotes = new Map<string, -1 | 1>();
  const reveals = new Map<string, Reveal>();
  if (!userId || captionIds.length === 0) {
    return { myVotes, reveals };
  }

  const [{ data: votes }, { data: revealData }] = await Promise.all([
    supabase
      .from("caption_votes")
      .select("caption_id, vote")
      .in("caption_id", captionIds)
      .returns<{ caption_id: string; vote: -1 | 1 }[]>(),
    supabase.rpc("caption_reveals", { p_caption_ids: captionIds }),
  ]);
  const revealRows = (revealData ?? []) as RevealRow[];

  votes?.forEach((v) => myVotes.set(v.caption_id, v.vote));
  revealRows.forEach((r) =>
    reveals.set(r.caption_id, {
      authorType: r.author_type,
      authorName: r.author_name,
      isMine: r.is_mine,
    })
  );
  return { myVotes, reveals };
}

// Loads generations with their captions, plus the signed-in user's own
// votes and reveals.
export async function getFeed(
  supabase: SupabaseClient,
  {
    sort,
    id,
    userId,
    ownerId,
    day,
  }: {
    sort?: FeedSort;
    id?: string;
    userId?: string;
    ownerId?: string;
    day?: string;
  }
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
  if (ownerId) {
    query = query.eq("user_id", ownerId);
  }
  if (day) {
    query = query.eq("challenge_date", day);
  }

  const { data, error } = await query.returns<GenerationRow[]>();
  if (error) {
    return { generations: [], error: error.message };
  }

  const rows = data ?? [];
  const { myVotes, reveals } = await getCaptionViewerState(
    supabase,
    userId,
    rows.flatMap((row) => row.captions.map((c) => c.id))
  );

  const generations = rows.map((row) => {
    const captions: FeedCaption[] = row.captions
      .map((c): FeedCaption => ({
        ...c,
        myVote: myVotes.get(c.id) ?? 0,
        reveal: reveals.get(c.id) ?? null,
      }))
      .sort(byScore);

    return {
      id: row.id,
      userId: row.user_id,
      imageUrl: imageUrl(supabase, row.image_path),
      imageSource: row.image_source,
      imagePrompt: row.image_prompt,
      context: row.context,
      vibe: row.vibe,
      dailyPrompt: row.daily_prompt,
      challengeDate: row.challenge_date,
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
