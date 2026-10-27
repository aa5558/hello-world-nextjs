import type { BattleResult } from "@/lib/battles";

const HEADLINES: Record<BattleResult["winner"], [string, string]> = {
  human: ["Humans win this one.", "Human humor hits different 🎉"],
  ai: ["Gemini took it.", "The AI cooked. Get it back today."],
  tie: ["Dead heat.", "Nobody pulled ahead. Respect."],
  no_contest: ["No humans showed up.", "Gemini won by default. That's on us."],
};

// The final score for a finished battle, best human caption vs best AI one.
export function BattleResultCard({ result }: { result: BattleResult }) {
  const human = Math.max(result.bestHuman ?? 0, 0);
  const ai = Math.max(result.bestAi ?? 0, 0);
  const total = human + ai;
  const humanShare = total === 0 ? 50 : Math.round((human / total) * 100);
  const [headline, sub] = HEADLINES[result.winner];

  return (
    <section aria-label="Final result" className="card animate-pop relative overflow-hidden p-5">
      <span aria-hidden className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-butter/70 blur-2xl" />
      <p className="eyebrow relative">final result · voting closed</p>
      <p className="display relative mt-2 text-3xl">
        {result.winner === "human" ? "🏆 " : result.winner === "ai" ? "🤖 " : ""}
        {headline}
      </p>
      <p className="relative text-sm text-ink-2">{sub}</p>
      {result.winner !== "no_contest" && (
        <div className="relative mt-4">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-human-ink">Best human caption · +{human}</span>
            <span className="text-ai-ink">+{ai} · Best Gemini caption</span>
          </div>
          <div
            role="img"
            aria-label={`Best human caption scored ${human}, best Gemini caption scored ${ai}`}
            className="mt-1.5 flex h-3 gap-[3px] overflow-hidden rounded-full"
          >
            <div className="meter-grow rounded-l-full bg-human" style={{ width: `${humanShare}%` }} />
            <div className="flex-1 rounded-r-full bg-ai" />
          </div>
          <p className="mt-2 text-xs text-ink-3">
            {result.humanCaptions} human vs {result.aiCaptions} Gemini captions entered
          </p>
        </div>
      )}
    </section>
  );
}
