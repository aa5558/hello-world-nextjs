import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerationCard } from "@/app/components/GenerationCard";
import { BattleResultCard } from "@/app/components/BattleResultCard";
import { Sparkles } from "@/app/components/Sparkles";
import { Icon } from "@/app/components/Icon";
import { ShareButton } from "@/app/components/ShareButton";
import { getBattleResult } from "@/lib/battles";
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
  const result = await getBattleResult(supabase, generation.id);
  const isMine = generation.userId === user?.id;
  const justPosted = isMine && searchParams.new === "1";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-6 sm:pt-10">
      <div className="flex items-center justify-between gap-2">
        <Link href="/" className="btn btn-ghost btn-sm">
          <Icon name="back" className="h-4 w-4" /> Feed
        </Link>
        <ShareButton path={`/g/${generation.id}`} text={generation.captions[0]?.text ?? "Human or AI? You decide."} />
      </div>
      {justPosted && (
        <section className="animate-slide-in relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#5a2d7a] to-midnight p-6 text-white shadow-[0_24px_48px_-24px_rgba(42,22,64,0.8)]">
          <Sparkles />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Published</p>
          <p className="display mt-1 text-3xl">Your meme is live.</p>
          <p className="mt-1 max-w-sm text-sm text-white/80">
            The AI wrote {generation.captions.length} captions. Think you can do better? Add yours, and
            the campus votes blind.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="#add-caption" className="btn btn-sm bg-gold text-[#2a1e05]">
              Write your own caption
            </a>
            <Link href="/battles" className="btn btn-sm bg-white/10 text-white ring-1 ring-white/25">
              Explore battles
            </Link>
          </div>
        </section>
      )}
      {result && <BattleResultCard result={result} />}
      <div className="animate-fade-up">
        <GenerationCard generation={generation} currentUserId={user?.id} captionForm="open" />
      </div>
      {isMine && !justPosted && (
        <p className="text-center text-sm text-ink-2">Send this to the group chat. Can they out-write Gemini?</p>
      )}
    </main>
  );
}
