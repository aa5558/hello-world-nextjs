import type { MyCaption } from "@/lib/battles";
import type { FeedGeneration } from "@/lib/feed";

// "Your Meme Era": a personal headline and achievements, all computed from
// the user's own posts, captions, and votes. Nothing is estimated.

const ERAS: Record<string, { name: string; emoji: string }> = {
  midwest: { name: "Ope era", emoji: "🌽" },
  online: { name: "Chronically online era", emoji: "📱" },
  columbia: { name: "Core Curriculum era", emoji: "🦁" },
  newyorker: { name: "Unbothered New Yorker era", emoji: "🗽" },
};

export function getEra(photos: FeedGeneration[], captions: MyCaption[]) {
  const counts = new Map<string, number>();
  photos.forEach((p) => counts.set(p.vibe, (counts.get(p.vibe) ?? 0) + 1));
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && ERAS[top[0]]) return { ...ERAS[top[0]], basis: `your go-to AI voice on ${top[1]} ${top[1] === 1 ? "post" : "posts"}` };
  if (captions.length) return { name: "Caption sniper era", emoji: "🎯", basis: "all captions, no photos (yet)" };
  return { name: "Era loading…", emoji: "✨", basis: "post or caption something to find out" };
}

export type Achievement = { key: string; emoji: string; title: string; body: string; unlocked: boolean; progress: string };

export function getAchievements(photos: FeedGeneration[], captions: MyCaption[], votesCast: number): Achievement[] {
  const days = new Set([
    ...photos.map((p) => p.challengeDate),
    ...captions.map((c) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(c.createdAt))),
  ]);
  const vibes = new Set(photos.map((p) => p.vibe));
  const wins = captions.filter((c) => c.rank === 1 && c.score > 0).length;
  const best = Math.max(0, ...captions.map((c) => c.score));

  const make = (key: string, emoji: string, title: string, body: string, have: number, need: number): Achievement => ({
    key, emoji, title, body, unlocked: have >= need, progress: `${Math.min(have, need)}/${need}`,
  });

  return [
    make("first-post", "📸", "First drop", "Post your first photo.", photos.length, 1),
    make("first-caption", "✍️", "In the ring", "Write your first caption.", captions.length, 1),
    make("beat-ai", "🥊", "Beat the machine", "Have the #1 caption on a photo.", wins, 1),
    make("crowd-favorite", "🔥", "Crowd favorite", "Get a caption to +5.", best, 5),
    make("regular", "📅", "Regular", "Show up on 3 different days.", days.size, 3),
    make("range", "🎭", "Range", "Post with 3 different AI voices.", vibes.size, 3),
    make("ballot-box", "🗳️", "Ballot box", "Cast 25 votes.", votesCast, 25),
  ];
}
