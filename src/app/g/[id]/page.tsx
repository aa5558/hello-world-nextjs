import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerationCard } from "@/app/components/GenerationCard";
import { BattleResultCard } from "@/app/components/BattleResultCard";
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
          <Icon name="back" className="h-4 w-4" /> All battles
        </Link>
        <ShareButton path={`/g/${generation.id}`} text={generation.captions[0]?.text ?? "Human or AI? You decide."} />
      </div>
      {justPosted && (
        <section className="animate-slide-in relative overflow-hidden rounded-[28px] bg-ink p-5 text-white">
          <span aria-hidden className="absolute -right-6 -top-8 text-[6rem] leading-none opacity-90">🍳</span>
          <p className="eyebrow !text-white/70">fresh out the oven</p>
          <p className="display mt-1 text-3xl">Gemini took its {generation.captions.length} swings.</p>
          <p className="mt-1 max-w-sm text-sm text-white/80">
            Now it&apos;s your turn. Write a caption below and see if the campus picks you over the AI.
          </p>
          <a href="#add-caption" className="btn btn-ice btn-sm mt-3">✍️ Beat the AI</a>
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
