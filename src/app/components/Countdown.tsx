"use client";

import { useEffect, useState } from "react";
import { msUntilNextChallenge } from "@/lib/captions";

function format(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

// Time left in today's challenge, ticking once a minute.
export function Countdown({ initialMs }: { initialMs: number }) {
  const [ms, setMs] = useState(initialMs);

  useEffect(() => {
    const tick = () => setMs(msUntilNextChallenge());
    tick();
    const timer = setInterval(tick, 30_000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="tabular-nums" suppressHydrationWarning>
      {format(ms)}
    </span>
  );
}
