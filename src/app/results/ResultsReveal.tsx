"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Countdown } from "@/app/components/Countdown";
import { Sparkles } from "@/app/components/Sparkles";
import { Action, Dots, Ink, Quiet } from "@/app/components/ui";
import type { DailyWinner, LeaderboardEntry, Scoreboard } from "@/lib/battles";

const STAGES = ["intro", "today", "top", "champ", "score"] as const;
type Stage = (typeof STAGES)[number];

function Author({ entry }: { entry: LeaderboardEntry }) {
  if (!entry.reveal) return <span className="text-ink-3">human or AI? vote to find out</span>;
  if (entry.reveal.authorType === "ai") return <span className="text-ai-ink">written by AI</span>;
  return <span className="text-human-ink">{entry.reveal.isMine ? "yours" : `written by ${entry.reveal.authorName ?? "a classmate"}`}</span>;
}

export function ResultsReveal({
  prompt,
  msLeft,
  photosToday,
  entries,
  loadError,
  winner,
  scoreboard,
  drop,
  createHref,
}: {
  prompt: string;
  msLeft: number;
  photosToday: number;
  entries: LeaderboardEntry[];
  loadError: boolean;
  winner: DailyWinner | null;
  scoreboard: Scoreboard;
  drop: { url: string; alt: string; title: string } | null;
  createHref: string;
}) {
  const [i, setI] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const stage: Stage = STAGES[i];
  const next = useCallback(() => setI((n) => Math.min(n + 1, STAGES.length - 1)), []);
  const back = useCallback(() => setI((n) => Math.max(n - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, button, a")) return;
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [next, back]);

  const voted = entries.filter((e) => e.upvotes + e.downvotes > 0);
  const top = voted.slice(0, 3);
  const nextLabel: Record<Stage, string> = {
    intro: "Show me",
    today: "Who's on top?",
    top: "And yesterday?",
    champ: "Humans vs AI",
    score: "",
  };

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col items-center px-5 pb-12 pt-20 text-center sm:px-8 sm:pt-24">
      <div className="flex h-10 w-full items-center justify-between">
        {i > 0 ? <Quiet onClick={back}>← back</Quiet> : <span />}
        <Dots count={STAGES.length} current={i} label="Results" />
        {i < STAGES.length - 1 ? <Quiet onClick={() => setI(STAGES.length - 1)}>skip to the end</Quiet> : <span />}
      </div>

      <section key={stage} aria-live="polite" className="screen-in flex w-full flex-1 flex-col items-center justify-center gap-6 py-8 sm:gap-8">
        {stage === "intro" && (
          <h1 className="word text-6xl sm:text-8xl">
            <Ink text="Want to know who's winning?" />
          </h1>
        )}

        {stage === "today" && (
          <>
            <p className="text-sm text-ink-3">
              Today&apos;s prompt · <Countdown initialMs={msLeft} /> left
            </p>
            <h1 className="word text-6xl sm:text-8xl">
              <Ink text={prompt} />
            </h1>
            {drop && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={drop.url} alt={drop.alt} className="rise max-h-[24svh] rounded-[24px] object-cover [animation-delay:300ms]" />
            )}
            <p className="rise text-lg text-ink-2 [animation-delay:400ms]">
              {photosToday} {photosToday === 1 ? "photo" : "photos"} · {entries.length} {entries.length === 1 ? "caption" : "captions"} so far. The top
              caption at midnight wins the day.
            </p>
            <p className="rise flex gap-4 text-sm [animation-delay:500ms]">
              <Quiet href={createHref}>{drop ? "make one with today's photo" : "make one for today"}</Quiet>
              <Quiet href="/play">play</Quiet>
            </p>
          </>
        )}

        {stage === "top" &&
          (loadError ? (
            <p className="text-lg text-ink-2">We couldn&apos;t load today&apos;s captions just now.</p>
          ) : top.length === 0 ? (
            <>
              <h1 className="word text-6xl sm:text-8xl">
                <Ink text="Nobody's voted yet." />
              </h1>
              <p className="max-w-md text-lg text-ink-2">
                {entries.length > 0
                  ? `${entries.length} ${entries.length === 1 ? "caption is" : "captions are"} in the ring today, all tied at zero. One vote changes that.`
                  : "No captions today yet. The first meme gets everyone's attention."}
              </p>
              <Action href={entries.length > 0 ? "/play" : createHref}>{entries.length > 0 ? "Go vote" : "Make the first one"}</Action>
            </>
          ) : (
            <>
              <h1 className="word text-5xl sm:text-7xl">Today&apos;s top captions</h1>
              <ol aria-label="Today's top captions" className="flex w-full max-w-xl flex-col gap-3 text-left">
                {top.map((entry, rank) => (
                  <li
                    key={entry.id}
                    className="rise relative flex items-center gap-4 rounded-[22px] bg-white p-3 pr-5 ring-1 ring-line"
                    // Third place appears first, then second, then the winner.
                    style={{ animationDelay: `${(top.length - 1 - rank) * 650 + 200}ms` }}
                  >
                    {rank === 0 && <Sparkles />}
                    <span aria-label={`Rank ${rank + 1}`} className={`medal-${rank + 1} h-4 w-4 shrink-0 rounded-full shadow-sm`} />
                    <Link href={`/g/${entry.generationId}`} className="shrink-0" aria-label="Open this meme">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={entry.imageUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                    </Link>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] leading-snug text-ink">“{entry.text}”</span>
                      <span className="mt-1 block text-xs">
                        <Author entry={entry} />
                      </span>
                    </span>
                    <span className="shrink-0 text-lg font-medium tabular-nums text-ink">{entry.score > 0 ? `+${entry.score}` : entry.score}</span>
                  </li>
                ))}
              </ol>
              {entries.length > top.length &&
                (showAll ? (
                  <ol aria-label="Every caption today" start={top.length + 1} className="flex w-full max-w-xl flex-col gap-1 text-left">
                    {entries.slice(top.length).map((entry, n) => (
                      <li key={entry.id} className="rise flex items-baseline gap-3 border-b border-line px-2 py-3" style={{ animationDelay: `${n * 30}ms` }}>
                        <span className="w-6 shrink-0 text-sm tabular-nums text-ink-3">{top.length + n + 1}</span>
                        <Link href={`/g/${entry.generationId}`} className="min-w-0 flex-1 text-[15px] text-ink hover:underline">
                          “{entry.text}”
                        </Link>
                        <span className="shrink-0 text-sm tabular-nums text-ink-2">{entry.score}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Quiet onClick={() => setShowAll(true)}>see all {entries.length} captions today</Quiet>
                ))}
            </>
          ))}

        {stage === "champ" &&
          (winner ? (
            <>
              <p className="text-sm text-ink-3">Yesterday&apos;s winner{winner.dailyPrompt ? ` · “${winner.dailyPrompt}”` : ""}</p>
              <Link href={`/g/${winner.generationId}`} className="rise relative">
                <Sparkles />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={winner.imageUrl} alt="" className="max-h-[30svh] rounded-[28px] object-contain shadow-[0_40px_80px_-40px_rgba(22,21,20,0.45)]" />
              </Link>
              <p className="word text-4xl sm:text-6xl">
                <Ink text={`“${winner.text}”`} delay={300} step={50} />
              </p>
              <p className="rise text-lg text-ink-2 [animation-delay:900ms]">
                {winner.authorType === "human" ? `${winner.authorName ?? "A classmate"} beat the AI` : "The AI took the crown"} · +{winner.score}
              </p>
            </>
          ) : (
            <>
              <h1 className="word text-6xl sm:text-8xl">
                <Ink text="No winner yesterday." />
              </h1>
              <p className="max-w-sm text-lg text-ink-2">Nobody upvoted a caption in time. Don&apos;t let that happen today.</p>
            </>
          ))}

        {stage === "score" && (
          <>
            <p className="text-sm text-ink-3">Humans vs AI · all time</p>
            {scoreboard.battles === 0 && scoreboard.humanWins + scoreboard.aiWins === 0 ? (
              <>
                <h1 className="word text-6xl sm:text-8xl">
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
                    <span className="word text-[clamp(5rem,18vw,10rem)] tabular-nums text-human">{scoreboard.humanWins}</span>
                    <span className="text-sm text-ink-2">humans</span>
                  </div>
                  <span className="word pb-10 text-3xl text-ink-3">vs</span>
                  <div className="rise flex flex-col items-center [animation-delay:250ms]">
                    <span className="word text-[clamp(5rem,18vw,10rem)] tabular-nums text-ai">{scoreboard.aiWins}</span>
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
            <Action href="/play">Play</Action>
            <Quiet href="/?start=choose">home</Quiet>
          </>
        )}
      </section>

      {stage !== "score" && <Action onClick={next}>{nextLabel[stage]}</Action>}
    </main>
  );
}
