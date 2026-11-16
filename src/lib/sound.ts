"use client";

// Tiny synthesised sound cues (no audio files). OFF by default; the toggle
// in the top bar stores the choice in this browser only. Nothing ever
// autoplays: a cue only plays right after the user does something.

export type Cue = "enter" | "select" | "vote" | "publish" | "reveal";

const KEY = "mm-sound";
let ctx: AudioContext | null = null;

export function soundOn() {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function setSound(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: sound simply stays off.
  }
  window.dispatchEvent(new Event("mm-sound"));
}

function tone(freq: number, start: number, length: number, type: OscillatorType, gain: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + length);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + length + 0.05);
}

const CUES: Record<Cue, [number, number, number, OscillatorType, number][]> = {
  // A neon hum and a door: low buzz, then a soft rising pair.
  enter: [
    [110, 0, 0.5, "sawtooth", 0.025],
    [392, 0.25, 0.25, "sine", 0.06],
    [587, 0.4, 0.4, "sine", 0.05],
  ],
  select: [[660, 0, 0.12, "triangle", 0.06]],
  vote: [
    [523, 0, 0.12, "triangle", 0.07],
    [784, 0.08, 0.2, "triangle", 0.06],
  ],
  publish: [
    [523, 0, 0.18, "sine", 0.06],
    [659, 0.1, 0.18, "sine", 0.06],
    [784, 0.2, 0.18, "sine", 0.06],
    [1047, 0.3, 0.5, "sine", 0.05],
  ],
  reveal: [
    [392, 0, 0.15, "triangle", 0.05],
    [523, 0.12, 0.15, "triangle", 0.05],
    [784, 0.24, 0.6, "sine", 0.06],
  ],
};

export function play(cue: Cue) {
  if (typeof window === "undefined" || !soundOn()) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    for (const [f, s, l, t, g] of CUES[cue]) tone(f, s, l, t, g);
  } catch {
    // No audio available: silent.
  }
}
