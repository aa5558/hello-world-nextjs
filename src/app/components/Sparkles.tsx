// A one-time burst of neon particles after a successful action. Decorative;
// the reduced-motion rule shortens it to nothing.
const COLORS = ["#ff3cac", "#2de2ff", "#a3ff47", "#ffcf5a", "#a46bff"];
const BURST = [
  { x: "10%", y: "20%", dx: "-26px", dy: "-30px" },
  { x: "90%", y: "15%", dx: "28px", dy: "-26px" },
  { x: "50%", y: "2%", dx: "0px", dy: "-36px" },
  { x: "4%", y: "75%", dx: "-30px", dy: "18px" },
  { x: "96%", y: "80%", dx: "30px", dy: "20px" },
  { x: "70%", y: "98%", dx: "14px", dy: "30px" },
  { x: "30%", y: "98%", dx: "-14px", dy: "30px" },
  { x: "25%", y: "6%", dx: "-16px", dy: "-30px" },
];

export function Sparkles() {
  return (
    <span aria-hidden className="sparkle-burst">
      {BURST.map((s, i) => {
        const color = COLORS[i % COLORS.length];
        return (
          <i
            key={i}
            style={{
              left: s.x,
              top: s.y,
              background: color,
              boxShadow: `0 0 10px ${color}`,
              animationDelay: `${(i % 4) * 40}ms`,
              ["--dx" as string]: s.dx,
              ["--dy" as string]: s.dy,
            }}
          />
        );
      })}
    </span>
  );
}
