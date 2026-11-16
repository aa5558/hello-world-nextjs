import Link from "next/link";
import { getFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";
import { PlayRound } from "./PlayRound";

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

// One photo, two real captions from it, "Which one's funnier?". Picking one
// is an upvote through the normal vote action, which is also what earns
// that caption's author reveal; the other caption stays blind.
export default async function PlayPage(props: PageProps<"/play">) {
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
    .map((g) => ({ generation: g, captions: g.captions.filter((c) => !c.reveal?.isMine && c.myVote === 0) }))
    .filter((entry) => entry.captions.length >= 2);
  const fresh = open.filter((entry) => !seen.includes(entry.generation.id));
  const pick = shuffle(fresh.length > 0 ? fresh : open)[0] ?? null;

  if (error || !pick) {
    return (
      <main className="screen-in flex min-h-[100svh] flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="word text-6xl sm:text-8xl">{error ? "Hmm." : "All judged."}</h1>
        <p className="max-w-sm text-lg text-ink-2">
          {error
            ? "We couldn't load a round just now. Try again in a moment."
            : "You've voted on every battle there is. Make the next one."}
        </p>
        <Link
          href={error ? "/play" : user ? "/create" : "/login?next=/create"}
          className="inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-lg font-medium text-white transition hover:scale-[1.03] active:scale-[0.97]"
        >
          {error ? "Try again" : "Create one"} <span aria-hidden>→</span>
        </Link>
      </main>
    );
  }

  return (
    <PlayRound
      key={pick.generation.id}
      signedIn={Boolean(user)}
      generationId={pick.generation.id}
      imageUrl={pick.generation.imageUrl}
      alt={pick.generation.context ?? pick.generation.dailyPrompt ?? "A campus photo"}
      captions={shuffle(pick.captions).slice(0, 2).map((c) => ({ id: c.id, text: c.text }))}
      nextHref={`/play?seen=${[...seen, pick.generation.id].slice(-SEEN_MAX).join(",")}`}
    />
  );
}
