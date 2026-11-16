// A one-time burst of small champagne sparkles. Decorative only; the global
// reduced-motion rule shortens it to nothing.
const BURST = [
  { x: "12%", y: "18%", dx: "-18px", dy: "-22px", d: "0ms" },
  { x: "88%", y: "14%", dx: "20px", dy: "-18px", d: "60ms" },
  { x: "50%", y: "4%", dx: "0px", dy: "-26px", d: "120ms" },
  { x: "6%", y: "80%", dx: "-22px", dy: "14px", d: "90ms" },
  { x: "94%", y: "78%", dx: "22px", dy: "16px", d: "30ms" },
  { x: "70%", y: "96%", dx: "10px", dy: "22px", d: "150ms" },
];

export function Sparkles() {
  return (
    <span aria-hidden className="sparkle-burst">
      {BURST.map((s, i) => (
        <i
          key={i}
          style={{ left: s.x, top: s.y, animationDelay: s.d, ["--dx" as string]: s.dx, ["--dy" as string]: s.dy }}
        />
      ))}
    </span>
  );
}
