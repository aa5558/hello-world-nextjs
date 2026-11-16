"use client";

import Link from "next/link";
import { useState } from "react";
import { Suspense } from "react";
import { Menu } from "@/app/components/Menu";
import { Ink } from "@/app/components/ui";

// Screen 1: "hey." Then a question, then one action.
// Screen 2: two choices, Create or Play.
export function Opening({ signedIn, skipIntro }: { signedIn: boolean; skipIntro: boolean }) {
  const [stage, setStage] = useState<"hello" | "choose">(skipIntro ? "choose" : "hello");

  if (stage === "hello") {
    return (
      <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
        <h1 className="word rise text-[clamp(6rem,24vw,15rem)] text-ink">hey.</h1>
        <p className="mt-6 text-xl text-ink-2 sm:text-2xl">
          <Ink text="Ready to make something funny?" delay={700} />
        </p>
        <button
          type="button"
          onClick={() => setStage("choose")}
          className="rise group mt-12 inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-lg font-medium text-white transition hover:scale-[1.03] active:scale-[0.97]"
          style={{ animationDelay: "1300ms" }}
        >
          Let&apos;s go
          <span aria-hidden className="transition-transform group-hover:translate-x-1">→</span>
        </button>
      </main>
    );
  }

  const createHref = signedIn ? "/create" : "/login?next=/create";

  return (
    <>
      <Suspense fallback={null}>
        <Menu signedIn={signedIn} onOpening />
      </Suspense>
      <main className="screen-in flex min-h-[100svh] flex-col items-center justify-center px-6">
        <p className="mb-10 text-sm text-ink-3 sm:mb-14"><Ink text="What do you feel like?" /></p>
        <div className="flex w-full max-w-4xl flex-col items-stretch gap-4 sm:flex-row sm:gap-6">
          <Choice href={createHref} word="Create" hint="Make a meme. The AI writes the captions." delay={60} />
          <Choice href="/play" word="Play" hint="Two captions. Pick the funnier one." delay={160} />
        </div>
        <nav aria-label="More" className="rise mt-12 flex items-center gap-3 text-[15px] text-ink-3" style={{ animationDelay: "320ms" }}>
          <Link href="/explore" className="underline-offset-4 transition hover:text-ink hover:underline">explore</Link>
          <span aria-hidden>·</span>
          <Link href="/results" className="underline-offset-4 transition hover:text-ink hover:underline">results</Link>
          <span aria-hidden>·</span>
          <Link href={signedIn ? "/you" : "/login?next=/you"} className="underline-offset-4 transition hover:text-ink hover:underline">you</Link>
        </nav>
      </main>
    </>
  );
}

function Choice({ href, word, hint, delay }: { href: string; word: string; hint: string; delay: number }) {
  return (
    <Link
      href={href}
      className="rise group relative flex flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-[32px] px-6 py-12 text-center ring-1 ring-line transition duration-300 hover:bg-white hover:shadow-[0_30px_60px_-30px_rgba(22,21,20,0.25)] hover:ring-transparent active:scale-[0.98] sm:py-24"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="word text-[clamp(4rem,14vw,8.5rem)] uppercase tracking-[-0.02em] text-ink transition duration-300 group-hover:text-punch">
        {word}
      </span>
      <span className="max-w-[16rem] text-[15px] text-ink-2">{hint}</span>
      <span aria-hidden className="text-xl text-ink-3 transition duration-300 group-hover:translate-x-1 group-hover:text-punch">
        →
      </span>
    </Link>
  );
}
