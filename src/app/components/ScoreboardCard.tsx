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
        ? "The people have spoken: humans are winning. For now."
        : aiWins > humanWins
          ? "Gemini is ahead. Humanity needs you 💀"
          : "Dead even. Your vote decides it.";

  return (
    <div className="card relative overflow-hidden p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-ice/50 blur-3xl"
      />
      <p className="eyebrow">the scoreboard · all time</p>
      <div className="relative mt-4 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-human-ink">🧑‍🎓 Humans</span>
          <span className="display text-6xl tabular-nums text-ink sm:text-7xl">{humanWins}</span>
        </div>
        <span className="serif pb-3 text-3xl text-ink-3">vs</span>
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold text-ai-ink">Gemini 🤖</span>
          <span className="display text-6xl tabular-nums text-ink sm:text-7xl">{aiWins}</span>
        </div>
      </div>
      <div
        className="relative mt-5 flex h-3 gap-[3px] overflow-hidden rounded-full"
        role="img"
        aria-label={`Humans have won ${humanWins} battles, Gemini ${aiWins}`}
      >
        <div className="rounded-l-full bg-human transition-all duration-700" style={{ width: `${humanShare}%` }} />
        <div className="flex-1 rounded-r-full bg-ai" />
      </div>
      <p className="relative mt-4 text-[15px] text-ink">
        {verdict}{" "}
        <span className="text-ink-3">
          ({battles} {battles === 1 ? "photo" : "photos"} with human challengers)
        </span>
      </p>
    </div>
  );
}
