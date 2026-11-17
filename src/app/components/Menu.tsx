"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { setSound, soundOn } from "@/lib/sound";
import { Tilt } from "./Tilt";

// The only chrome in the club:
// - the neon wordmark (always back to the two entrances),
// - a small tube label saying which room you're in,
// - a sound switch (off by default),
// - one button that opens the five places as lit signs.

function placeFor(pathname: string, mode: string | null) {
  if (pathname.startsWith("/create")) return "the studio";
  if (pathname.startsWith("/play")) {
    return mode === "guess" ? "the arena · human or ai?" : mode === "turn" ? "the arena · open mic" : "the arena";
  }
  if (pathname.startsWith("/explore") || pathname.startsWith("/g/")) return "the gallery";
  if (pathname.startsWith("/results")) return "the awards";
  if (pathname.startsWith("/you")) return "backstage";
  if (pathname.startsWith("/login")) return "the door";
  if (pathname.startsWith("/how")) return "how to play";
  return "";
}

function subscribe(cb: () => void) {
  window.addEventListener("mm-sound", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("mm-sound", cb);
    window.removeEventListener("storage", cb);
  };
}

export function SoundToggle() {
  const on = useSyncExternalStore(subscribe, soundOn, () => false);
  return (
    <button
      type="button"
      onClick={() => setSound(!on)}
      aria-pressed={on}
      aria-label={on ? "Sound on" : "Sound off"}
      title={on ? "Sound on" : "Sound off"}
      className={`pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border transition active:scale-95 ${
        on ? "border-green/70 text-green shadow-[0_0_18px_-4px_#a3ff47]" : "border-line text-ink-3 hover:text-ink"
      }`}
    >
      <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10v4h4l5 4V6L8 10H4z" />
        {on ? <path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" /> : <path d="M17 9l5 6M22 9l-5 6" />}
      </svg>
    </button>
  );
}

export function Menu({ signedIn, onOpening = false }: { signedIn: boolean; onOpening?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedOn(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (pathname === "/" && !onOpening) return null;

  const gate = (path: string) => (signedIn ? path : `/login?next=${encodeURIComponent(path)}`);
  const place = placeFor(pathname, searchParams.get("mode"));
  const places = [
    { href: gate("/create"), word: "Create", venue: "the studio", hint: "make a meme with AI", glow: "glow-pink", match: "/create" },
    { href: "/play", word: "Play", venue: "the arena", hint: "which caption's funnier?", glow: "glow-cyan", match: "/play" },
    { href: "/explore", word: "Explore", venue: "the gallery", hint: "every meme, one at a time", glow: "glow-violet", match: "/explore" },
    { href: "/results", word: "Results", venue: "the awards", hint: "who's winning today", glow: "glow-gold", match: "/results" },
    { href: gate("/you"), word: "You", venue: "backstage", hint: signedIn ? "your memes, captions, era" : "members only: sign in", glow: "glow-green", match: "/you" },
  ];

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center bg-gradient-to-b from-background via-background/80 to-transparent px-4 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8 sm:pt-5">
        <Link
          href="/?start=choose"
          aria-label="Morningside Memes, home"
          className="neon glow-pink pointer-events-auto justify-self-start text-2xl sm:text-3xl"
        >
          <span className="sm:hidden">mm.</span>
          <span className="hidden sm:inline">morningside.</span>
        </Link>
        <span aria-live="polite" className="tube glow-cyan text-[10px] sm:text-[11px]">
          {place}
        </span>
        <div className="flex items-center gap-2 justify-self-end">
          <SoundToggle />
          <button
            type="button"
            onClick={() => setOpenedOn(pathname)}
            aria-label="Places"
            aria-expanded={open}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-line bg-background/60 backdrop-blur transition hover:border-pink/70 hover:shadow-[0_0_18px_-4px_#ff3cac] active:scale-95"
          >
            <span aria-hidden className="grid grid-cols-2 gap-[3px]">
              <span className="h-[5px] w-[5px] rounded-full bg-pink shadow-[0_0_6px_#ff3cac]" />
              <span className="h-[5px] w-[5px] rounded-full bg-cyan shadow-[0_0_6px_#2de2ff]" />
              <span className="h-[5px] w-[5px] rounded-full bg-violet shadow-[0_0_6px_#a46bff]" />
              <span className="h-[5px] w-[5px] rounded-full bg-green shadow-[0_0_6px_#a3ff47]" />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Places" className="screen-in fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-md">
          <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-6 pb-10 pt-[max(1rem,env(safe-area-inset-top))] sm:px-10 sm:pt-6">
            <div className="flex items-center justify-between">
              <Link href="/?start=choose" className="neon glow-pink text-3xl">
                morningside.
              </Link>
              <button
                type="button"
                onClick={() => setOpenedOn(null)}
                aria-label="Close places"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-line transition hover:border-pink/70 active:scale-95"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav aria-label="Places" className="grid flex-1 content-center gap-3 py-10 sm:grid-cols-2 sm:gap-4">
              {places.map((p, i) => {
                const here = pathname.startsWith(p.match) || (p.match === "/explore" && pathname.startsWith("/g/"));
                return (
                  <Tilt key={p.word} className={`rise rounded-[24px] ${i === 0 ? "sm:col-span-2" : ""}`} style={{ animationDelay: `${i * 60}ms` }} max={6}>
                    <Link
                      href={p.href}
                      aria-current={here ? "page" : undefined}
                      className={`panel ${here ? `lit ${p.glow}` : ""} flex items-baseline justify-between gap-4 rounded-[24px] px-6 py-5 transition hover:border-white/20`}
                    >
                      <span className="flex flex-col">
                        <span className={`word ${p.glow} text-5xl sm:text-6xl`}>{p.word}</span>
                        <span className={`tube ${p.glow} mt-1 text-[11px]`}>{p.venue}</span>
                      </span>
                      <span className="text-right text-sm text-ink-3">{p.hint}</span>
                    </Link>
                  </Tilt>
                );
              })}
            </nav>
            <div className="flex flex-wrap gap-5">
              <Link href="/how" className="tube glow-cyan text-xs">
                how to play
              </Link>
              {!signedIn && (
                <Link href="/login" className="tube glow-green text-xs">
                  sign in with google
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
