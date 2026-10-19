import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GenerationCard } from "@/app/components/GenerationCard";
import { EmptyCard } from "@/app/components/PageHero";
import { getFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";
import { pickSurprisePhoto, SURPRISE_HISTORY } from "@/lib/surprise";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Surprise Me — Morningside Memes",
  description: "Roll a random photo from around campus and try to out-write Gemini on it.",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseSeen(value: string | string[] | undefined) {
  return (typeof value === "string" ? value.split(",") : [])
    .filter((id) => UUID_PATTERN.test(id))
    .slice(-SURPRISE_HISTORY);
}

// A random existing photo, opened as a battle. The photo is picked once and
// pinned in the URL (?id=), so posting a caption or voting refreshes the
// same photo instead of rolling a new one. "Try another" rolls again.
export default async function SurprisePage(props: PageProps<"/surprise">) {
  const searchParams = await props.searchParams;
  const id = typeof searchParams.id === "string" ? searchParams.id : undefined;
  const seen = parseSeen(searchParams.seen);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!id || !UUID_PATTERN.test(id)) {
    const picked = await pickSurprisePhoto(supabase, { seen, userId: user?.id });
    if (picked) {
      const history = [...seen, picked].slice(-SURPRISE_HISTORY).join(",");
      redirect(`/surprise?id=${picked}&seen=${history}`);
    }
  }

  const { generations } = id
    ? await getFeed(supabase, { id, userId: user?.id })
    : { generations: [] };
  const generation = generations[0];
  const tryAnother = `/surprise?seen=${seen.join(",")}`;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="animate-fade-up flex flex-col items-start gap-5 lg:sticky lg:top-28 lg:self-start">
        <span className="orb animate-float flex h-20 w-20 items-center justify-center rounded-[26px] text-4xl">🎲</span>
        <p className="eyebrow">surprise me</p>
        <h1 className="display text-5xl sm:text-6xl">
          A random photo. <span className="serif text-sky-deep">Out-write the AI.</span>
        </h1>
        <p className="max-w-md text-[17px] leading-relaxed text-ink-2">
          No photo needed. Roll the dice, add your caption to the battle, and see how it stacks up against
          Gemini.
        </p>
        <Link href={tryAnother} className="btn btn-primary btn-lg">
          🎲 Try another
        </Link>
      </section>

      <div className="flex min-w-0 flex-col gap-4">
        {generation ? (
          <GenerationCard generation={generation} currentUserId={user?.id} captionForm="open" />
        ) : (
          <EmptyCard
            emoji="🎲"
            title={id ? "That photo isn't around anymore." : "No photos to roll yet."}
            body={id ? "It may have been deleted. Roll again?" : "Post the first one!"}
          >
            <Link href={id ? "/surprise" : user ? "/create" : "/login?next=/create"} className="btn btn-primary">
              {id ? "🎲 Roll again" : "Post a photo"}
            </Link>
          </EmptyCard>
        )}

        {generation && (
          <Link href={tryAnother} className="btn btn-ghost self-center">
            🎲 Not feeling it? Try another
          </Link>
        )}
      </div>
    </main>
  );
}
