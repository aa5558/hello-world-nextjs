import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GenerationCard } from "@/app/components/GenerationCard";
import { EmptyCard } from "@/app/components/PageHero";
import { getFeed } from "@/lib/feed";
import { getLibraryImage, pickLibraryImage } from "@/lib/library";
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

  if (searchParams.mode === "fresh") {
    return <FreshPhoto id={id} seen={seen} signedIn={Boolean(user)} />;
  }

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
        <ModeTabs mode="battle" />
        <span key={id} className="orb animate-roll flex h-20 w-20 items-center justify-center rounded-[26px] text-4xl">🎲</span>
        <p className="eyebrow">surprise me · random battle</p>
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

function ModeTabs({ mode }: { mode: "battle" | "fresh" }) {
  return (
    <nav aria-label="Surprise mode" className="flex gap-1 rounded-full bg-powder/80 p-1 text-sm">
      {[
        { key: "battle", label: "🥊 Random battle", href: "/surprise" },
        { key: "fresh", label: "✨ Fresh photo", href: "/surprise?mode=fresh" },
      ].map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={mode === tab.key ? "page" : undefined}
          className={`rounded-full px-3.5 py-1.5 font-medium transition ${
            mode === tab.key ? "bg-white text-ink shadow-[0_2px_8px_-2px_rgba(22,38,61,0.18)]" : "text-ink-2 hover:text-ink"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

// A photo from the curated library nobody has to have posted yet: roll one,
// then take it into the Studio and let Gemini take the first swing.
async function FreshPhoto({ id, seen, signedIn }: { id?: string; seen: string[]; signedIn: boolean }) {
  const supabase = await createClient();
  if (!id || !UUID_PATTERN.test(id)) {
    const picked = await pickLibraryImage(supabase, seen);
    if (picked) {
      const history = [...seen, picked.id].slice(-SURPRISE_HISTORY).join(",");
      redirect(`/surprise?mode=fresh&id=${picked.id}&seen=${history}`);
    }
  }
  const image = id ? await getLibraryImage(supabase, id) : null;
  const rollAgain = `/surprise?mode=fresh&seen=${seen.join(",")}`;
  const studio = image ? `/create?image=${image.id}` : "/create";
  const go = signedIn ? studio : `/login?next=${encodeURIComponent(studio)}`;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-8 sm:px-6 sm:pt-12 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="animate-fade-up flex flex-col items-start gap-5 lg:sticky lg:top-28 lg:self-start">
        <ModeTabs mode="fresh" />
        <span key={id} className="orb animate-roll flex h-20 w-20 items-center justify-center rounded-[26px] text-4xl">✨</span>
        <p className="eyebrow">surprise me · fresh photo</p>
        <h1 className="display text-5xl sm:text-6xl">
          A blank canvas. <span className="serif text-sky-deep">You go first.</span>
        </h1>
        <p className="max-w-md text-[17px] leading-relaxed text-ink-2">
          A hand-picked photo nobody&apos;s claimed yet. Make it a meme: Gemini writes four captions, then you
          try to beat them.
        </p>
        {image && (
          <Link href={go} className="btn btn-primary btn-lg">
            ✨ Make it a meme
          </Link>
        )}
      </section>

      <div className="flex min-w-0 flex-col gap-4">
        {image ? (
          <figure key={image.id} className="card animate-pop overflow-hidden p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.altText} className="max-h-[560px] w-full rounded-[22px] bg-powder object-contain" />
            <figcaption className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-3">
              <span className="display text-xl">{image.title}</span>
              <span className="flex flex-wrap gap-1">
                {image.tags.map((tag) => (
                  <span key={tag} className="chip bg-powder text-ink-2">#{tag}</span>
                ))}
              </span>
            </figcaption>
          </figure>
        ) : (
          <EmptyCard emoji="🖼️" title="The photo library is empty." body="No fresh photos to roll yet. Try a random battle instead.">
            <Link href="/surprise" className="btn btn-primary">🥊 Random battle</Link>
          </EmptyCard>
        )}
        {image && (
          <Link href={rollAgain} className="btn btn-ghost self-center">
            🎲 Not this one? Roll again
          </Link>
        )}
      </div>
    </main>
  );
}
