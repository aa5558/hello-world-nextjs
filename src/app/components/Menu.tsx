"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// The only chrome in the app:
// - the wordmark, which always takes you home (to the Create / Play choice),
// - a quiet label saying where you are,
// - one "places" button that opens five large words.
// On the opening screen it stays hidden until the opening shows it.

function placeFor(pathname: string, mode: string | null) {
  if (pathname.startsWith("/create")) return "create";
  if (pathname.startsWith("/play")) {
    return mode === "guess" ? "play · human or ai?" : mode === "turn" ? "play · your turn" : "play";
  }
  if (pathname.startsWith("/explore") || pathname.startsWith("/g/")) return "explore";
  if (pathname.startsWith("/results")) return "results";
  if (pathname.startsWith("/you")) return "you";
  if (pathname.startsWith("/login")) return "sign in";
  return "";
}

export function Menu({ signedIn, onOpening = false }: { signedIn: boolean; onOpening?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Remembers where the overlay was opened, so it closes itself after
  // navigating anywhere.
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
    { href: gate("/create"), word: "Create", hint: "make a meme with AI", match: "/create" },
    { href: "/play", word: "Play", hint: "which caption's funnier?", match: "/play" },
    { href: "/explore", word: "Explore", hint: "one meme at a time", match: "/explore" },
    { href: "/results", word: "Results", hint: "who's winning today", match: "/results" },
    { href: gate("/you"), word: "You", hint: signedIn ? "your memes, captions, era" : "sign in first", match: "/you" },
  ];

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center bg-gradient-to-b from-background via-background/85 to-transparent px-5 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pt-6">
        <Link
          href="/?start=choose"
          aria-label="Morningside Memes, home"
          className="pointer-events-auto justify-self-start rounded-full text-[13px] font-medium tracking-tight text-ink-2 transition hover:text-ink"
        >
          <span className="sm:hidden">mm</span>
          <span className="hidden sm:inline">morningside memes</span>
          <span className="text-punch">.</span>
        </Link>
        <span aria-live="polite" className="text-[12px] tracking-wide text-ink-3">
          {place}
        </span>
        <button
          type="button"
          onClick={() => setOpenedOn(pathname)}
          aria-label="Places"
          aria-expanded={open}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center justify-self-end rounded-full bg-background/70 ring-1 ring-line backdrop-blur transition hover:bg-white active:scale-95"
        >
          <span aria-hidden className="grid grid-cols-2 gap-[3px]">
            <span className="h-[5px] w-[5px] rounded-full bg-ink" />
            <span className="h-[5px] w-[5px] rounded-full bg-ink" />
            <span className="h-[5px] w-[5px] rounded-full bg-ink" />
            <span className="h-[5px] w-[5px] rounded-full bg-punch" />
          </span>
        </button>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Places" className="screen-in fixed inset-0 z-50 overflow-y-auto bg-background">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 pb-10 pt-[max(1rem,env(safe-area-inset-top))] sm:px-10 sm:pt-6">
            <div className="flex items-center justify-between">
              <Link href="/?start=choose" className="text-[13px] font-medium text-ink-2">
                morningside memes<span className="text-punch">.</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpenedOn(null)}
                aria-label="Close places"
                className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-line transition hover:bg-white active:scale-95"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <nav aria-label="Places" className="flex flex-1 flex-col justify-center gap-1 py-10">
              {places.map((p, i) => {
                const here = pathname.startsWith(p.match) || (p.match === "/explore" && pathname.startsWith("/g/"));
                return (
                  <Link
                    key={p.word}
                    href={p.href}
                    aria-current={here ? "page" : undefined}
                    className="rise group flex items-baseline gap-4 py-1.5"
                    style={{ animationDelay: `${i * 55}ms` }}
                  >
                    <span className={`word text-6xl transition group-hover:translate-x-1 group-hover:text-punch sm:text-8xl ${here ? "text-punch" : "text-ink"}`}>
                      {p.word}
                    </span>
                    <span className="text-sm text-ink-3">{p.hint}</span>
                  </Link>
                );
              })}
            </nav>
            {!signedIn && (
              <Link href="/login" className="self-start text-sm text-ink-2 underline-offset-4 hover:underline">
                Sign in with Google
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
