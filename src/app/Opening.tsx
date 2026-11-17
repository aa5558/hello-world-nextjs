"use client";

import Link from "next/link";
import { useEffect, useState, Suspense, type ReactNode } from "react";
import { Menu } from "@/app/components/Menu";
import { LIGHT, setRoomLight, Tilt } from "@/app/components/Tilt";
import { Glove } from "@/app/components/Glove";
import { RoundClock } from "@/app/components/RoundClock";
import { play, primeAudio } from "@/lib/sound";

type Stage = "door" | "inside";

// The entrance timeline (ms), matching the keyframes in globals.css.
const IMPACT = 962;
const COVERED = 1850;
const DONE = 2650;

const SPARKS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + (i % 2 ? 0.2 : 0);
  const dist = 22 + (i % 3) * 9;
  return {
    dx: `${Math.cos(angle) * dist}vmin`,
    dy: `${Math.sin(angle) * dist}vmin`,
    color: ["#ff3cac", "#2de2ff", "#ffffff", "#ffcf5a"][i % 4],
    size: 6 + (i % 3) * 4,
  };
});

// CAPTION WARS.
// 1. The title card: CAPTION (pink) WARS (blue), one action.
// 2. ENTER THE ARENA: two gloves fly in, collide (flash, shockwave, sparks,
//    shake, optional punch sound), fly at the camera until they fill the
//    screen, then split apart like doors to reveal the arena.
// 3. Inside: the Studio and the Arena, plus small signs for the rest.
export function Opening({
  signedIn,
  skipIntro,
  msLeft,
  championSign,
}: {
  signedIn: boolean;
  skipIntro: boolean;
  msLeft: number;
  championSign: ReactNode;
}) {
  const [stage, setStage] = useState<Stage>(skipIntro ? "inside" : "door");
  const [entering, setEntering] = useState(false);

  useEffect(() => () => setRoomLight(null), []);

  // Run the timeline once ENTER is pressed.
  useEffect(() => {
    if (!entering) return;
    const timers = [
      setTimeout(() => play("punch"), IMPACT),
      // The screen is fully covered: swap in the arena underneath.
      setTimeout(() => setStage("inside"), COVERED),
      setTimeout(() => setEntering(false), DONE),
    ];
    return () => timers.forEach(clearTimeout);
  }, [entering]);

  function enter() {
    if (entering || stage !== "door") return; // no double entrances
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage("inside");
      return;
    }
    primeAudio();
    setEntering(true);
  }

  const overlay = entering && (
    <div className="entrance" aria-hidden>
      <div className="entrance-half left">
        <Glove tone="pink" className="entrance-glove" />
      </div>
      <div className="entrance-half right">
        <Glove tone="blue" mirror className="entrance-glove" />
      </div>
      <div className="impact-flash" />
      <div className="impact-ring" />
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="impact-spark"
          style={{
            width: s.size,
            height: s.size,
            background: s.color,
            boxShadow: `0 0 14px ${s.color}, 0 0 4px #fff`,
            ["--dx" as string]: s.dx,
            ["--dy" as string]: s.dy,
          }}
        />
      ))}
    </div>
  );

  const createHref = signedIn ? "/create" : "/login?next=/create";

  // One stable tree: [menu, entrance overlay, screen]. The overlay keeps its
  // place when the screen swaps underneath it, so its animation never restarts.
  return (
    <>
      {stage === "inside" && (
        <Suspense fallback={null}>
          <Menu signedIn={signedIn} onOpening />
        </Suspense>
      )}
      {overlay}
      {stage === "door" ? (
        <main className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-clip px-6 text-center">
          <div aria-hidden className="arena-floor" />
          <div
            className={`relative flex flex-col items-center ${entering ? "title-recede" : ""}`}
          >
            <h1 className="flex flex-col items-center gap-1 sm:gap-2">
              <span className="fight glow-pink flicker-on text-[clamp(3.2rem,15vw,9rem)] [animation-delay:300ms]">
                Caption
              </span>
              <span className="fight glow-cyan flicker-on text-[clamp(3.2rem,15vw,9rem)] [animation-delay:900ms]">
                Wars
              </span>
            </h1>
            <p className="tube glow-gold rise mt-8 text-sm sm:text-base [animation-delay:1600ms]">
              May the funniest caption win.
            </p>
            <button
              type="button"
              onClick={enter}
              disabled={entering}
              className="btn-neon btn-big glow-pink rise mt-12 [animation-delay:2100ms]"
            >
              Enter the arena <span aria-hidden>→</span>
            </button>
          </div>
        </main>
      ) : (
        <main
          className={`${entering ? "" : "screen-in"} flex min-h-[100svh] flex-col items-center justify-center px-5 pb-12 pt-24 [perspective:1400px]`}
        >
          <div className="mb-8 flex flex-col items-center gap-2 sm:mb-12">
            <p className="tube glow-violet text-xs">Pick a door</p>
            <Link href="/results" className="chip-neon glow-cyan" aria-label="This round's countdown and standings">
              <RoundClock initialMs={msLeft} size="sm" />
            </Link>
          </div>
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
          {championSign}
          <nav
            aria-label="More"
            className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-14"
          >
            <SmallSign
              href="/explore"
              label="explore"
              venue="the gallery"
              glow="glow-violet"
              light="violet"
            />
            <SmallSign
              href="/results"
              label="results"
              venue="the awards"
              glow="glow-gold"
              light="gold"
            />
            <SmallSign
              href={signedIn ? "/you" : "/login?next=/you"}
              label="you"
              venue="backstage"
              glow="glow-green"
              light="green"
            />
            <SmallSign href="/how" label="how to play" venue="the rules" glow="glow-cyan" light="cyan" />
          </nav>
          {!signedIn && (
            <p className="mt-6 max-w-sm text-center text-xs text-ink-3">
              Look around freely. Sign in with Google when you want to create or vote.
            </p>
          )}
        </main>
      )}
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
    <Tilt
      className="rise rounded-[36px]"
      light={light}
      max={9}
      lift={30}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Link
        href={href}
        onClick={() => play("select")}
        className={`panel lit ${glow} group flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-[36px] px-6 py-10 text-center transition sm:min-h-[22rem]`}
      >
        <span className={`tube ${accent} text-xs`}>{venue}</span>
        <span
          className={`word ${glow} text-[clamp(4.5rem,12vw,7.5rem)] transition-transform duration-300 [transform:translateZ(40px)] group-hover:scale-105`}
        >
          {word}
        </span>
        <span className="max-w-[17rem] text-[15px] text-ink-2">{hint}</span>
        <span
          aria-hidden
          className={`tube ${glow} mt-2 text-lg transition-transform group-hover:translate-x-1`}
        >
          →
        </span>
      </Link>
    </Tilt>
  );
}

function SmallSign({
  href,
  label,
  venue,
  glow,
  light,
}: {
  href: string;
  label: string;
  venue: string;
  glow: string;
  light: keyof typeof LIGHT;
}) {
  return (
    <Tilt className="rounded-full" light={light} max={14} lift={10}>
      <Link
        href={href}
        aria-label={label}
        className={`chip-neon ${glow} px-5 py-2.5`}
      >
        <span className={`tube ${glow} text-[11px]`}>{venue}</span>
        <span className="text-ink-3">· {label}</span>
      </Link>
    </Tilt>
  );
}
