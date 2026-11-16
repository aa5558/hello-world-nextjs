import Link from "next/link";
import { Icon } from "@/app/components/Icon";
import { getFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";
import { BattleDuel } from "./BattleDuel";

export const dynamic = "force-dynamic";

const SEEN_MAX = 6;
const UUID = /^[0-9a-f-]{36}$/i;

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// One photo, two captions, "Which one's funnier?". Uses only real posts and
// captions. Your pick gets an upvote through the normal vote action, which
// is also what earns the author reveal; the other caption stays blind.
export default async function BattlesPage(props: PageProps<"/battles">) {
  const searchParams = await props.searchParams;
  const seenParam = typeof searchParams.seen === "string" ? searchParams.seen : "";
  const seen = seenParam.split(",").filter((id) => UUID.test(id)).slice(-SEEN_MAX);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { generations, error } = await getFeed(supabase, { userId: user?.id });

  // Captions you can still judge: not your own, and not voted on yet.
  const open = generations
    .map((g) => ({
      generation: g,
      captions: g.captions.filter((c) => !c.reveal?.isMine && c.myVote === 0),
    }))
    .filter((entry) => entry.captions.length >= 2);
  const fresh = open.filter((entry) => !seen.includes(entry.generation.id));
  const pool = fresh.length > 0 ? fresh : open;
  const pick = shuffle(pool)[0] ?? null;

  const createHref = user ? "/create" : "/login?next=/create";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 sm:px-6 sm:pt-12">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="eyebrow text-gold-ink">Battles</p>
        <h1 className="display text-4xl sm:text-5xl">
          Which one&apos;s <span className="serif text-plum">funnier?</span>
        </h1>
        <p className="max-w-md text-[15px] text-ink-2">
          Tap the caption that made you laugh. Then find out if a classmate or the AI wrote it.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-2xl bg-down-soft p-4 text-sm text-down-ink">
          We couldn&apos;t load a battle: {error}
        </p>
      )}

      {!error && pick ? (
        <BattleDuel
          key={pick.generation.id}
          signedIn={Boolean(user)}
          generationId={pick.generation.id}
          imageUrl={pick.generation.imageUrl}
          title={pick.generation.context ?? pick.generation.dailyPrompt}
          captions={shuffle(pick.captions).slice(0, 2).map((c) => ({ id: c.id, text: c.text }))}
          nextHref={`/battles?seen=${[...seen, pick.generation.id].slice(-SEEN_MAX).join(",")}`}
        />
      ) : (
        !error && (
          <div className="card flex flex-col items-center gap-4 p-10 text-center">
            <span className="orb flex h-14 w-14 items-center justify-center rounded-full">
              <Icon name="check" className="h-6 w-6" />
            </span>
            <p className="display text-2xl">You&apos;ve judged every battle.</p>
            <p className="max-w-sm text-sm text-ink-2">
              The jury rests. Start a new one with your own photo, and the next person gets to judge you.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Link href={createHref} className="btn btn-primary">
                Create a meme
              </Link>
              <Link href="/" className="btn btn-ghost">
                Browse the feed
              </Link>
            </div>
          </div>
        )
      )}

      <p className="text-center text-sm text-ink-3">
        Want to write instead of judge?{" "}
        <Link href="/surprise" className="font-semibold text-plum underline-offset-2 hover:underline">
          Get a random photo to caption
        </Link>
      </p>
    </main>
  );
}
