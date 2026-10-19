import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerationCard } from "@/app/components/GenerationCard";
import { Icon } from "@/app/components/Icon";
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const generation = await loadGeneration(id, user?.id);
  if (!generation) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 pt-6 sm:pt-10">
      <Link href="/" className="btn btn-ghost btn-sm self-start">
        <Icon name="back" className="h-4 w-4" /> All battles
      </Link>
      <div className="animate-fade-up">
        <GenerationCard generation={generation} currentUserId={user?.id} captionForm="open" />
      </div>
      {generation.userId === user?.id && (
        <p className="flex items-center justify-center gap-2 text-center text-sm text-ink-2">
          <Icon name="share" className="h-4 w-4" />
          Send this link to the group chat. Can they out-write Gemini?
        </p>
      )}
    </main>
  );
}
