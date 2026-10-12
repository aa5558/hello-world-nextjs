import type { Scoreboard } from "@/lib/battles";

// The all-time Humans vs. Gemini score, the app's headline question.
export function ScoreboardCard({ scoreboard }: { scoreboard: Scoreboard }) {
  const { humanWins, aiWins, battles } = scoreboard;
  const decided = humanWins + aiWins;
  const humanShare = decided === 0 ? 50 : Math.round((humanWins / decided) * 100);

  const verdict =
    battles === 0
      ? "No humans have entered yet. Be the first to take on Gemini."
      : humanWins > aiWins
        ? "Columbia is winning. For now."
        : aiWins > humanWins
          ? "Gemini is ahead. Humanity needs you."
          : "Dead even. Your vote could decide it.";

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-black/5 dark:ring-white/10">
      <div className="flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            🧑‍🎓 Humans
          </span>
          <span className="text-3xl font-black tabular-nums">{humanWins}</span>
        </div>
        <span className="pb-1 text-sm font-semibold text-black/40 dark:text-white/40">
          vs
        </span>
        <div className="flex flex-col items-end">
          <span className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            Gemini 🤖
          </span>
          <span className="text-3xl font-black tabular-nums">{aiWins}</span>
        </div>
      </div>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-violet-500"
        role="img"
        aria-label={`Humans have won ${humanWins} battles, Gemini ${aiWins}`}
      >
        <div
          className="bg-emerald-500 transition-all"
          style={{ width: `${humanShare}%` }}
        />
      </div>
      <p className="text-sm text-black/60 dark:text-white/60">
        {verdict}{" "}
        <span className="text-black/40 dark:text-white/40">
          ({battles} {battles === 1 ? "photo" : "photos"} with human challengers)
        </span>
      </p>
    </div>
  );
}
