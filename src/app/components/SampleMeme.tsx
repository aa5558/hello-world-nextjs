import Link from "next/link";

// Shown only while a round has no submissions, so a first-time visitor sees
// how the game works. It is an illustration with an example caption, clearly
// labelled EXAMPLE. It is never saved, voted on, or ranked, and it
// disappears as soon as there's a real submission.
export function SampleMeme({ createHref, compact = false }: { createHref: string; compact?: boolean }) {
  return (
    <section aria-label="Example meme" className="flex w-full max-w-md flex-col items-center gap-5 text-center">
      <figure className="frame glow-violet relative w-full overflow-hidden !p-3 text-left">
        <span className="tube glow-gold absolute left-5 top-5 z-10 rounded-full border border-gold/60 bg-background/80 px-3 py-1 text-[10px]">
          Example
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sample-meme.svg" alt="Example illustration: a dorm laundry room where every dryer says 23 minutes left" className="aspect-[4/3] w-full rounded-[12px] object-cover" />
        <figcaption className="px-2 pb-1 pt-4">
          <span className="block text-[18px] leading-snug text-white">“Every dryer in the basement has said ‘23 min’ since I moved in.”</span>
          <span className="mt-2 block text-xs text-ink-3">An example to show the idea, not a real post. It isn&apos;t in the voting or the rankings.</span>
        </figcaption>
      </figure>
      {!compact && (
        <ol className="grid w-full gap-2 text-left text-sm text-ink-2">
          <li>
            <span className="tube glow-pink mr-2 text-[11px]">1</span>Post a photo for today&apos;s prompt. The AI writes four captions.
          </li>
          <li>
            <span className="tube glow-cyan mr-2 text-[11px]">2</span>Add your own caption, here or on anyone&apos;s photo.
          </li>
          <li>
            <span className="tube glow-gold mr-2 text-[11px]">3</span>Everyone votes blind. The top caption at midnight wins the round.
          </li>
        </ol>
      )}
      <p className="tube glow-gold text-base sm:text-lg">Think you can do better?</p>
      <Link href={createHref} className="btn-neon btn-big glow-pink">
        Create your caption <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
