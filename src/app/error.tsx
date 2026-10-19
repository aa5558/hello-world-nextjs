"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-5 px-4 py-20 text-center">
      <span className="orb flex h-24 w-24 items-center justify-center rounded-[30px] text-5xl">😵‍💫</span>
      <h1 className="display text-5xl">
        Something broke. <span className="serif">Not you, us.</span>
      </h1>
      <p className="text-ink-2">Give it another try in a second.</p>
      <button type="button" onClick={reset} className="btn btn-primary btn-lg">
        Try again
      </button>
    </main>
  );
}
