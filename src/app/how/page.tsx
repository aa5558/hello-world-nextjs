import type { Metadata } from "next";
import Link from "next/link";
import { SampleMeme } from "@/app/components/SampleMeme";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "How to play · Caption Wars",
  description: "How a Caption Wars round works: post a photo, the AI writes captions, everyone votes blind, the top caption at midnight wins.",
};

const RULES: { title: string; body: string; glow: string }[] = [
  { title: "One round a day", body: "Each round runs midnight to midnight, New York time, with its own prompt. The clock on Results counts down to the next bell.", glow: "glow-cyan" },
  { title: "Create", body: "Show it a campus moment, pick a caption style, add context if you like. Gemini writes four captions and your meme is posted with them.", glow: "glow-pink" },
  { title: "Write your own", body: "Think you're funnier than the AI? Add your caption to any photo, in the Gallery or at the Open mic.", glow: "glow-gold" },
  { title: "Vote blind", body: "Captions show no author. Vote first; then you find out whether a classmate or the AI wrote it.", glow: "glow-violet" },
  { title: "Win the round", body: "The highest net score at the bell wins (ties: more upvotes, then whoever posted first). The champion gets the full ceremony on Results.", glow: "glow-green" },
];

// How the game works, open to everyone (no sign-in needed).
export default async function HowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const createHref = user ? "/create" : "/login?next=/create";

  return (
    <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-4xl flex-col items-center gap-10 px-5 pb-16 pt-24 text-center sm:px-8">
      <header className="flex flex-col items-center gap-3">
        <p className="tube glow-gold text-xs">How to play</p>
        <h1 className="fight glow-pink text-[clamp(2.4rem,9vw,5rem)]">Caption Wars</h1>
        <p className="max-w-lg text-lg text-ink-2">May the funniest caption win. Here&apos;s the whole game in a minute.</p>
      </header>

      <ol className="grid w-full gap-3 text-left sm:grid-cols-2">
        {RULES.map((r, i) => (
          <li key={r.title} className={`panel ${i === 0 ? "sm:col-span-2" : ""} rounded-[22px] p-5`}>
            <p className={`tube ${r.glow} text-xs`}>
              {i + 1} · {r.title}
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{r.body}</p>
          </li>
        ))}
      </ol>

      <section aria-label="Open to everyone vs. members" className="grid w-full gap-3 text-left sm:grid-cols-2">
        <div className="panel lit glow-cyan rounded-[22px] p-5">
          <p className="tube glow-cyan text-xs">Open to everyone</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">Browse every meme and caption, see today&apos;s challenge and countdown, the standings and past champions, and play Human or AI?</p>
        </div>
        <div className="panel lit glow-pink rounded-[22px] p-5">
          <p className="tube glow-pink text-xs">With Google sign-in</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-2">Create memes with Gemini, upload photos, write captions, vote, and edit or delete your own posts and captions from Backstage.</p>
        </div>
      </section>

      <SampleMeme createHref={createHref} compact />

      <p className="flex flex-wrap justify-center gap-4 text-sm">
        <Link href="/play" className="chip-neon glow-cyan">
          to the arena
        </Link>
        <Link href="/results" className="chip-neon glow-gold">
          see the standings
        </Link>
      </p>
    </main>
  );
}
