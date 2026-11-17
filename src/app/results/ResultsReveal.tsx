"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RoundClock } from "@/app/components/RoundClock";
import { SampleMeme } from "@/app/components/SampleMeme";
import { Sparkles } from "@/app/components/Sparkles";
import { WinnerReveal } from "@/app/components/WinnerReveal";
import { Action, Dots, Ink, Quiet } from "@/app/components/ui";
import type { LeaderboardEntry, Scoreboard } from "@/lib/battles";
import { prettyDay, type Champion } from "@/lib/champions";
import { ordinal, podium, rankEntries, type Ranked } from "@/lib/ranking";

const STAGES = ["intro", "today", "top", "champ", "score"] as const;
type Stage = (typeof STAGES)[number];

function Author({ entry }: { entry: LeaderboardEntry }) {
  if (!entry.reveal) return <span className="text-ink-3">human or AI? vote to find out</span>;
  if (entry.reveal.authorType === "ai") return <span className="text-ai-ink">written by AI</span>;
  return <span className="text-human-ink">{entry.reveal.isMine ? "yours" : `written by ${entry.reveal.authorName ?? "a classmate"}`}</span>;
}

function Votes({ e }: { e: { upvotes: number; downvotes: number; score: number } }) {
  return (
    <span className="tabular-nums" aria-label={`${e.upvotes} upvotes, ${e.downvotes} downvotes, net ${e.score}`}>
      ▲ {e.upvotes} · ▼ {e.downvotes} · <span className="text-white">{e.score > 0 ? `+${e.score}` : e.score}</span>
    </span>
  );
}

const MEDAL = {
  1: { ring: "ring-gold", glow: "glow-gold", label: "gold", height: "sm:min-h-[21rem]" },
  2: { ring: "ring-silver", glow: "glow-cyan", label: "silver", height: "sm:min-h-[17rem]" },
  3: { ring: "ring-bronze", glow: "glow-pink", label: "bronze", height: "sm:min-h-[14rem]" },
} as const;

export function ResultsReveal({
  prompt,
  day,
  msLeft,
  photosToday,
  entries,
  loadError,
  champions,
  scoreboard,
  drop,
  createHref,
  startAtChampion = false,
}: {
  startAtChampion?: boolean;
  prompt: string;
  day: string;
  msLeft: number;
  photosToday: number;
  entries: LeaderboardEntry[];
  loadError: boolean;
  champions: Champion[];
  scoreboard: Scoreboard;
  drop: { url: string; alt: string; title: string } | null;
  createHref: string;
}) {
  // ?show=champion (the "last round's champion" sign) opens on the
  // ceremony; that's the person's own choice, so it plays right away.
  const [i, setI] = useState(startAtChampion && champions.length ? 3 : 0);
  const [showAll, setShowAll] = useState(false);
  const [revealing, setRevealing] = useState<Champion | null>(startAtChampion ? (champions[0] ?? null) : null);
  const [revealedOnce, setRevealedOnce] = useState(startAtChampion);
  const stage: Stage = STAGES[i];
  const next = useCallback(() => setI((n) => Math.min(n + 1, STAGES.length - 1)), []);
  const back = useCallback(() => setI((n) => Math.max(n - 1, 0)), []);
  const latest = champions[0] ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (revealing) return;
      if ((e.target as HTMLElement).closest("input, textarea, button, a")) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [next, back, revealing]);

  // Arriving at the champion step (by choice, here on Results) plays the
  // ceremony once; after that it's on the replay buttons.
  function goTo(n: number) {
    setI(n);
    if (STAGES[n] === "champ" && latest && !revealedOnce) {
      setRevealedOnce(true);
      setRevealing(latest);
    }
  }

  const ranked = rankEntries(entries);
  const top = podium(ranked);
  const rest = ranked.filter((r) => !top.includes(r));
  const nextLabel: Record<Stage, string> = {
    intro: "Show me",
    today: "Who's on top?",
    top: "Last round's champion",
    champ: "Humans vs AI",
    score: "",
  };

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-4xl flex-col items-center px-5 pb-12 pt-20 text-center sm:px-8 sm:pt-24">
      <div className="flex h-10 w-full items-center justify-between">
        {i > 0 ? <Quiet onClick={back}>← back</Quiet> : <span />}
        <Dots count={STAGES.length} current={i} label="Results" />
        {i < STAGES.length - 1 ? <Quiet onClick={() => goTo(STAGES.length - 1)}>skip to the end</Quiet> : <span />}
      </div>

      <section key={stage} aria-live="polite" className="screen-in flex w-full flex-1 flex-col items-center justify-center gap-6 py-8 sm:gap-8">
        {stage === "intro" && (
          <h1 className="word glow-gold text-6xl sm:text-8xl">
            <Ink text="Want to know who's winning?" />
          </h1>
        )}

        {/* The live round: its prompt and the clock to the bell. */}
        {stage === "today" && (
          <>
            <p className="tube glow-green text-[11px]">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-green align-middle shadow-[0_0_10px_#a3ff47]" />
              {prettyDay(day)} round · live now
            </p>
            <h1 className="word glow-cyan text-5xl sm:text-7xl">
              <Ink text={prompt} />
            </h1>
            <RoundClock initialMs={msLeft} />
            {drop && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={drop.url} alt={drop.alt} className="frame glow-gold rise max-h-[20svh] object-cover [animation-delay:300ms]" />
            )}
            <p className="rise text-ink-2 [animation-delay:400ms]">
              {photosToday} {photosToday === 1 ? "photo" : "photos"} · {entries.length} {entries.length === 1 ? "caption" : "captions"} in this round so far.
            </p>
            <p className="rise flex gap-4 text-sm [animation-delay:500ms]">
              <Quiet href={createHref}>{drop ? "make one with today's photo" : "make one for this round"}</Quiet>
              <Quiet href="/play">vote in the arena</Quiet>
            </p>
          </>
        )}

        {/* The standings: a podium for the top three, then everyone else. */}
        {stage === "top" &&
          (loadError ? (
            <p className="text-lg text-ink-2">We couldn&apos;t load this round&apos;s captions just now.</p>
          ) : entries.length === 0 ? (
            <>
              <h1 className="word glow-violet text-5xl sm:text-7xl">No submissions yet.</h1>
              <p className="max-w-md text-ink-2">This round is wide open. Here&apos;s how it works:</p>
              <SampleMeme createHref={createHref} />
            </>
          ) : top.length === 0 ? (
            <>
              <h1 className="word glow-violet text-5xl sm:text-7xl">
                <Ink text="Nobody's voted yet." />
              </h1>
              <p className="max-w-md text-lg text-ink-2">
                {entries.length} {entries.length === 1 ? "caption is" : "captions are"} in this round, all tied at zero. One vote changes that.
              </p>
              <Action href="/play" tone="cyan">
                Go vote
              </Action>
            </>
          ) : (
            <>
              <div aria-hidden className="stage-dim pointer-events-none fixed inset-0 z-0 [animation-delay:1100ms]" />
              <p className="tube glow-green relative z-10 text-[11px]">Live standings · final at midnight</p>
              <h1 className="word glow-gold relative z-10 text-5xl sm:text-7xl">This round&apos;s top captions</h1>
              <ol aria-label="Today's top captions" className="relative z-10 flex w-full flex-col items-stretch gap-5 sm:flex-row sm:items-end sm:justify-center">
                {top.map((entry, n) => (
                  <PodiumCard key={entry.id} entry={entry} slot={n} count={top.length} />
                ))}
              </ol>
              {rest.length > 0 &&
                (showAll ? (
                  <ol aria-label="Every caption today" className="relative z-10 flex w-full max-w-2xl flex-col gap-1 text-left">
                    {rest.map((entry, n) => (
                      <li key={entry.id} className="rise flex items-baseline gap-3 border-b border-line px-2 py-3" style={{ animationDelay: `${n * 30}ms` }}>
                        <span className="tube glow-violet w-10 shrink-0 text-xs tabular-nums">{entry.tied ? `T-${entry.place}` : entry.place}</span>
                        <Link href={`/g/${entry.generationId}`} className="min-w-0 flex-1 text-[15px] text-white hover:text-cyan">
                          “{entry.text}”
                        </Link>
                        <span className="shrink-0 text-xs text-ink-2">
                          <Votes e={entry} />
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Quiet onClick={() => setShowAll(true)} className="relative z-10">
                    see all {entries.length} captions in this round
                  </Quiet>
                ))}
              <p className="relative z-10 text-xs text-ink-3">Ties: same net score and upvotes share a place. At the bell, the earlier post wins a tie.</p>
            </>
          ))}

        {/* Champions of finished rounds, with the ceremony on replay. */}
        {stage === "champ" &&
          (latest ? (
            <>
              <p className="tube glow-gold text-[11px]">Last round&apos;s champion · {prettyDay(latest.day)}</p>
              <ChampionCard champion={latest} />
              <Action onClick={() => setRevealing(latest)} tone="gold">
                Replay the winner reveal
              </Action>
              {champions.length > 1 && (
                <div className="w-full max-w-2xl">
                  <p className="tube glow-violet mb-3 text-[11px]">Past rounds</p>
                  <ul className="flex flex-col gap-2 text-left">
                    {champions.slice(1).map((c) => (
                      <li key={c.day} className="panel flex items-center gap-3 rounded-[18px] p-2.5 pr-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] text-white">“{c.text}”</span>
                          <span className="block text-xs text-ink-3">
                            {prettyDay(c.day)} · {c.authorType === "ai" ? "the AI" : c.authorName ?? "a classmate"} · +{c.score}
                          </span>
                        </span>
                        <button type="button" onClick={() => setRevealing(c)} className="chip-neon glow-gold shrink-0 text-xs">
                          watch
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className="word glow-violet text-5xl sm:text-7xl">
                <Ink text="No champion last round." />
              </h1>
              <p className="max-w-md text-lg text-ink-2">
                A round needs at least one upvoted caption before the bell to crown a winner. None of the last seven rounds had one yet.
              </p>
              <Action href="/play" tone="cyan">
                Vote in this round
              </Action>
            </>
          ))}

        {stage === "score" && (
          <>
            <p className="tube glow-violet text-xs">Humans vs AI · all time</p>
            {scoreboard.battles === 0 && scoreboard.humanWins + scoreboard.aiWins === 0 ? (
              <>
                <h1 className="word glow-violet text-6xl sm:text-8xl">
                  <Ink text="Still 0 to 0." />
                </h1>
                <p className="max-w-md text-lg text-ink-2">
                  A photo counts once its day is over and a human has captioned it. Nobody has taken on the AI yet.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-end justify-center gap-6 sm:gap-12" aria-label={`Humans ${scoreboard.humanWins}, AI ${scoreboard.aiWins}`}>
                  <div className="rise flex flex-col items-center">
                    <span className="tube glow-green text-[clamp(5rem,18vw,10rem)] tabular-nums">{scoreboard.humanWins}</span>
                    <span className="text-sm text-ink-2">humans</span>
                  </div>
                  <span className="neon glow-pink pb-10 text-5xl">vs</span>
                  <div className="rise flex flex-col items-center [animation-delay:250ms]">
                    <span className="tube glow-violet text-[clamp(5rem,18vw,10rem)] tabular-nums">{scoreboard.aiWins}</span>
                    <span className="text-sm text-ink-2">AI</span>
                  </div>
                </div>
                <p className="rise text-lg text-ink-2 [animation-delay:500ms]">
                  {scoreboard.humanWins > scoreboard.aiWins
                    ? "Humans are ahead. For now."
                    : scoreboard.aiWins > scoreboard.humanWins
                      ? "The AI is ahead. Your move."
                      : "Dead even."}{" "}
                  ({scoreboard.battles} {scoreboard.battles === 1 ? "photo" : "photos"} with human challengers)
                </p>
              </>
            )}
            <Action href="/play" tone="cyan">
              To the arena
            </Action>
            <Quiet href="/?start=choose">home</Quiet>
          </>
        )}
      </section>

      {stage !== "score" && (
        <Action onClick={() => goTo(i + 1)} tone="gold" className="relative z-10">
          {nextLabel[stage]}
        </Action>
      )}

      {revealing && <WinnerReveal champion={revealing} onClose={() => setRevealing(null)} />}
    </main>
  );
}

// One podium step. 1st is tallest, ringed in moving gold light and floating
// under a spotlight; ties share the medal for their place.
function PodiumCard({ entry, slot, count }: { entry: Ranked<LeaderboardEntry>; slot: number; count: number }) {
  const place = Math.min(entry.place, 3) as 1 | 2 | 3;
  const m = MEDAL[place];
  // Visual order on wide screens: 2nd, 1st, 3rd. Revealed 3rd -> 2nd -> 1st.
  const order = ["sm:order-2", "sm:order-1", "sm:order-3"][slot];
  // Lowest place first, the leader last; a lone leader appears right away.
  const delay = (count - 1 - slot) * 750 + 200;
  return (
    <li className={`podium-up relative sm:w-[17rem] ${order}`} style={{ animationDelay: `${delay}ms` }} aria-label={`${entry.tied ? "Tied for " : ""}${ordinal(entry.place)} place`}>
      {place === 1 && <span aria-hidden className="spotlight" />}
      {place === 1 && <Sparkles />}
      <div className={`neon-ring ${m.ring} ${place === 1 ? "float" : ""} rounded-t-[26px] rounded-b-lg`}>
        <div className={`panel ${place === 1 ? "lit" : ""} ${m.glow} relative flex flex-col items-center gap-3 rounded-t-[26px] rounded-b-lg px-4 pb-5 pt-6 text-center ${m.height}`}>
          <span className={`medal-${place} h-8 w-8 rounded-full`} aria-hidden />
          <span className={`tube ${m.glow} text-[11px]`}>
            {entry.tied ? "tied · " : ""}
            {ordinal(entry.place)} · {m.label}
          </span>
          <Link href={`/g/${entry.generationId}`} aria-label="Open this meme" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={entry.imageUrl} alt="" className={`${place === 1 ? "h-24 w-24" : "h-16 w-16"} rounded-2xl object-cover`} />
          </Link>
          <span className={`${place === 1 ? "text-[19px]" : "text-[16px]"} leading-snug text-white`}>“{entry.text}”</span>
          <span className="text-xs">
            <Author entry={entry} />
          </span>
          <span className={`tube ${m.glow} mt-auto text-sm`}>
            <Votes e={entry} />
          </span>
        </div>
      </div>
    </li>
  );
}

function ChampionCard({ champion }: { champion: Champion }) {
  return (
    <div className="neon-ring ring-gold float relative w-full max-w-md rounded-[28px]">
      <div className="frame glow-gold flex flex-col items-center gap-3 rounded-[28px] px-5 pb-6 pt-7 text-center">
        <span className="fight glow-gold text-sm">Champion</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={champion.imageUrl} alt="" className="max-h-[24svh] w-auto max-w-full rounded-[14px] object-contain" />
        <p className="word glow-gold text-3xl leading-tight sm:text-4xl">“{champion.text}”</p>
        <p className="text-white">{champion.authorType === "ai" ? "The AI (Gemini)" : champion.authorName ?? "A classmate"}</p>
        <p className="tube glow-cyan text-xs">
          <Votes e={champion} />
        </p>
        {champion.prompt && <p className="text-xs text-ink-3">Prompt: “{champion.prompt}”</p>}
      </div>
    </div>
  );
}
