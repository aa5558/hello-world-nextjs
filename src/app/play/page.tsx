import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Action } from "@/app/components/ui";
import { getFeed } from "@/lib/feed";
import { getGuessRound } from "@/lib/guess";
import { SURPRISE_HISTORY, pickSurprisePhoto } from "@/lib/surprise";
import { createClient } from "@/lib/supabase/server";
import { GuessPlay } from "./GuessPlay";
import { PlayRound } from "./PlayRound";
import { TurnPlay } from "./TurnPlay";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Play · Morningside Memes",
};

const SEEN_MAX = 6;
const UUID = /^[0-9a-f-]{36}$/i;
type Mode = "duel" | "guess" | "turn";

const MODES: { mode: Mode; label: string; href: string }[] = [
  { mode: "duel", label: "which one's funnier?", href: "/play" },
  { mode: "guess", label: "human or ai?", href: "/play?mode=guess" },
  { mode: "turn", label: "your turn", href: "/play?mode=turn" },
];

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Play: three modes of the same game.
// - duel: one photo, two real captions; a pick is an upvote through the
//   normal vote action, which is also what earns that author's reveal.
// - guess: Human or AI? on captions from finished days (no account needed).
// - turn: a random photo already in the app; you write the caption.
export default async function PlayPage(props: PageProps<"/play">) {
  const searchParams = await props.searchParams;
  const mode: Mode = searchParams.mode === "guess" ? "guess" : searchParams.mode === "turn" ? "turn" : "duel";
  const seenParam = typeof searchParams.seen === "string" ? searchParams.seen : "";
  const seen = seenParam.split(",").filter((id) => UUID.test(id));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let body: ReactNode;

  if (mode === "guess") {
    body = <GuessPlay initialRound={await getGuessRound(supabase)} />;
  } else if (mode === "turn") {
    // The photo is pinned in the address, so refreshing (e.g. after you add
    // your caption) keeps the same one.
    const pinned = typeof searchParams.id === "string" && UUID.test(searchParams.id) ? searchParams.id : null;
    if (!pinned) {
      const id = await pickSurprisePhoto(supabase, { seen: seen.slice(-SURPRISE_HISTORY), userId: user?.id });
      if (id) redirect(`/play?mode=turn&id=${id}${seen.length ? `&seen=${seen.slice(-SURPRISE_HISTORY).join(",")}` : ""}`);
    }
    const generation = pinned ? (await getFeed(supabase, { id: pinned, userId: user?.id })).generations[0] : null;
    body = generation ? (
      <TurnPlay
        key={generation.id}
        signedIn={Boolean(user)}
        generationId={generation.id}
        imageUrl={generation.imageUrl}
        alt={generation.context ?? generation.dailyPrompt ?? "A campus photo"}
        againHref={`/play?mode=turn&seen=${[...seen, generation.id].slice(-SURPRISE_HISTORY).join(",")}`}
      />
    ) : (
      <Empty title="No photos yet." body="Post the first one and it'll show up here." href={user ? "/create" : "/login?next=/create"} action="Create one" />
    );
  } else {
    const recent = seen.slice(-SEEN_MAX);
    const { generations, error } = await getFeed(supabase, { userId: user?.id });
    // Captions you can still judge: not your own, and not voted on yet.
    const open = generations
      .map((g) => ({ generation: g, captions: g.captions.filter((c) => !c.reveal?.isMine && c.myVote === 0) }))
      .filter((entry) => entry.captions.length >= 2);
    const fresh = open.filter((entry) => !recent.includes(entry.generation.id));
    const pick = shuffle(fresh.length > 0 ? fresh : open)[0] ?? null;

    body =
      error || !pick ? (
        error ? (
          <Empty title="Hmm." body="We couldn't load a round just now. Try again in a moment." href="/play" action="Try again" />
        ) : (
          <Empty
            title="All judged."
            body="You've voted on every battle there is. Try Human or AI?, or make the next one."
            href={user ? "/create" : "/login?next=/create"}
            action="Create one"
          />
        )
      ) : (
        <PlayRound
          key={pick.generation.id}
          signedIn={Boolean(user)}
          generationId={pick.generation.id}
          imageUrl={pick.generation.imageUrl}
          alt={pick.generation.context ?? pick.generation.dailyPrompt ?? "A campus photo"}
          captions={shuffle(pick.captions).slice(0, 2).map((c) => ({ id: c.id, text: c.text }))}
          nextHref={`/play?seen=${[...recent, pick.generation.id].slice(-SEEN_MAX).join(",")}`}
        />
      );
  }

  return (
    <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-5xl flex-col items-center gap-6 px-5 pb-12 pt-20 text-center sm:gap-8 sm:px-8 sm:pt-24">
      <nav aria-label="Play modes" className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
        {MODES.map((m) => (
          <Link
            key={m.mode}
            href={m.href}
            aria-current={mode === m.mode ? "page" : undefined}
            className={`underline-offset-4 transition ${mode === m.mode ? "text-ink underline decoration-punch decoration-2" : "text-ink-3 hover:text-ink"}`}
          >
            {m.label}
          </Link>
        ))}
      </nav>
      <div className="flex w-full flex-1 flex-col items-center justify-center">{body}</div>
    </main>
  );
}

function Empty({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="word text-6xl sm:text-8xl">{title}</h1>
      <p className="max-w-sm text-lg text-ink-2">{body}</p>
      <Action href={href}>{action}</Action>
    </div>
  );
}
