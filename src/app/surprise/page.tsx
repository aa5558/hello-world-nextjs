import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GenerationCard } from "@/app/components/GenerationCard";
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
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-6">
      <section className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-indigo-700 p-5 text-white shadow-md">
        <span className="absolute -right-3 -top-5 text-8xl opacity-20" aria-hidden>
          🎲
        </span>
        <p className="text-xs font-bold uppercase tracking-widest text-columbia">
          Surprise Me
        </p>
        <h1 className="text-2xl font-black leading-tight">
          A random photo from around campus. Can you out-write Gemini on it?
        </h1>
        <p className="text-sm text-white/75">
          No photo needed. Roll the dice, add your caption to the battle, and
          see how it stacks up against the AI.
        </p>
        <Link
          href={tryAnother}
          className="self-start rounded-full bg-columbia px-5 py-2 text-sm font-bold text-navy shadow-sm transition hover:bg-white active:scale-95"
        >
          🎲 Try another
        </Link>
      </section>

      {generation ? (
        <GenerationCard
          generation={generation}
          currentUserId={user?.id}
          captionForm="open"
        />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-8 text-center ring-1 ring-black/5 dark:ring-white/10">
          <p className="text-black/60 dark:text-white/60">
            {id
              ? "That photo isn't around anymore."
              : "No photos to roll yet. Post the first one!"}
          </p>
          <Link
            href={id ? "/surprise" : user ? "/create" : "/login?next=/create"}
            className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white dark:bg-columbia dark:text-navy"
          >
            {id ? "🎲 Roll again" : "Post a photo"}
          </Link>
        </div>
      )}

      {generation && (
        <Link
          href={tryAnother}
          className="self-center rounded-full bg-surface px-5 py-2 text-sm font-semibold ring-1 ring-black/10 transition hover:ring-black/25 active:scale-95 dark:ring-white/15"
        >
          🎲 Not feeling it? Try another
        </Link>
      )}
    </main>
  );
}
