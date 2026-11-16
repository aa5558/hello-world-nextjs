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

  // Just posted: one calm screen. The captions were written and published
  // together, so this shows all of them; nothing to choose.
  if (justPosted) {
    return (
      <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col items-center justify-center gap-7 px-5 pb-12 pt-20 text-center sm:px-8">
        <p className="rise text-sm text-ink-3">Published</p>
        <h1 className="word rise text-6xl sm:text-8xl" style={{ animationDelay: "80ms" }}>
          Your meme is live.
        </h1>
        <div className="rise relative" style={{ animationDelay: "200ms" }}>
          <Sparkles />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={generation.imageUrl}
            alt={generation.context ?? "Your photo"}
            className="max-h-[34svh] w-auto max-w-full rounded-[28px] object-contain shadow-[0_40px_80px_-40px_rgba(22,21,20,0.45)]"
          />
        </div>
        <ul aria-label="Captions on your meme" className="flex w-full max-w-xl flex-col gap-2 text-left">
          {generation.captions.map((caption, i) => (
            <li
              key={caption.id}
              className="rise flex items-start justify-between gap-4 rounded-[20px] bg-white px-5 py-4 ring-1 ring-line"
              style={{ animationDelay: `${320 + i * 90}ms` }}
            >
              <span className="text-[17px] leading-snug text-ink">“{caption.text}”</span>
              <span className="shrink-0 pt-1 text-xs font-medium text-ai-ink">
                {caption.reveal?.authorType === "human" ? "you" : "AI"}
              </span>
            </li>
          ))}
        </ul>
        <p className="max-w-sm text-sm text-ink-3">
          Classmates now vote on these blind, along with any captions they add.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/play"
            className="inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-lg font-medium text-white transition hover:scale-[1.03] active:scale-[0.97]"
          >
            Want to play? <span aria-hidden>→</span>
          </Link>
          <Link href={`/g/${generation.id}#add-caption`} className="text-sm text-ink-3 underline-offset-4 hover:text-ink hover:underline">
            or write your own caption for it
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pb-16 pt-20">
      <div className="flex items-center justify-between gap-2">
        <Link href="/feed" className="btn btn-ghost btn-sm">
          <Icon name="back" className="h-4 w-4" /> Feed
        </Link>
        <ShareButton path={`/g/${generation.id}`} text={generation.captions[0]?.text ?? "Human or AI? You decide."} />
      </div>
      {result && <BattleResultCard result={result} />}
      <div className="animate-fade-up">
        <GenerationCard generation={generation} currentUserId={user?.id} captionForm="open" />
      </div>
      {isMine && (
        <p className="text-center text-sm text-ink-2">Send this to the group chat. Can they out-write Gemini?</p>
      )}
    </main>
  );
}
