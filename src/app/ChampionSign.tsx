import Link from "next/link";
import { getDailyWinner } from "@/lib/battles";
import { getChallengeDate, shiftDay } from "@/lib/captions";
import { createClient } from "@/lib/supabase/server";

// The latest champion of a finished round, as a small sign inside the
// arena. Streamed in separately so it never delays the title screen; looks
// back one day at a time and stops at the first round with a winner.
export async function ChampionSign() {
  const supabase = await createClient();
  const today = getChallengeDate();
  for (let d = 1; d <= 7; d++) {
    const w = await getDailyWinner(supabase, shiftDay(today, -d));
    if (w) {
      return (
        <Link href="/results?show=champion" className="chip-neon glow-gold mt-8 max-w-[90vw] sm:mt-10">
          <span className="tube glow-gold shrink-0 text-[10px]">Latest champion</span>
          <span className="truncate text-ink-2">“{w.text}”</span>
          <span aria-hidden>→</span>
        </Link>
      );
    }
  }
  return null;
}
