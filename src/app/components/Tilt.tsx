"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// Sets the colour of the room's light (the fog pool behind everything).
// RGB triplet, e.g. "45, 226, 255".
export function setRoomLight(rgb: string | null) {
  if (typeof document === "undefined") return;
  if (rgb) document.documentElement.style.setProperty("--room", rgb);
  else document.documentElement.style.removeProperty("--room");
}

export const LIGHT = {
  pink: "255, 60, 172",
  cyan: "45, 226, 255",
  green: "163, 255, 71",
  violet: "164, 107, 255",
  gold: "255, 207, 90",
} as const;

function canTilt() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// A physical object: tilts toward the pointer, catches a glare, lifts on
// hover, presses in on click, and can tint the room's light while hovered.
// On touch screens and with reduced motion it only does the press.
export function Tilt({
  children,
  className = "",
  max = 10,
  lift = 24,
  light,
  style,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  lift?: number;
  light?: keyof typeof LIGHT;
  style?: CSSProperties;
  as?: "div" | "span" | "figure";
}) {
  const ref = useRef<HTMLElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Read once on mount (media queries are client-only).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(canTilt());
  }, []);

  function onMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || !enabled) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${(x - 0.5) * 2 * max}deg`);
    el.style.setProperty("--rx", `${(0.5 - y) * 2 * max}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    // Tilt Neon's letterforms can rotate too (its XROT/YROT axes).
    el.style.setProperty("--rxn", `${Math.round((0.5 - y) * 2 * 40)}`);
    el.style.setProperty("--ryn", `${Math.round((x - 0.5) * 2 * 40)}`);
    el.style.setProperty("--my", `${y * 100}%`);
  }
  function onEnter() {
    const el = ref.current;
    if (!el) return;
    if (enabled) {
      el.dataset.active = "true";
      el.style.setProperty("--lift", `${lift}px`);
    }
    if (light) setRoomLight(LIGHT[light]);
  }
  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.dataset.active = "false";
    el.dataset.pressed = "false";
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--lift", "0px");
    el.style.setProperty("--rxn", "0");
    el.style.setProperty("--ryn", "0");
  }

  return (
    <Tag
      ref={ref as never}
      className={`tilt relative ${className}`}
      style={style}
      onPointerMove={onMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onPointerDown={() => ref.current && (ref.current.dataset.pressed = "true")}
      onPointerUp={() => ref.current && (ref.current.dataset.pressed = "false")}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      {children}
      <span aria-hidden className="tilt-glare" />
    </Tag>
  );
}
