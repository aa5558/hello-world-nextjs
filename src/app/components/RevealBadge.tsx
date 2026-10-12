import type { Reveal } from "@/lib/feed";

// Shows who wrote a caption once the viewer has earned the reveal, or a
// "Human or AI?" teaser until then.
export function RevealBadge({
  reveal,
  animate = false,
}: {
  reveal: Reveal | null;
  animate?: boolean;
}) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold";

  if (!reveal) {
    return (
      <span
        className={`${base} bg-black/5 text-black/50 dark:bg-white/10 dark:text-white/50`}
      >
        ❓ Human or AI?
      </span>
    );
  }

  const motion = animate ? " animate-reveal" : "";

  if (reveal.authorType === "ai") {
    return (
      <span
        className={`${base} bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200${motion}`}
      >
        🤖 Gemini
      </span>
    );
  }

  return (
    <span
      className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200${motion}`}
    >
      🧑‍🎓 {reveal.isMine ? "You" : (reveal.authorName ?? "A human")}
    </span>
  );
}
