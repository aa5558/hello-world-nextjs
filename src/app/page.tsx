import Link from "next/link";
import { Countdown } from "@/app/components/Countdown";
import { GenerationCard } from "@/app/components/GenerationCard";
import { GuessGame } from "@/app/components/GuessGame";
import { Icon } from "@/app/components/Icon";
import {
  getChallengeDate,
  getDailyPrompt,
  msUntilNextChallenge,
} from "@/lib/captions";
import { getFeed, type FeedGeneration, type FeedSort } from "@/lib/feed";
import { getGuessRound } from "@/lib/guess";
import { getDailyDrop } from "@/lib/library";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABS: { sort: FeedSort; label: string }[] = [
  { sort: "new", label: "Fresh" },
  { sort: "top", label: "Top this week" },
];

type View = "battles" | "wall";

function feedHref(sort: FeedSort, view: View) {
  const params = new URLSearchParams();
  if (sort !== "new") params.set("sort", sort);
  if (view !== "battles") params.set("view", view);
  const query = params.toString();
  return query ? `/?${query}#feed` : "/#feed";
}

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const sort: FeedSort = searchParams.sort === "top" ? "top" : "new";
  const view: View = searchParams.view === "wall" ? "wall" : "battles";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = getChallengeDate();
  const [{ generations, error }, guessRound, drop] =
    await Promise.all([
      getFeed(supabase, { sort, userId: user?.id }),
      getGuessRound(supabase),
      getDailyDrop(supabase, today),
    ]);

  const postHref = user ? "/create" : "/login?next=/create";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 pt-8 sm:px-6 sm:pt-14">
      {/* Header: what this is and the one thing to do */}
      <section className="flex flex-col items-start gap-5 sm:items-center sm:text-center">
        <p className="eyebrow text-gold-ink">The campus comedy club</p>
        <h1 className="display text-[2.9rem] leading-[0.98] text-ink sm:text-7xl">
          Campus life, <span className="serif text-plum">captioned.</span>
        </h1>
        <p className="max-w-lg text-[17px] leading-relaxed text-ink-2">
          Post a campus moment, let the AI write the captions, then vote blind on what&apos;s
          actually funniest: a classmate&apos;s line or the machine&apos;s.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={postHref} className="btn btn-primary btn-lg">
            <Icon name="plus" className="h-5 w-5" /> Create a meme
          </Link>
          <Link href="/battles" className="btn btn-ghost btn-lg">
            Judge a battle
          </Link>
        </div>
      </section>

      {/* Today's prompt: small, not the main event */}
      <Link
        href="/challenge"
        className="lift group flex items-center gap-4 rounded-[20px] border border-gold/40 bg-gold-soft/70 p-3 pr-5 sm:mx-auto sm:w-full sm:max-w-2xl"
      >
        {drop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={drop.url} alt="" className="h-14 w-14 flex-none rounded-2xl object-cover ring-2 ring-white" />
        ) : (
          <span className="orb flex h-14 w-14 flex-none items-center justify-center rounded-2xl">
            <Icon name="calendar" className="h-6 w-6" />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-ink">
            Today&apos;s prompt · <Countdown initialMs={msUntilNextChallenge()} /> left
          </span>
          <span className="display truncate text-xl text-ink sm:text-2xl">{getDailyPrompt(today)}</span>
        </span>
        <Icon name="arrow" className="h-5 w-5 flex-none text-plum transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>

      {/* Feed */}
      <section id="feed" className="flex scroll-mt-24 flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">The feed</p>
            <h2 className="display mt-1 text-4xl sm:text-5xl">
              {sort === "top" ? (
                <>
                  Top <span className="serif">this week</span>
                </>
              ) : (
                <>
                  Fresh from <span className="serif">campus</span>
                </>
              )}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Sort" className="flex gap-1 rounded-full bg-powder/80 p-1 text-sm">
              {TABS.map((tab) => (
                <Link
                  key={tab.sort}
                  href={feedHref(tab.sort, view)}
                  aria-current={tab.sort === sort ? "page" : undefined}
                  className={`rounded-full px-3.5 py-1.5 font-medium transition ${
                    tab.sort === sort ? "bg-white text-ink shadow-[0_2px_8px_-2px_rgba(28,23,36,0.18)]" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </nav>
            <nav aria-label="Layout" className="flex gap-1 rounded-full bg-white p-1 text-sm ring-1 ring-line">
              {(
                [
                  { key: "battles", label: "Battles", icon: "flame" },
                  { key: "wall", label: "Photo wall", icon: "grid" },
                ] as const
              ).map((item) => (
                <Link
                  key={item.key}
                  href={feedHref(sort, item.key)}
                  aria-current={view === item.key ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
                    view === item.key ? "bg-plum text-white" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-[22px] bg-down-soft p-4 text-sm text-down-ink">
            We couldn&apos;t load the feed: {error}
          </p>
        )}

        {!error && generations.length === 0 && (
          <div className="card flex flex-col items-center gap-4 p-10 text-center">
            <span className="orb flex h-16 w-16 items-center justify-center rounded-full"><Icon name="image" className="h-7 w-7" /></span>
            <p className="display text-2xl">
              {sort === "top" ? "No photos this week yet." : "It's quiet. Too quiet."}
            </p>
            <p className="text-sm text-ink-2">
              {sort === "top" ? "Be the one who changes that." : "Nothing here yet. Be the first to post today."}
            </p>
            <Link href={postHref} className="btn btn-primary">
              Post a photo
            </Link>
          </div>
        )}

        {view === "battles" ? (
          <div className="columns-1 gap-5 md:columns-2 [&>*]:mb-5 [&>*]:break-inside-avoid">
            {generations.map((generation) => (
              <GenerationCard key={generation.id} generation={generation} currentUserId={user?.id} />
            ))}
          </div>
        ) : (
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3 [&>*]:break-inside-avoid">
            {generations.map((generation) => (
              <WallTile key={generation.id} generation={generation} />
            ))}
          </div>
        )}
      </section>

      <div className="mx-auto w-full max-w-3xl">
        <GuessGame initialRound={guessRound} signedIn={Boolean(user)} />
      </div>
    </main>
  );
}

function WallTile({ generation }: { generation: FeedGeneration }) {
  const top = generation.captions[0];
  return (
    <Link href={`/g/${generation.id}`} className="group relative block overflow-hidden rounded-[22px] bg-powder ring-1 ring-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={generation.imageUrl} alt={generation.context ?? "Campus photo"} loading="lazy" className="w-full transition duration-500 group-hover:scale-105" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent p-3 pt-10 text-white">
        {top && <p className="line-clamp-3 text-[13px] font-semibold leading-snug">“{top.text}”</p>}
        <p className="mt-1 text-[11px] text-white/75">
          {generation.captions.length} captions · {top && top.score > 0 ? `top +${top.score}` : "no votes yet"}
        </p>
      </div>
    </Link>
  );
}
