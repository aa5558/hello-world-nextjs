import Link from "next/link";

export default function NotFound() {
  return (
    <main className="screen-in mx-auto flex min-h-[100svh] w-full max-w-2xl flex-col items-center justify-center gap-6 px-5 text-center">
      <h1 className="word glow-violet text-6xl sm:text-8xl">Hmm. Nothing here.</h1>
      <p className="text-lg text-ink-2">It may have been deleted, or the link is a little off.</p>
      <Link href="/?start=choose" className="btn-neon glow-pink">
        Home <span aria-hidden>→</span>
      </Link>
    </main>
  );
}
