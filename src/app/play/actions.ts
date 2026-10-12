"use server";

import { getGuessRound, type GuessResult, type GuessRound } from "@/lib/guess";
import { createClient } from "@/lib/supabase/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// No sign-in needed: the game only uses captions from finished challenge
// days, which the database is willing to reveal to anyone.
export async function nextGuessRound(
  exclude: string[]
): Promise<GuessRound | null> {
  const ids = exclude.filter((id) => UUID_PATTERN.test(id)).slice(-50);
  const supabase = await createClient();
  return getGuessRound(supabase, ids);
}

export async function checkGuess(
  captionId: string,
  guess: "ai" | "human"
): Promise<GuessResult | null> {
  if (!UUID_PATTERN.test(captionId) || !["ai", "human"].includes(guess)) {
    return null;
  }
  const supabase = await createClient();
  const { data } = await supabase.rpc("check_guess", {
    p_caption_id: captionId,
    p_guess: guess,
  });
  const row = (
    data as
      | {
          correct: boolean;
          author_type: "ai" | "human";
          author_name: string | null;
          score: number;
        }[]
      | null
  )?.[0];
  if (!row) return null;
  return {
    correct: row.correct,
    authorType: row.author_type,
    authorName: row.author_name,
    score: row.score,
  };
}
