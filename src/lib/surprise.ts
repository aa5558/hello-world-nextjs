import type { SupabaseClient } from "@supabase/supabase-js";

// How many recent photos the dice can land on.
const POOL_SIZE = 300;
// How many recently shown photos "Try Another" avoids repeating.
export const SURPRISE_HISTORY = 8;

// Picks a random photo that's already public in the app for Surprise Me.
// Nothing is copied or generated: it just points at an existing post.
// Skips photos shown recently and, when there are others to choose from,
// the viewer's own photos (you can't surprise yourself).
export async function pickSurprisePhoto(
  supabase: SupabaseClient,
  { seen, userId }: { seen: string[]; userId?: string }
): Promise<string | null> {
  const { data } = await supabase
    .from("generations")
    .select("id, user_id")
    .order("created_at", { ascending: false })
    .limit(POOL_SIZE)
    .returns<{ id: string; user_id: string }[]>();

  const all = data ?? [];
  if (all.length === 0) return null;

  const pools = [
    all.filter((p) => !seen.includes(p.id) && p.user_id !== userId),
    all.filter((p) => !seen.includes(p.id)),
    // Everything has been seen: start over, but not on the same photo.
    all.filter((p) => p.id !== seen[seen.length - 1]),
    all,
  ];
  const pool = pools.find((p) => p.length > 0)!;
  return pool[Math.floor(Math.random() * pool.length)].id;
}
