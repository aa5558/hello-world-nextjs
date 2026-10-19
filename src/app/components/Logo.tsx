import Link from "next/link";

// The glossy "mm" bubble plus the lowercase wordmark.
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="Morningside Memes home">
      <span className="orb flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-105">
        <span className="display text-[15px] text-ink">mm</span>
      </span>
      {!compact && (
        <span className="display text-[19px] leading-none text-ink">
          morningside memes<span className="text-sky">.</span>
        </span>
      )}
    </Link>
  );
}
