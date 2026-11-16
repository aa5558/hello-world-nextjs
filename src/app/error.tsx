"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-5 text-center">
      <h1 className="word text-6xl sm:text-8xl">Something broke.</h1>
      <p className="text-lg text-ink-2">Not you, us. Give it another try in a second.</p>
      <button type="button" onClick={reset} className="inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-lg font-medium text-white transition hover:scale-[1.03]">
        Try again <span aria-hidden>→</span>
      </button>
    </main>
  );
}
