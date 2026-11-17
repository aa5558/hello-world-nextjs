"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getChallengeDate, msUntilNextChallenge } from "@/lib/captions";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60].map((n) => String(n).padStart(2, "0"));
}

// The round clock. A round is one New York calendar day (midnight to
// midnight, America/New_York), the same day the database stamps on every
// post. It counts down to the real next midnight from this device's clock,
// so it's right after a refresh; at zero it shows NEW ROUND! and reloads the
// page's data so the new round (and its prompt) appears.
export function RoundClock({ initialMs, size = "lg" }: { initialMs: number; size?: "lg" | "sm" }) {
  const router = useRouter();
  const [ms, setMs] = useState(initialMs);
  const [rolled, setRolled] = useState(false);
  const startDay = useRef<string | null>(null);

  useEffect(() => {
    const tick = () => {
      setMs(msUntilNextChallenge());
      const day = getChallengeDate();
      startDay.current ??= day;
      if (day !== startDay.current) {
        // The bell: the day changed. Load the new round, celebrate briefly.
        startDay.current = day;
        setRolled(true);
        router.refresh();
        setTimeout(() => setRolled(false), 4000);
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [router]);

  const newRound = rolled || ms <= 1000;
  const [h, m, s] = parts(ms);

  if (size === "sm") {
    return (
      <span className="tube glow-cyan inline-flex items-center gap-2 text-[11px] tabular-nums" suppressHydrationWarning>
        {newRound ? "New round!" : <>next round in {h}:{m}:{s}</>}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3" role="timer" aria-live="off" aria-label={newRound ? "A new round has started" : `Next round starts in ${Number(h)} hours ${Number(m)} minutes`}>
      <p className="tube glow-cyan text-[11px] sm:text-xs">{newRound ? "The bell rang" : "Next round starts in"}</p>
      {newRound ? (
        <p className="fight glow-gold animate-pop text-4xl sm:text-6xl">New round!</p>
      ) : (
        <p className="round-clock flex items-baseline gap-1 sm:gap-2" suppressHydrationWarning>
          <Digits value={h} />
          <Colon />
          <Digits value={m} />
          <Colon />
          <Digits value={s} />
        </p>
      )}
      <p className="text-xs text-ink-3">Rounds run midnight to midnight, New York time. Top caption at the bell wins.</p>
    </div>
  );
}

function Digits({ value }: { value: string }) {
  return <span className="clock-digits glow-pink">{value}</span>;
}
function Colon() {
  return (
    <span aria-hidden className="clock-colon glow-cyan">
      :
    </span>
  );
}
