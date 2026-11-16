import Link from "next/link";

// A plum seal with a champagne rim, plus the serif wordmark.
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="Morningside Memes home">
      <span className="orb flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-105">
        <span className="serif text-[17px] leading-none">m</span>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="display text-[19px] text-ink">Morningside Memes</span>
          <span className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-gold-ink">
            The campus comedy club
          </span>
        </span>
      )}
    </Link>
  );
}
