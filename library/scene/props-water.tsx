import { useCurrentFrame } from "remotion";
import { hash } from "../core/math.ts";

// Waterfront props from the Butterworth promo (flat SVG). Each one is placed by
// its waterline / ground point and scaled with `s`, so it drops into any scene.
// Source: JIN-motion- src/butterworth/world/scenes/{Dawn,Ferry,Sunset}.tsx.

// Kampung house on stilts; `floor` = y of the floor, `water` = y where the stilts end.
export const StiltHouse: React.FC<{ x: number; w: number; h: number; floor: number; water: number; wall: string; roof: string; lit?: number }> = ({
  x,
  w,
  h,
  floor,
  water,
  wall,
  roof,
  lit = 0.8,
}) => {
  const legs = Math.max(3, Math.round(w / 60));
  return (
    <g>
      {new Array(legs + 1).fill(0).map((_, i) => (
        <rect key={i} x={x + (i / legs) * (w - 8)} y={floor} width={7} height={water - floor} fill="#3b2a3e" />
      ))}
      <rect x={x - 14} y={floor - 6} width={w + 28} height={10} fill="#4a3346" />
      <rect x={x} y={floor - h} width={w} height={h} fill={wall} />
      {new Array(Math.floor(h / 14)).fill(0).map((_, i) => (
        <line key={i} x1={x} x2={x + w} y1={floor - h + 14 * (i + 1)} y2={floor - h + 14 * (i + 1)} stroke="#000" strokeOpacity={0.08} strokeWidth={2} />
      ))}
      <path d={`M${x - 26},${floor - h + 6} L${x + w / 2},${floor - h - w * 0.36} L${x + w + 26},${floor - h + 6} Z`} fill={roof} />
      <rect x={x + w * 0.2} y={floor - h * 0.7} width={w * 0.18} height={h * 0.36} fill="#ffcf7a" opacity={lit} />
      <rect x={x + w * 0.58} y={floor - h * 0.7} width={w * 0.18} height={h * 0.36} fill="#ffcf7a" opacity={lit * 0.8} />
    </g>
  );
};

// Malay fishing boat with an upswept bow, heading left (flip with s < 0 via `facing`).
export const FishingBoat: React.FC<{ x: number; y: number; s?: number; hull: string; stripe: string; cabin?: boolean; man?: boolean; facing?: "left" | "right" }> = ({
  x,
  y,
  s = 1,
  hull,
  stripe,
  cabin = true,
  man = true,
  facing = "left",
}) => (
  <g transform={`translate(${x},${y}) scale(${facing === "left" ? s : -s},${s})`}>
    <path d="M-170,-40 C-150,-10 -120,8 -60,12 L150,12 C170,6 180,-10 184,-30 L-150,-30 C-160,-34 -166,-40 -170,-40 Z" fill={hull} />
    <path d="M-158,-30 L184,-30 L182,-20 L-140,-20 Z" fill={stripe} />
    <path d="M-150,-14 L176,-14 L172,-8 L-128,-8 Z" fill="#f4efe6" opacity={0.9} />
    <path d="M-176,-58 L-168,-38 L-160,-38 Z" fill={hull} />
    {cabin && (
      <g>
        <rect x={60} y={-84} width={92} height={54} fill="#f2e7d6" />
        <rect x={72} y={-74} width={26} height={20} fill="#6db5c9" />
        <rect x={110} y={-74} width={26} height={20} fill="#6db5c9" />
        <path d="M50,-84 L162,-84 L156,-96 L56,-96 Z" fill="#c8412d" />
        <line x1={100} y1={-96} x2={100} y2={-150} stroke="#3b2a3e" strokeWidth={4} />
        <path d="M100,-150 L132,-142 L100,-134 Z" fill="#c8412d" />
      </g>
    )}
    {man && (
      <g fill="#2f2236">
        <circle cx={-60} cy={-80} r={11} />
        <path d="M-74,-30 L-70,-68 L-50,-68 L-46,-30 Z" />
        <path d="M-80,-86 L-40,-86 L-60,-98 Z" />
      </g>
    )}
  </g>
);

// Wake behind a boat moving in direction `dir` (1 = to the right).
export const Wake: React.FC<{ x: number; y: number; dir?: 1 | -1; color?: string; opacity?: number }> = ({ x, y, dir = 1, color = "#e8f4f4", opacity = 0.6 }) => (
  <g fill="none" stroke={color} strokeLinecap="round" opacity={opacity}>
    {[0, 1, 2].map((i) => (
      <path
        key={i}
        d={`M${x - dir * (40 + i * 70)},${y - 4 + i * 12} Q${x - dir * (160 + i * 120)},${y + 4 + i * 22} ${x - dir * (320 + i * 180)},${y + 18 + i * 38}`}
        strokeWidth={6 - i * 1.5}
      />
    ))}
  </g>
);

// Passenger catamaran ferry, bow to the right; waterline at y.
export const Catamaran: React.FC<{ x: number; y: number; s?: number; band?: string; trim?: string }> = ({ x, y, s = 1, band = "#2c6fb0", trim = "#e8b04a" }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M-200,0 L190,0 C214,-6 228,-24 232,-44 L-214,-44 Z" fill="#f4f4f0" />
    <rect x={-210} y={-30} width={436} height={10} fill={band} />
    <rect x={-210} y={-18} width={430} height={6} fill={trim} />
    <path d="M-180,-44 L170,-44 L150,-104 L-150,-104 Z" fill="#ffffff" />
    {new Array(10).fill(0).map((_, i) => (
      <rect key={i} x={-140 + i * 29} y={-92} width={22} height={30} rx={3} fill="#3a5a7a" />
    ))}
    <path d="M-110,-104 L100,-104 L80,-138 L-90,-138 Z" fill="#f4f4f0" />
    {new Array(6).fill(0).map((_, i) => (
      <rect key={i} x={-76 + i * 26} y={-130} width={18} height={20} rx={3} fill="#3a5a7a" />
    ))}
    <rect x={-6} y={-170} width={8} height={34} fill="#5a5a6a" />
    <rect x={-210} y={-2} width={436} height={10} fill="#2a3a4a" opacity={0.6} />
  </g>
);

// Distant city skyline silhouette with one tall cylinder tower (drawn after
// Komtar, George Town). `lights` 0..1 turns windows on at dusk.
export const Skyline: React.FC<{ x: number; base: number; s?: number; color: string; lights?: number }> = ({ x, base, s = 1, color, lights = 0 }) => {
  const blocks: [number, number, number][] = [
    [-520, 40, 90], [-430, 70, 60], [-370, 55, 80], [-290, 110, 46], [-240, 60, 90], [-150, 150, 56], [-90, 90, 70],
    [-20, 70, 60], [120, 130, 50], [170, 80, 90], [260, 175, 60], [320, 100, 70], [390, 60, 110], [500, 120, 54], [560, 50, 120],
  ];
  return (
    <g transform={`translate(${x},${base}) scale(${s})`} fill={color}>
      {blocks.map(([bx, h, w], i) => (
        <rect key={i} x={bx} y={-h} width={w} height={h + 4} />
      ))}
      <rect x={40} y={-300} width={64} height={304} rx={10} />
      <rect x={34} y={-316} width={76} height={22} rx={6} />
      <rect x={70} y={-350} width={4} height={36} />
      {lights > 0 &&
        new Array(70).fill(0).map((_, i) => {
          const b = blocks[i % blocks.length];
          return (
            <rect
              key={i}
              x={b[0] + 6 + hash(i * 3.3) * (b[2] - 12)}
              y={-6 - hash(i * 5.1) * (b[1] - 12)}
              width={5}
              height={4}
              fill="#ffd98a"
              opacity={lights * (hash(i * 9.7) > 0.25 ? 1 : 0)}
            />
          );
        })}
      {lights > 0 && new Array(14).fill(0).map((_, i) => <rect key={`k${i}`} x={46 + (i % 2) * 34} y={-290 + i * 20} width={18} height={4} fill="#ffd98a" opacity={lights} />)}
    </g>
  );
};

// Long bridge deck with a cable-stayed main span (after the Penang Bridge), seen far away.
export const CableBridge: React.FC<{ x0: number; x1: number; y: number; color: string; lights?: number }> = ({ x0, x1, y, color, lights = 0 }) => {
  const p1 = x0 + (x1 - x0) * 0.42;
  const p2 = x0 + (x1 - x0) * 0.58;
  return (
    <g>
      <rect x={x0} y={y} width={x1 - x0} height={5} fill={color} />
      {new Array(Math.floor((x1 - x0) / 46)).fill(0).map((_, i) => (
        <rect key={i} x={x0 + i * 46} y={y + 4} width={3} height={10} fill={color} />
      ))}
      {[p1, p2].map((px) => (
        <g key={px}>
          <rect x={px - 3} y={y - 62} width={6} height={66} fill={color} />
          <rect x={px - 9} y={y - 56} width={18} height={3} fill={color} />
          {[1, 2, 3, 4].map((k) => (
            <g key={k} stroke={color} strokeWidth={1.2}>
              <line x1={px} y1={y - 60 + k * 4} x2={px - k * 30} y2={y} />
              <line x1={px} y1={y - 60 + k * 4} x2={px + k * 30} y2={y} />
            </g>
          ))}
        </g>
      ))}
      {lights > 0 &&
        new Array(Math.floor((x1 - x0) / 22)).fill(0).map((_, i) => (
          <circle key={i} cx={x0 + 8 + i * 22} cy={y - 1} r={2.2} fill="#ffe2a0" opacity={lights * (0.7 + 0.3 * Math.sin(i * 1.7))} />
        ))}
    </g>
  );
};

// Promenade lamp post standing on `ground`; `on` 0..1.
export const LampPost: React.FC<{ x: number; ground: number; on?: number; color?: string }> = ({ x, ground, on = 0, color = "#1c1428" }) => {
  const top = ground - 180;
  return (
    <g>
      {on > 0 && <circle cx={x} cy={top} r={70} fill="#ffcf7a" opacity={on * 0.28} />}
      <rect x={x - 5} y={top} width={10} height={180} fill={color} />
      <path d={`M${x - 20},${top + 6} L${x + 20},${top + 6} L${x + 12},${top - 12} L${x - 12},${top - 12} Z`} fill={color} />
      <circle cx={x} cy={top + 10} r={8} fill={on > 0 ? "#fff0c0" : "#3a2a3a"} opacity={0.4 + on * 0.6} />
    </g>
  );
};

// Railing along a promenade between x0 and x1; top rail at `y`.
export const Railing: React.FC<{ x0: number; x1: number; y: number; color?: string }> = ({ x0, x1, y, color = "#1c1428" }) => (
  <g fill={color}>
    <rect x={x0} y={y} width={x1 - x0} height={8} />
    <rect x={x0} y={y + 36} width={x1 - x0} height={5} />
    {new Array(Math.floor((x1 - x0) / 58) + 1).fill(0).map((_, i) => (
      <rect key={i} x={x0 + i * 58} y={y} width={7} height={80} />
    ))}
  </g>
);

// Two people on a bench seen from behind (silhouette), seat at `seat`.
export const BenchCouple: React.FC<{ x: number; seat: number; color?: string }> = ({ x, seat, color = "#140e1e" }) => (
  <g fill={color} transform={`translate(${x},${seat})`}>
    <rect x={0} y={0} width={220} height={12} />
    <rect x={10} y={10} width={10} height={40} />
    <rect x={200} y={10} width={10} height={40} />
    <rect x={0} y={-44} width={220} height={8} />
    <circle cx={70} cy={-80} r={20} />
    <path d="M46,4 Q40,-50 70,-60 Q100,-50 96,4 Z" />
    <circle cx={140} cy={-74} r={18} />
    <path d="M118,4 Q112,-44 140,-54 Q168,-44 164,4 Z" />
    <path d="M92,-36 Q106,-44 120,-36" stroke={color} strokeWidth={8} fill="none" />
  </g>
);

// Bobbing offset for floating things (px), deterministic per seed.
export const useBob = (amp = 4, speed = 0.11, phase = 0) => {
  const f = useCurrentFrame();
  return Math.sin(f * speed + phase) * amp;
};
