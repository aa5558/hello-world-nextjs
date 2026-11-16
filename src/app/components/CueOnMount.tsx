"use client";

import { useEffect } from "react";
import { play, type Cue } from "@/lib/sound";

// Plays a sound cue when a screen appears right after the user's own action
// (only if they switched sound on).
export function CueOnMount({ cue, delay = 0 }: { cue: Cue; delay?: number }) {
  useEffect(() => {
    const t = setTimeout(() => play(cue), delay);
    return () => clearTimeout(t);
  }, [cue, delay]);
  return null;
}
