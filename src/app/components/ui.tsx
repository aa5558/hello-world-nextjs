"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

// The building blocks every screen shares, so the whole app speaks one
// language: one big word, one action, quiet secondary links.

// A full-screen, centred stage for one question.
export function Stage({
  children,
  wide = false,
  className = "",
}: {
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  return (
    <main
      className={`screen-in mx-auto flex min-h-[100svh] w-full ${wide ? "max-w-5xl" : "max-w-3xl"} flex-col items-center justify-center gap-6 px-5 pb-14 pt-24 text-center sm:gap-8 sm:px-8 ${className}`}
    >
      {children}
    </main>
  );
}

// Text that appears like invisible ink, one word at a time.
export function Ink({ text, delay = 0, step = 70 }: { text: string; delay?: number; step?: number }) {
  // Plain inline spans, so the text reads (and matches) as one sentence.
  return (
    <>
      {text.split(" ").map((word, i, words) => (
        <span key={i}>
          <span className="ink-word" style={{ animationDelay: `${delay + i * step}ms` }}>
            {word}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}

// The one big word (or sentence) on a screen.
export function Word({
  children,
  as: Tag = "h1",
  size = "lg",
  className = "",
}: {
  children: ReactNode;
  as?: "h1" | "h2" | "p";
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    md: "text-4xl sm:text-6xl",
    lg: "text-5xl sm:text-7xl",
    xl: "text-[clamp(5rem,20vw,12rem)]",
  };
  return <Tag className={`word text-balance text-ink ${sizes[size]} ${className}`}>{children}</Tag>;
}

const ACTION =
  "group inline-flex items-center justify-center gap-3 rounded-full px-8 py-4 text-lg font-medium transition hover:scale-[1.03] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
const TONES = {
  ink: "bg-ink text-white",
  punch: "bg-punch text-white shadow-[0_20px_40px_-20px_rgba(255,91,46,0.9)]",
  light: "bg-white text-ink ring-1 ring-line hover:ring-ink/25",
};

// The one primary action on a screen.
export function Action({
  href,
  onClick,
  children,
  tone = "ink",
  type = "button",
  disabled,
  arrow = true,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  tone?: keyof typeof TONES;
  type?: "button" | "submit";
  disabled?: boolean;
  arrow?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      {children}
      {arrow && (
        <span aria-hidden className="transition-transform group-hover:translate-x-1">
          →
        </span>
      )}
    </>
  );
  const cls = `${ACTION} ${TONES[tone]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}

// Secondary actions: small, quiet, underlined on hover.
export function Quiet({
  href,
  onClick,
  children,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const cls = `text-sm text-ink-3 underline-offset-4 transition hover:text-ink hover:underline ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

// Progress through a short sequence.
export function Dots({ count, current, label }: { count: number; current: number; label: string }) {
  return (
    <ol aria-label={`${label}: ${current + 1} of ${count}`} className="flex gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          className={`h-1.5 rounded-full transition-all duration-500 ${i === current ? "w-6 bg-ink" : i < current ? "w-1.5 bg-ink" : "w-1.5 bg-ice"}`}
        />
      ))}
    </ol>
  );
}

// A bottom sheet (centred card on desktop) for the few secondary actions.
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  // Rendered at the top of the page, so no animated parent can cover it.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
      <button type="button" aria-label="Close" onClick={onClose} className="screen-in absolute inset-0 bg-ink/25 backdrop-blur-[2px]" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-in relative w-full max-w-md rounded-t-[32px] bg-background px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3 text-left shadow-[0_-20px_60px_-20px_rgba(22,21,20,0.35)] outline-none sm:rounded-[32px] sm:pb-6"
      >
        <span aria-hidden className="mx-auto mb-4 block h-1 w-10 rounded-full bg-ice sm:hidden" />
        <p className="mb-4 text-sm text-ink-3">{title}</p>
        {children}
      </div>
    </div>,
    document.body
  );
}

// One row in a sheet.
export function SheetItem({
  onClick,
  href,
  children,
  danger = false,
}: {
  onClick?: () => void;
  href?: string;
  children: ReactNode;
  danger?: boolean;
}) {
  const cls = `flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-lg transition hover:bg-white ${danger ? "text-down-ink" : "text-ink"}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
