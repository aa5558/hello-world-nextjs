import type { SupabaseClient } from "@supabase/supabase-js";
import { imageUrl } from "@/lib/feed";

export type GuessRound = {
  captionId: string;
  text: string;
  imageUrl: string;
  generationId: string;
};

export type GuessResult = {
  correct: boolean;
  authorType: "ai" | "human";
  authorName: string | null;
  score: number;
};

// A random caption from a finished challenge day for the "Human or AI?"
// game, skipping ones already shown. Works for signed-out visitors.
export async function getGuessRound(
  supabase: SupabaseClient,
  exclude: string[] = []
): Promise<GuessRound | null> {
  const { data } = await supabase.rpc("guess_round", { p_exclude: exclude });
  const row = (
    data as
      | { caption_id: string; text: string; image_path: string; generation_id: string }[]
      | null
  )?.[0];
  if (!row) return null;
  return {
    captionId: row.caption_id,
    text: row.text,
    imageUrl: imageUrl(supabase, row.image_path),
    generationId: row.generation_id,
  };
}
