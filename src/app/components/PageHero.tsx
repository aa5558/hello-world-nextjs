import type { ReactNode } from "react";

// The editorial header used at the top of inner pages.
export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="animate-fade-up flex flex-col gap-3">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display text-5xl text-ink sm:text-6xl">{title}</h1>
      {description && <p className="max-w-xl text-[17px] leading-relaxed text-ink-2">{description}</p>}
      {children}
    </header>
  );
}

export function EmptyCard({ emoji, title, body, children }: { emoji: string; title: string; body?: ReactNode; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <span className="orb flex h-16 w-16 items-center justify-center rounded-full text-3xl">{emoji}</span>
      <p className="display text-2xl">{title}</p>
      {body && <p className="max-w-sm text-sm text-ink-2">{body}</p>}
      {children && <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
