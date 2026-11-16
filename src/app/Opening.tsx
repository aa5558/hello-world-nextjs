"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { Menu } from "@/app/components/Menu";
import { LIGHT, setRoomLight, Tilt } from "@/app/components/Tilt";
import { play } from "@/lib/sound";

type Stage = "door" | "entering" | "inside";

// The club.
// 1. The door: the screen starts dark; the sign flickers on; one action.
// 2. ENTER: the doors swing open and the sign rushes past the camera.
// 3. Inside: two lit entrances (the Studio and the Arena), and three small
//    signs for the Gallery, the Awards and Backstage.
export function Opening({ signedIn, skipIntro }: { signedIn: boolean; skipIntro: boolean }) {
  const [stage, setStage] = useState<Stage>(skipIntro ? "inside" : "door");

  useEffect(() => {
    if (stage !== "entering") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setStage("inside"), reduced ? 0 : 950);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => () => setRoomLight(null), []);

  if (stage !== "inside") {
    return (
      <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 text-center">
        {/* The door frame: a faint violet outline around the entrance. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[78svh] w-[min(88vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-t-[999px] border border-violet/25 shadow-[0_0_80px_-30px_#a46bff,inset_0_0_80px_-40px_#a46bff]"
        />
        <div className={`relative flex flex-col items-center ${stage === "entering" ? "walk-in" : ""}`}>
          <h1 className="flex flex-col items-center">
            <span className="neon glow-pink flicker-on text-[clamp(4.5rem,18vw,10rem)] [animation-delay:400ms]">morningside.</span>
            <span className="word glow-cyan flicker-on mt-3 text-[clamp(1.8rem,6vw,3.2rem)] [animation-delay:1500ms]">memes after dark.</span>
          </h1>
          <p className="tube glow-green flicker-on mt-8 text-sm sm:text-base [animation-delay:2500ms]">The club is open</p>
          <button
            type="button"
            onClick={() => {
              play("enter");
              setStage("entering");
            }}
            disabled={stage === "entering"}
            className="btn-neon btn-big glow-pink rise mt-12 [animation-delay:3000ms]"
          >
            Enter <span aria-hidden>→</span>
          </button>
        </div>
        {stage === "entering" && (
          <>
            <span aria-hidden className="door door-left" />
            <span aria-hidden className="door door-right" />
          </>
        )}
      </main>
    );
  }

  const createHref = signedIn ? "/create" : "/login?next=/create";

  return (
    <>
      <Suspense fallback={null}>
        <Menu signedIn={signedIn} onOpening />
      </Suspense>
      <main className="screen-in flex min-h-[100svh] flex-col items-center justify-center px-5 pb-12 pt-24 [perspective:1400px]">
        <p className="tube glow-violet mb-8 text-xs sm:mb-12">Pick a door</p>
        <div className="grid w-full max-w-5xl gap-5 sm:grid-cols-2 sm:gap-8">
          <Entrance
            href={createHref}
            word="Create"
            venue="The Studio"
            hint="Show it a moment. The AI writes the captions."
            glow="glow-pink"
            accent="glow-violet"
            light="pink"
            delay={80}
          />
          <Entrance
            href="/play"
            word="Play"
            venue="The Arena"
            hint="Two captions. Pick the funnier one."
            glow="glow-cyan"
            accent="glow-green"
            light="cyan"
            delay={200}
          />
        </div>
        <nav aria-label="More" className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-14">
          <SmallSign href="/explore" label="explore" venue="the gallery" glow="glow-violet" light="violet" />
          <SmallSign href="/results" label="results" venue="the awards" glow="glow-gold" light="gold" />
          <SmallSign href={signedIn ? "/you" : "/login?next=/you"} label="you" venue="backstage" glow="glow-green" light="green" />
        </nav>
      </main>
    </>
  );
}

// A large lit entrance: tilts toward the pointer, tints the room, presses in.
function Entrance({
  href,
  word,
  venue,
  hint,
  glow,
  accent,
  light,
  delay,
}: {
  href: string;
  word: string;
  venue: string;
  hint: string;
  glow: string;
  accent: string;
  light: keyof typeof LIGHT;
  delay: number;
}) {
  return (
    <Tilt className="rise rounded-[36px]" light={light} max={9} lift={30} style={{ animationDelay: `${delay}ms` }}>
      <Link
        href={href}
        onClick={() => play("select")}
        className={`panel lit ${glow} group flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-[36px] px-6 py-10 text-center transition sm:min-h-[22rem]`}
      >
        <span className={`tube ${accent} text-xs`}>{venue}</span>
        <span className={`word ${glow} text-[clamp(4.5rem,12vw,7.5rem)] transition-transform duration-300 [transform:translateZ(40px)] group-hover:scale-105`}>
          {word}
        </span>
        <span className="max-w-[17rem] text-[15px] text-ink-2">{hint}</span>
        <span aria-hidden className={`tube ${glow} mt-2 text-lg transition-transform group-hover:translate-x-1`}>
          →
        </span>
      </Link>
    </Tilt>
  );
}

function SmallSign({ href, label, venue, glow, light }: { href: string; label: string; venue: string; glow: string; light: keyof typeof LIGHT }) {
  return (
    <Tilt className="rounded-full" light={light} max={14} lift={10}>
      <Link href={href} aria-label={label} className={`chip-neon ${glow} px-5 py-2.5`}>
        <span className={`tube ${glow} text-[11px]`}>{venue}</span>
        <span className="text-ink-3">· {label}</span>
      </Link>
    </Tilt>
  );
}
