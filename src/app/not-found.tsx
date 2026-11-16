import Link from "next/link";

export default function NotFound() {
  return (
    <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-5 text-center">
      <h1 className="word text-6xl sm:text-8xl">Hmm. Nothing here.</h1>
      <p className="text-lg text-ink-2">It may have been deleted, or the link is a little off.</p>
      <Link href="/?start=choose" className="inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-lg font-medium text-white transition hover:scale-[1.03]">
        Home <span aria-hidden>→</span>
      </Link>
    </main>
  );
}
