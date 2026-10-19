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
  if (!reveal) {
    return <span className="chip bg-powder text-ink-2">👀 human or AI?</span>;
  }

  const motion = animate ? " animate-reveal" : "";

  if (reveal.authorType === "ai") {
    return <span className={`chip bg-ai-soft text-ai-ink${motion}`}>🤖 Gemini</span>;
  }

  return (
    <span className={`chip bg-human-soft text-human-ink${motion}`}>
      🧑‍🎓 {reveal.isMine ? "you" : (reveal.authorName ?? "a human")}
    </span>
  );
}
