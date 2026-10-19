import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-5 px-4 py-20 text-center">
      <span className="orb animate-float flex h-24 w-24 items-center justify-center rounded-[30px] text-5xl">🫠</span>
      <p className="eyebrow">404</p>
      <h1 className="display text-5xl">
        This meme <span className="serif">doesn&apos;t exist.</span>
      </h1>
      <p className="text-ink-2">It may have been deleted, or the link is a little off.</p>
      <Link href="/" className="btn btn-primary btn-lg">
        Back to the battles
      </Link>
    </main>
  );
}
