"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { href: string; label: string; hint: string };

// No navigation bar. A small wordmark (back to the Create / Play choice) and
// one menu button that opens a full-screen menu with every other feature.
// On the opening screen ("/") it stays out of the way until the opening
// renders it itself, after "Let's go".
export function Menu({ signedIn, onOpening = false }: { signedIn: boolean; onOpening?: boolean }) {
  const pathname = usePathname();
  // Remembers which page the menu was opened on, so it closes by itself
  // after navigating anywhere.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = (value: boolean) => setOpenedOn(value ? pathname : null);

  // Close on Escape; lock page scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (pathname === "/" && !onOpening) return null;

  const gate = (path: string) => (signedIn ? path : `/login?next=${encodeURIComponent(path)}`);
  const primary: Item[] = [
    { href: gate("/create"), label: "Create", hint: "make a meme with AI" },
    { href: "/play", label: "Play", hint: "which caption's funnier?" },
  ];
  const secondary: Item[] = [
    { href: "/feed", label: "Feed", hint: "every meme, newest first" },
    { href: "/challenge", label: "Leaderboard", hint: "today's prompt and top captions" },
    { href: "/surprise", label: "Surprise me", hint: "a random photo to caption" },
    { href: "/feed#guess", label: "Human or AI?", hint: "the guessing game" },
    { href: gate("/me"), label: "My Era", hint: "your profile, posts and captions" },
    signedIn
      ? { href: "/profile", label: "Account", hint: "name, photo, sign out" }
      : { href: "/login", label: "Sign in", hint: "with Google" },
  ];

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pt-6">
        <Link
          href="/?start=choose"
          className="pointer-events-auto rounded-full px-1 text-[13px] font-medium tracking-tight text-ink-2 transition hover:text-ink"
        >
          morningside memes<span className="text-punch">.</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/70 ring-1 ring-line backdrop-blur transition hover:bg-white active:scale-95"
        >
          <span aria-hidden className="flex w-4 flex-col gap-[5px]">
            <span className="h-[1.5px] rounded-full bg-ink" />
            <span className="h-[1.5px] w-2/3 rounded-full bg-ink" />
          </span>
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="screen-in fixed inset-0 z-50 overflow-y-auto bg-background"
        >
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 pb-10 pt-[max(1rem,env(safe-area-inset-top))] sm:px-10 sm:pt-6">
            <div className="flex items-center justify-between">
              <Link href="/?start=choose" className="text-[13px] font-medium text-ink-2">
                morningside memes<span className="text-punch">.</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-line transition hover:bg-white active:scale-95"
              >
                <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav aria-label="Main" className="mt-10 flex flex-1 flex-col gap-10 sm:mt-16">
              <ul className="flex flex-col gap-1">
                {primary.map((item, i) => (
                  <li key={item.label} className="rise" style={{ animationDelay: `${i * 50}ms` }}>
                    <Link href={item.href} className="group flex items-baseline gap-4 py-1">
                      <span className="word text-6xl text-ink transition group-hover:translate-x-1 group-hover:text-punch sm:text-7xl">
                        {item.label}
                      </span>
                      <span className="text-sm text-ink-3">{item.hint}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <ul className="grid gap-x-8 border-t border-line pt-6 sm:grid-cols-2">
                {secondary.map((item, i) => (
                  <li key={item.label} className="rise" style={{ animationDelay: `${120 + i * 40}ms` }}>
                    <Link href={item.href} className="group flex flex-col py-3">
                      <span className="text-2xl font-medium tracking-tight text-ink transition group-hover:text-punch">
                        {item.label}
                      </span>
                      <span className="text-sm text-ink-3">{item.hint}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
