import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sparkles } from "@/app/components/Sparkles";
import { Ink } from "@/app/components/ui";
import { CueOnMount } from "@/app/components/CueOnMount";
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
    const glows = ["glow-pink", "glow-cyan", "glow-green", "glow-violet"];
    const step = 650;
    const done = 900 + generation.captions.length * step;
    const placement = ["lg:col-start-1 lg:row-start-1", "lg:col-start-3 lg:row-start-1", "lg:col-start-1 lg:row-start-2", "lg:col-start-3 lg:row-start-2"];
    return (
      <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col items-center justify-center gap-8 px-5 pb-12 pt-24 text-center sm:px-8">
        <CueOnMount cue="reveal" delay={800} />
        <CueOnMount cue="publish" delay={done} />
        <h1 className="word glow-gold text-5xl sm:text-7xl">
          <Ink text="Ta-da." />
        </h1>
        {/* The photo in the middle; the AI's captions light up around it. */}
        <div className="grid w-full items-center gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-8">
          <div className="relative mx-auto lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <span aria-hidden className="spotlight" />
            <div className="frame glow-gold rise [animation-delay:200ms]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generation.imageUrl}
                alt={generation.context ?? "Your photo"}
                className="max-h-[34svh] w-auto max-w-[78vw] rounded-[12px] object-contain lg:max-w-[360px]"
              />
            </div>
          </div>
          <ul aria-label="Captions on your meme" className="contents">
            {generation.captions.map((caption, i) => (
              <li
                key={caption.id}
                className={`rise panel lit ${glows[i % 4]} relative rounded-[22px] px-5 py-4 text-left ${placement[i] ?? ""}`}
                style={{ animationDelay: `${900 + i * step}ms` }}
              >
                <span className="block text-[17px] leading-snug text-white">“{caption.text}”</span>
                <span className={`tube ${glows[i % 4]} mt-2 block text-[10px]`}>{caption.reveal?.authorType === "human" ? "you" : "AI"}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rise relative flex flex-col items-center gap-3" style={{ animationDelay: `${done}ms` }}>
          <Sparkles />
          <p className="tube glow-gold text-2xl sm:text-3xl">Your meme is live.</p>
          <p className="max-w-md text-sm text-ink-3">
            The AI wrote these {generation.captions.length} captions and they&apos;re posted with it. Classmates vote on them blind, next to any captions they add.
          </p>
        </div>
        <div className="rise flex flex-col items-center gap-3" style={{ animationDelay: `${done + 300}ms` }}>
          <Link href="/play" className="btn-neon btn-big glow-cyan">
            Take it to the arena <span aria-hidden>→</span>
          </Link>
          <Link href={`/g/${generation.id}`} className="text-sm text-ink-3 underline-offset-4 hover:text-cyan hover:underline">
            see it in the gallery, or write your own caption for it
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
