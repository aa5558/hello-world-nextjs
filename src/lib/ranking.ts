// Standings for a round, using the same order the database uses to pick a
// winner (daily_winner: net score, then upvotes, then whoever posted first).
// The first two keys are public, so live standings use them; captions equal
// on both share a place ("tied"). The final tiebreak (earlier post wins) is
// applied by the database when the round ends, and the reveal says so.

export type Ranked<T> = T & { place: number; tied: boolean };

type Scored = { score: number; upvotes: number; downvotes: number };

export function rankEntries<T extends Scored>(entries: T[]): Ranked<T>[] {
  const sorted = [...entries].sort((a, b) => b.score - a.score || b.upvotes - a.upvotes);
  const ranked: Ranked<T>[] = [];
  sorted.forEach((entry, i) => {
    const prev = sorted[i - 1];
    const same = prev && prev.score === entry.score && prev.upvotes === entry.upvotes;
    const place = same ? ranked[i - 1].place : i + 1;
    ranked.push({ ...entry, place, tied: false });
  });
  for (const r of ranked) r.tied = ranked.filter((o) => o.place === r.place).length > 1;
  return ranked;
}

// Only captions with at least one vote can stand on the podium.
export function podium<T extends Scored>(ranked: Ranked<T>[]) {
  return ranked.filter((r) => r.upvotes + r.downvotes > 0 && r.score > 0).slice(0, 3);
}

export function ordinal(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}
