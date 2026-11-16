import type { SupabaseClient } from "@supabase/supabase-js";
import { getBattleResult, type BattleResult } from "@/lib/battles";
import { getChallengeDate } from "@/lib/captions";
import type { FeedGeneration } from "@/lib/feed";

// Final results only exist for finished challenge days; fetch them for the
// memes that have one (a handful of small calls).
export async function loadResults(
  supabase: SupabaseClient,
  generations: FeedGeneration[]
) {
  const today = getChallengeDate();
  const finished = generations.filter((g) => g.challengeDate < today).slice(0, 40);
  const pairs = await Promise.all(
    finished.map(async (g) => [g.id, await getBattleResult(supabase, g.id)] as const)
  );
  const results: Record<string, BattleResult> = {};
  for (const [id, result] of pairs) if (result) results[id] = result;
  return results;
}

