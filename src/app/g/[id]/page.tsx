import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "@/app/components/Sparkles";
import { Ink } from "@/app/components/ui";
import { ExploreDeck } from "@/app/explore/ExploreDeck";
import { loadResults } from "@/lib/results";
import { getFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadGeneration(id: string, userId?: string) {
  if (!UUID_PATTERN.test(id)) return null;
  const supabase = await createClient();
  const { generations } = await getFeed(supabase, { id, userId });
  return generations[0] ?? null;
}

// Link previews (iMessage, GroupMe, Instagram DMs) show the photo and the
// current top caption, so shared posts pull people back to vote.
export async function generateMetadata(
  props: PageProps<"/g/[id]">
): Promise<Metadata> {
  const { id } = await props.params;
  const generation = await loadGeneration(id);
  if (!generation) return {};

  const title = generation.captions[0]?.text ?? "Morningside Memes";
  return {
    title,
    description: "Human or AI? Vote on the funniest caption and find out who wrote it.",
    openGraph: { title, images: [generation.imageUrl] },
  };
}

export default async function GenerationPage(props: PageProps<"/g/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const generation = await loadGeneration(id, user?.id);
  if (!generation) notFound();
  const isMine = generation.userId === user?.id;
  const justPosted = isMine && searchParams.new === "1";

  // Just posted. The AI's captions were written and the meme published in
  // one step on the server, so this reveals them; there is nothing to pick.
  if (justPosted) {
    return (
      <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col items-center justify-center gap-7 px-5 pb-12 pt-24 text-center sm:px-8">
        <h1 className="word text-6xl sm:text-8xl">
          <Ink text="Your meme is live." />
        </h1>
        <div className="rise relative" style={{ animationDelay: "250ms" }}>
          <Sparkles />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={generation.imageUrl}
            alt={generation.context ?? "Your photo"}
            className="max-h-[32svh] w-auto max-w-full rounded-[28px] object-contain shadow-[0_40px_80px_-40px_rgba(22,21,20,0.45)]"
          />
        </div>
        <p className="rise text-sm text-ink-3" style={{ animationDelay: "400ms" }}>
          The AI wrote {generation.captions.length} captions, and they&apos;re posted with it.
        </p>
        <ul aria-label="Captions on your meme" className="flex w-full max-w-xl flex-col gap-2 text-left">
          {generation.captions.map((caption, i) => (
            <li
              key={caption.id}
              className="rise relative flex items-start justify-between gap-4 rounded-[20px] bg-white px-5 py-4 ring-1 ring-line"
              style={{ animationDelay: `${600 + i * 260}ms` }}
            >
              <span className="text-[17px] leading-snug text-ink">“{caption.text}”</span>
              <span className="shrink-0 pt-1 text-xs font-medium text-ai-ink">
                {caption.reveal?.authorType === "human" ? "you" : "AI"}
              </span>
            </li>
          ))}
        </ul>
        <p className="rise max-w-sm text-sm text-ink-3" style={{ animationDelay: `${700 + generation.captions.length * 260}ms` }}>
          Classmates vote on them blind, next to any captions they add.
        </p>
        <div className="rise flex flex-col items-center gap-3" style={{ animationDelay: `${800 + generation.captions.length * 260}ms` }}>
          <Link
            href="/play"
            className="group inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-lg font-medium text-white transition hover:scale-[1.03] active:scale-[0.97]"
          >
            Want to play? <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link href={`/g/${generation.id}`} className="text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline">
            see it in explore, or write your own caption for it
          </Link>
        </div>
      </main>
    );
  }

  // Otherwise: Explore, opened on this meme (so shared links land here).
  const { generations } = await getFeed(supabase, { userId: user?.id });
  const items = generations.some((g) => g.id === generation.id) ? generations : [generation, ...generations];
  const results = await loadResults(supabase, items);

  return (
    <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col items-center gap-5 px-5 pb-12 pt-20 sm:px-8 sm:pt-24">
      <ExploreDeck
        items={items}
        results={results}
        startId={generation.id}
        currentUserId={user?.id ?? null}
        basePath={`/g/${generation.id}`}
        emptyHref="/create"
      />
    </main>
  );
}
