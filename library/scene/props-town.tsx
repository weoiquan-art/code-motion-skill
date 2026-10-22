import { useCurrentFrame } from "remotion";
import { hash } from "../core/math.ts";
import { Wisps } from "./draw.tsx";

// Town props from the Butterworth promo (flat SVG, Malaysian / Chinese street
// look). They keep the coordinates they were drawn with and are moved into
// place with a transform, so the shapes are exactly the tested ones.
// `ground` = y where the prop stands. Text props take font-family strings
// (register the fonts first, see library/fonts).
// Source: JIN-motion- src/butterworth/world/scenes/{Food,Temple,Night,Art}.tsx.

const G_SHOP = 850; // ground the shophouse was drawn on
// Pre-war shophouse, 340 px wide, 624 px tall: shuttered upper floor, five-foot way, signboard.
export const Shophouse: React.FC<{
  x: number;
  ground: number;
  facade: string;
  shutter: string;
  sign?: string;
  signFont?: string;
  signColor?: string;
  arched?: boolean;
  gable?: boolean;
}> = ({ x, ground, facade: c, shutter: sh, sign, signFont = "serif", signColor = "#2b2622", arched = true, gable = false }) => {
  const w = 340;
  return (
    <g transform={`translate(0,${ground - G_SHOP})`}>
      <rect x={x - 4} y={226} width={w + 8} height={26} fill="#c66a4a" />
      {new Array(12).fill(0).map((_, k) => (
        <line key={k} x1={x + k * 30} x2={x + k * 30} y1={226} y2={252} stroke="#a2543a" strokeWidth={3} />
      ))}
      <rect x={x} y={250} width={w} height={350} fill={c} />
      <rect x={x} y={250} width={w} height={34} fill="#ffffff" opacity={0.35} />
      {gable && <path d={`M${x + w / 2 - 70},250 Q${x + w / 2},196 ${x + w / 2 + 70},250 Z`} fill={c} />}
      {[0, 1, 2].map((k) => {
        const wx = x + 52 + k * 92;
        return (
          <g key={k}>
            <rect x={wx - 6} y={318} width={68} height={176} fill="#ffffff" opacity={0.7} />
            {arched && <path d={`M${wx - 6},322 A34,34 0 0 1 ${wx + 62},322 Z`} fill="#ffffff" opacity={0.7} />}
            <rect x={wx} y={324} width={56} height={164} fill={sh} />
            {new Array(9).fill(0).map((_, n) => (
              <line key={n} x1={wx + 3} x2={wx + 53} y1={336 + n * 17} y2={336 + n * 17} stroke="#000" strokeOpacity={0.18} strokeWidth={3} />
            ))}
            <line x1={wx + 28} x2={wx + 28} y1={324} y2={488} stroke="#000" strokeOpacity={0.25} strokeWidth={2} />
          </g>
        );
      })}
      <rect x={x} y={250} width={16} height={350} fill="#ffffff" opacity={0.45} />
      <rect x={x + w - 16} y={250} width={16} height={350} fill="#000" opacity={0.06} />
      <rect x={x - 4} y={580} width={w + 8} height={22} fill="#fbf6ea" />
      <rect x={x} y={602} width={w} height={G_SHOP - 602} fill="#4a3a3a" />
      <rect x={x + 30} y={640} width={w - 60} height={G_SHOP - 640} fill="#f4c27a" opacity={0.75} />
      <rect x={x + 30} y={640} width={w - 60} height={G_SHOP - 640} fill="#000" opacity={0.18} />
      <rect x={x + w / 2 - 50} y={700} width={100} height={G_SHOP - 700} fill="#3a2a2a" opacity={0.5} />
      <circle cx={x + w / 2} cy={670} r={9} fill="#fff1c0" />
      <rect x={x - 6} y={602} width={30} height={G_SHOP - 602} fill={c} />
      <rect x={x + w - 24} y={602} width={30} height={G_SHOP - 602} fill={c} />
      <rect x={x - 6} y={602} width={30} height={G_SHOP - 602} fill="#000" opacity={0.12} />
      {sign && (
        <g>
          <rect x={x + 60} y={604} width={w - 120} height={44} rx={3} fill={signColor} />
          <text x={x + w / 2} y={636} textAnchor="middle" fill="#f2c96b" fontFamily={signFont} fontWeight={900} fontSize={30} letterSpacing="0.3em">
            {sign}
          </text>
        </g>
      )}
    </g>
  );
};

// A row of shophouses with the Butterworth palette. signs[i] = text or null.
const FACADES = ["#a8d8c8", "#f3d27a", "#f6b38e", "#9cc7ea", "#f2a7a0", "#f4e4c1", "#b9d98f", "#f3d27a"];
const SHUTTERS = ["#2f7d6b", "#3a6ea5", "#2f7d6b", "#9a4a3a", "#3a6ea5", "#2f7d6b", "#7a4a8a", "#3a6ea5"];
export const ShophouseRow: React.FC<{ x: number; ground: number; count: number; signs?: (string | null)[]; signFont?: string }> = ({
  x,
  ground,
  count,
  signs = [],
  signFont,
}) => (
  <g>
    {new Array(count).fill(0).map((_, i) => (
      <Shophouse
        key={i}
        x={x + i * 340}
        ground={ground}
        facade={FACADES[i % FACADES.length]}
        shutter={SHUTTERS[i % SHUTTERS.length]}
        sign={signs[i] ?? undefined}
        signFont={signFont}
        arched={i % 3 !== 1}
        gable={i % 2 === 0}
      />
    ))}
  </g>
);

// Chinese temple roof between x0 and x1 at eave height y, ridge height h:
// trapezoid face whose top edge IS the main ridge, eaves curling up, swallowtail ends.
// (A ridge bar placed on a triangular roof looks like a floating gold bar.)
export const TempleRoof: React.FC<{ x0: number; x1: number; y: number; h: number; tile: string; ridge: string }> = ({ x0, x1, y, h, tile, ridge }) => {
  const m = (x0 + x1) / 2;
  const w = x1 - x0;
  return (
    <g>
      <path
        d={`M${x0 - 46},${y - 40} Q${x0 + w * 0.05},${y + 8} ${x0 + w * 0.14},${y - h * 0.1} L${x0 + w * 0.22},${y - h} L${x1 - w * 0.22},${y - h} L${x1 - w * 0.14},${y - h * 0.1} Q${x1 - w * 0.05},${y + 8} ${x1 + 46},${y - 40} L${x1 + 10},${y + 10} L${x0 - 10},${y + 10} Z`}
        fill={tile}
      />
      {new Array(Math.floor(w / 26)).fill(0).map((_, i) => {
        const x = x0 + 13 + i * 26;
        return <line key={i} x1={x} y1={y + 6} x2={m + (x - m) * 0.56} y2={y - h + 4} stroke="#000" strokeOpacity={0.12} strokeWidth={3} />;
      })}
      <rect x={x0 + w * 0.2} y={y - h - 16} width={w * 0.6} height={18} rx={4} fill={ridge} />
      <path d={`M${x1 - w * 0.2},${y - h - 16} Q${x1 - w * 0.13},${y - h - 18} ${x1 - w * 0.1},${y - h - 58} Q${x1 - w * 0.15},${y - h - 30} ${x1 - w * 0.2},${y - h + 2} Z`} fill={ridge} />
      <path d={`M${x0 + w * 0.2},${y - h - 16} Q${x0 + w * 0.13},${y - h - 18} ${x0 + w * 0.1},${y - h - 58} Q${x0 + w * 0.15},${y - h - 30} ${x0 + w * 0.2},${y - h + 2} Z`} fill={ridge} />
      <rect x={x0 + 10} y={y + 6} width={w - 20} height={14} fill="#e8b04a" />
    </g>
  );
};

const CX = 1060;
const G_TEMPLE = 830;
// Temple hall with two side wings (≈ 1660 px wide at s = 1), centred on cx.
export const TempleHall: React.FC<{ cx: number; ground: number; s?: number; name?: string; nameFont?: string }> = ({ cx, ground, s = 1, name = "", nameFont = "serif" }) => {
  const f = useCurrentFrame();
  return (
    <g transform={`translate(${cx},${ground}) scale(${s}) translate(${-CX},${-G_TEMPLE})`}>
      {[-1, 1].map((d) => (
        <g key={d}>
          <rect x={CX + d * 620 - 190} y={520} width={380} height={G_TEMPLE - 520} fill="#f3e3c3" />
          <rect x={CX + d * 620 - 190} y={600} width={380} height={G_TEMPLE - 600} fill="#c8412d" opacity={0.9} />
          {[0, 1, 2].map((k) => (
            <rect key={k} x={CX + d * 620 - 150 + k * 110} y={640} width={70} height={110} rx={35} fill="#7a1f1a" />
          ))}
          <TempleRoof x0={CX + d * 620 - 210} x1={CX + d * 620 + 210} y={520} h={90} tile="#2f8a6a" ridge="#e0a23a" />
        </g>
      ))}
      <rect x={CX - 420} y={G_TEMPLE - 20} width={840} height={40} fill="#d9cdb8" />
      <rect x={CX - 470} y={G_TEMPLE + 10} width={940} height={30} fill="#cbbfa8" />
      <rect x={CX - 380} y={470} width={760} height={G_TEMPLE - 490} fill="#f6e9cf" />
      <rect x={CX - 380} y={470} width={760} height={50} fill="#2f5f8a" />
      {new Array(12).fill(0).map((_, i) => (
        <rect key={i} x={CX - 372 + i * 63} y={478} width={50} height={34} fill={i % 2 ? "#e8b04a" : "#3f8a6a"} opacity={0.85} />
      ))}
      {[-330, -200, 200, 330].map((dx) => (
        <g key={dx}>
          <rect x={CX + dx - 18} y={520} width={36} height={G_TEMPLE - 540} fill="#c8412d" />
          <rect x={CX + dx - 18} y={520} width={12} height={G_TEMPLE - 540} fill="#e0624a" />
          <rect x={CX + dx - 24} y={G_TEMPLE - 40} width={48} height={20} fill="#9a8a72" />
        </g>
      ))}
      <rect x={CX - 150} y={590} width={300} height={G_TEMPLE - 610} fill="#a3251c" />
      <line x1={CX} y1={590} x2={CX} y2={G_TEMPLE - 20} stroke="#6a1510" strokeWidth={4} />
      {new Array(5).fill(0).map((_, r) =>
        new Array(8).fill(0).map((__, c) => <circle key={`${r}-${c}`} cx={CX - 128 + c * 32 + (c >= 4 ? 16 : 0)} cy={620 + r * 40} r={5} fill="#e8b04a" />),
      )}
      <rect x={CX - 130} y={532} width={260} height={52} rx={4} fill="#1f1a1a" stroke="#e8b04a" strokeWidth={5} />
      {name && (
        <text x={CX} y={571} textAnchor="middle" fontFamily={nameFont} fontWeight={900} fontSize={36} fill="#f2c96b" letterSpacing="0.4em">
          {name}
        </text>
      )}
      <TempleRoof x0={CX - 460} x1={CX + 460} y={470} h={170} tile="#e07a2a" ridge="#e0a23a" />
      <circle cx={CX} cy={250} r={22} fill="#ff6a3a" />
      <circle cx={CX} cy={250} r={36} fill="#ffb347" opacity={0.35 + 0.15 * Math.sin(f * 0.12)} />
      {[-1, 1].map((d) => (
        <path key={d} d={`M${CX + d * 46},276 q${d * 30},-50 ${d * 70},-18 t${d * 70},-8 t${d * 56},18`} stroke="#3f8a6a" strokeWidth={14} fill="none" strokeLinecap="round" />
      ))}
    </g>
  );
};

// Bronze incense urn with sticks and rising smoke; (x, ground) = where its feet stand.
export const IncenseUrn: React.FC<{ x: number; ground: number; s?: number }> = ({ x, ground, s = 1 }) => (
  <g>
    <g transform={`translate(${x},${ground - 96 * s}) scale(${s})`}>
      <path d="M-120,-40 L120,-40 L100,60 L-100,60 Z" fill="#7a5a2a" />
      <rect x={-136} y={-56} width={272} height={20} rx={6} fill="#9a7a3a" />
      <path d="M-100,60 L-110,96 M100,60 L110,96 M0,60 L0,96" stroke="#5a4020" strokeWidth={14} />
      <circle cx={-136} cy={-20} r={16} fill="none" stroke="#9a7a3a" strokeWidth={8} />
      <circle cx={136} cy={-20} r={16} fill="none" stroke="#9a7a3a" strokeWidth={8} />
      {new Array(9).fill(0).map((_, i) => (
        <g key={i}>
          <line x1={-60 + i * 15} y1={-56} x2={-62 + i * 15} y2={-120 - (i % 3) * 10} stroke="#c8412d" strokeWidth={4} />
          <circle cx={-62 + i * 15} cy={-120 - (i % 3) * 10} r={3} fill="#ff8a3a" />
        </g>
      ))}
    </g>
    <Wisps x={x} y={ground - 226 * s} h={420 * s} n={5} color="#ffffff" width={8 * s} seed={41} drift={0.25} />
  </g>
);

// Hawker cart with a striped umbrella, glass case, steaming pot. `label` is painted on its side.
const G_CART = 850;
export const HawkerCart: React.FC<{ x: number; ground: number; label?: string; labelFont?: string; stripe?: string }> = ({
  x,
  ground,
  label = "",
  labelFont = "serif",
  stripe = "#d9433a",
}) => (
  <g transform={`translate(${x - 1190},${ground - G_CART})`}>
    <path d="M1180,560 L1500,560 L1480,520 L1200,520 Z" fill="#ffffff" />
    {new Array(7).fill(0).map((_, i) => (
      <path key={i} d={`M${1200 + i * 40},520 L${1240 + i * 40},520 L${1226 + i * 46},560 L${1180 + i * 46},560 Z`} fill={i % 2 ? "#ffffff" : stripe} />
    ))}
    <rect x={1196} y={560} width={6} height={160} fill="#6a5a4a" />
    <rect x={1478} y={560} width={6} height={160} fill="#6a5a4a" />
    <rect x={1190} y={720} width={300} height={130} fill="#b5703c" />
    <rect x={1190} y={720} width={300} height={16} fill="#8a4f24" />
    <rect x={1210} y={650} width={150} height={70} fill="#cfe8f0" opacity={0.75} stroke="#8a4f24" strokeWidth={4} />
    {new Array(5).fill(0).map((_, i) => (
      <rect key={i} x={1222 + i * 26} y={690} width={18} height={26} rx={3} fill={i % 2 ? "#f2c84a" : "#fbf6ea"} />
    ))}
    <rect x={1384} y={672} width={84} height={48} rx={8} fill="#c0c4c8" />
    <ellipse cx={1426} cy={672} rx={42} ry={9} fill="#9aa0a6" />
    <Wisps x={1426} y={660} h={200} n={4} color="#ffffff" width={9} seed={21} drift={0.1} />
    {label && (
      <text x={1340} y={800} textAnchor="middle" fontFamily={labelFont} fontWeight={900} fontSize={40} fill="#fff2c8" letterSpacing="0.2em">
        {label}
      </text>
    )}
    {[1230, 1450].map((wx) => (
      <g key={wx}>
        <circle cx={wx} cy={866} r={34} fill="#2b2b2b" />
        <circle cx={wx} cy={866} r={14} fill="#9aa0a6" />
      </g>
    ))}
  </g>
);

// Night hawker stall, left edge x, width w. `on` 0..1 lights it up. `glowId` must be unique per SVG.
const G_STALL = 880;
export const HawkerStall: React.FC<{
  x: number;
  w: number;
  ground: number;
  roof: string;
  on?: number;
  sign?: { zh: string; en?: string; color: string };
  signFont?: string;
  enFont?: string;
  grill?: boolean;
  cook?: boolean;
  glowId: string;
}> = ({ x, w, ground, roof, on = 1, sign, signFont = "serif", enFont = "sans-serif", grill = false, cook = false, glowId }) => {
  const f = useCurrentFrame();
  return (
    <g transform={`translate(0,${ground - G_STALL})`}>
      <defs>
        <linearGradient id={glowId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd9a0" stopOpacity={0.95} />
          <stop offset="100%" stopColor="#c0703a" stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <ellipse cx={x + w / 2} cy={G_STALL + 10} rx={w * 0.75} ry={60} fill="#ffb35c" opacity={0.25 * on} />
      <rect x={x + 10} y={560} width={8} height={G_STALL - 560} fill="#2a2440" />
      <rect x={x + w - 18} y={560} width={8} height={G_STALL - 560} fill="#2a2440" />
      <path d={`M${x - 30},580 L${x + w + 30},580 L${x + w},530 L${x},530 Z`} fill={roof} />
      <path d={`M${x - 30},580 L${x + w + 30},580 L${x + w + 30},592 L${x - 30},592 Z`} fill="#000" opacity={0.3} />
      <rect x={x + 18} y={592} width={w - 36} height={G_STALL - 690} fill="#2a2036" />
      <rect x={x + 18} y={592} width={w - 36} height={G_STALL - 690} fill={`url(#${glowId})`} opacity={0.2 + 0.8 * on} />
      <rect x={x + 40} y={650} width={w - 80} height={6} fill="#5a3a2a" />
      {new Array(Math.floor((w - 90) / 34)).fill(0).map((_, k) => (
        <rect key={k} x={x + 48 + k * 34} y={624} width={20} height={26} rx={4} fill={["#e8b04a", "#c8412d", "#6fae6a"][k % 3]} opacity={0.85} />
      ))}
      {cook && (
        <g fill="#1c1428">
          <circle cx={x + w * 0.62} cy={700} r={20} />
          <path d={`M${x + w * 0.62 - 34},${G_STALL - 98} Q${x + w * 0.62 - 30},724 ${x + w * 0.62},720 Q${x + w * 0.62 + 30},724 ${x + w * 0.62 + 34},${G_STALL - 98} Z`} />
          <rect x={x + w * 0.62 - 18} y={672} width={36} height={12} rx={6} fill="#f4f0e6" />
        </g>
      )}
      <rect x={x + 18} y={G_STALL - 100} width={w - 36} height={100} fill="#5a3a2a" />
      <rect x={x + 18} y={G_STALL - 100} width={w - 36} height={12} fill="#7a5a3a" />
      {new Array(Math.floor(w / 40)).fill(0).map((_, k) => (
        <g key={k}>
          <circle cx={x + 20 + k * 40} cy={600} r={14} fill="#ffcf7a" opacity={0.25 * on} />
          <circle cx={x + 20 + k * 40} cy={600} r={5} fill={on > 0.5 ? "#fff3d0" : "#6a5a4a"} />
        </g>
      ))}
      {sign && (
        <g>
          <rect x={x + w / 2 - 110} y={462} width={220} height={66} rx={8} fill="#1f1a2a" stroke={sign.color} strokeWidth={3} opacity={0.95} />
          <rect x={x + w / 2 - 110} y={462} width={220} height={66} rx={8} fill={sign.color} opacity={0.12 * on} />
          <text x={x + w / 2} y={sign.en ? 498 : 508} textAnchor="middle" fontFamily={signFont} fontWeight={900} fontSize={sign.en ? 30 : 38} fill={sign.color} opacity={0.35 + 0.65 * on} letterSpacing="0.2em">
            {sign.zh}
          </text>
          {sign.en && (
            <text x={x + w / 2} y={520} textAnchor="middle" fontFamily={enFont} fontWeight={700} fontSize={15} letterSpacing="0.3em" fill={sign.color} opacity={0.35 + 0.65 * on}>
              {sign.en}
            </text>
          )}
        </g>
      )}
      {grill && (
        <g>
          <rect x={x + 60} y={G_STALL - 130} width={200} height={30} fill="#3a2a2a" />
          <rect x={x + 66} y={G_STALL - 128} width={188} height={10} fill="#ff6a2a" opacity={0.6 + 0.4 * Math.sin(f * 0.5)} />
          {new Array(9).fill(0).map((_, k) => (
            <line key={k} x1={x + 74 + k * 20} y1={G_STALL - 132} x2={x + 64 + k * 20} y2={G_STALL - 160} stroke="#c98a5a" strokeWidth={4} />
          ))}
          <Wisps x={x + 160} y={G_STALL - 150} h={330} n={5} color="#cfc4d8" width={10} seed={61} drift={-0.2} />
        </g>
      )}
    </g>
  );
};

// Seated diner silhouette (nods a little); (x, seat) = bottom centre.
export const Diner: React.FC<{ x: number; seat: number; s?: number; seed?: number; color?: string }> = ({ x, seat, s = 1, seed = 0, color = "#0f0c1e" }) => {
  const f = useCurrentFrame();
  const nod = Math.sin(f * 0.08 + seed) * 2;
  return (
    <g transform={`translate(${x},${seat}) scale(${s})`} fill={color}>
      <circle cx={0} cy={-96 + nod} r={18} />
      <path d="M-24,-10 Q-26,-70 0,-76 Q26,-70 24,-10 Z" />
      <rect x={-22} y={-10} width={44} height={8} />
    </g>
  );
};

// Plastic stool and marble kopitiam table standing on `ground` (bottom at ground).
export const Stool: React.FC<{ x: number; ground: number; color: string }> = ({ x, ground, color }) => (
  <g fill={color} transform={`translate(0,${ground - 150})`}>
    <ellipse cx={x} cy={92} rx={34} ry={9} />
    <path d={`M${x - 30},94 L${x - 36},150 L${x + 36},150 L${x + 30},94 Z`} />
    <rect x={x - 20} y={110} width={40} height={22} fill="#000" opacity={0.15} />
  </g>
);
export const CafeTable: React.FC<{ x: number; ground: number }> = ({ x, ground }) => (
  <g transform={`translate(0,${ground - 156})`}>
    <rect x={x - 6} y={56} width={12} height={100} fill="#4a4a4a" />
    <ellipse cx={x} cy={152} rx={40} ry={8} fill="#4a4a4a" />
    <ellipse cx={x} cy={52} rx={86} ry={18} fill="#f4f2ec" />
    <ellipse cx={x} cy={58} rx={86} ry={18} fill="#d8d4c8" opacity={0.6} />
    <ellipse cx={x - 30} cy={44} rx={20} ry={7} fill="#ffffff" stroke="#3a6ea5" strokeWidth={3} />
    <rect x={x + 20} y={18} width={18} height={26} rx={4} fill="#c98a3a" opacity={0.9} />
  </g>
);

// Ginger cat sitting (tail flicks); (x, y) = body centre.
export const Cat: React.FC<{ x: number; y: number; color?: string }> = ({ x, y, color = "#e89a4a" }) => {
  const f = useCurrentFrame();
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={16} rx={30} ry={20} fill={color} />
      <circle cx={-24} cy={-4} r={16} fill={color} />
      <path d="M-36,-14 L-34,-30 L-24,-18 Z M-20,-18 L-14,-30 L-10,-14 Z" fill={color} />
      <path d={`M28,22 Q${52 + Math.sin(f * 0.15) * 10},10 ${44 + Math.sin(f * 0.15) * 14},-14`} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
};

// Bicycle leaning on a wall; (x, ground) = between the wheels.
export const Bicycle: React.FC<{ x: number; ground: number; color?: string }> = ({ x, ground, color = "#2b5f8a" }) => (
  <g transform={`translate(${x},${ground - 52})`} fill="none" stroke={color} strokeWidth={7} strokeLinecap="round">
    <circle cx={-80} cy={0} r={52} stroke="#2b2b2b" strokeWidth={8} />
    <circle cx={80} cy={0} r={52} stroke="#2b2b2b" strokeWidth={8} />
    <path d="M-80,0 L-20,-70 L60,-70 L80,0 M-20,-70 L0,0 L60,-70 M-80,0 L0,0" />
    <path d="M-30,-86 L-6,-86 M60,-70 L54,-100 L80,-104" />
  </g>
);

// Potted plant (terracotta); (x, ground) = pot base.
export const PottedPlant: React.FC<{ x: number; ground: number; leaf?: string }> = ({ x, ground, leaf = "#3f7f3a" }) => (
  <g transform={`translate(${x},${ground - 80})`}>
    <path d="M-34,20 L34,20 L26,80 L-26,80 Z" fill="#c66a4a" />
    {[0, 1, 2, 3, 4].map((k) => (
      <path key={k} d={`M0,22 q${-40 + k * 20},-60 ${-50 + k * 25},-${90 + (k % 2) * 30}`} stroke={leaf} strokeWidth={10} fill="none" strokeLinecap="round" />
    ))}
  </g>
);

// Top-down bowls / plate for food cards: "koayTeow" (clear broth, flat noodles,
// fish balls), "curryMee" (red curry, tofu puffs, prawns, cockles), "lohMee"
// (dark gravy, egg, braised pork), "nasiKandar" (rice flooded with curries).
// Radius ≈ 96, centred on (0, 0): wrap in <g transform="translate(x,y)">.
type DishKind = "koayTeow" | "curryMee" | "lohMee" | "nasiKandar";
const Noodles: React.FC<{ r: number; color: string; seed: number; wide?: boolean }> = ({ r, color, seed, wide }) => (
  <g fill="none" stroke={color} strokeWidth={wide ? 9 : 4} strokeLinecap="round" opacity={0.95}>
    {new Array(wide ? 7 : 12).fill(0).map((_, i) => {
      const a = hash(seed + i) * Math.PI * 2;
      const rr = r * (0.2 + hash(seed * 3 + i) * 0.55);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      const l = r * 0.5;
      return <path key={i} d={`M${x - l / 2},${y} q${l / 4},${-l / 5} ${l / 2},0 t${l / 2},0`} transform={`rotate(${hash(seed * 7 + i) * 180},${x},${y})`} />;
    })}
  </g>
);
export const Dish: React.FC<{ kind: DishKind }> = ({ kind }) => {
  const R = 96;
  if (kind === "nasiKandar") {
    return (
      <g>
        <circle r={R} fill="#ffffff" />
        <circle r={R - 10} fill="#f2ede4" />
        <path d="M-60,-10 Q-50,-62 4,-58 Q58,-50 56,4 Q40,56 -10,52 Q-58,40 -60,-10 Z" fill="#fbf6ea" />
        <path d="M-20,-6 Q10,-30 52,-6 Q56,40 0,46 Q-40,44 -30,14 Z" fill="#c9652a" opacity={0.85} />
        <path d="M-58,-30 Q-40,-50 -10,-40 Q-20,-14 -50,-6 Z" fill="#8a4a1e" opacity={0.85} />
        <path d="M8,-50 C40,-58 60,-30 44,-14 C30,-2 4,-16 0,-30 Z" fill="#a9561f" />
        <ellipse cx={-30} cy={30} rx={20} ry={16} fill="#ffffff" />
        <circle cx={-28} cy={30} r={8} fill="#f2b33a" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${18 + i * 12},${18 + i * 6} l18,-6 l2,6 z`} fill="#5f9a3a" />
        ))}
      </g>
    );
  }
  const broth = { koayTeow: "#f1d9a6", curryMee: "#e0672f", lohMee: "#5a3a22" }[kind];
  return (
    <g>
      <circle r={R} fill="#ffffff" />
      <circle r={R} fill="none" stroke="#3a6ea5" strokeWidth={6} strokeDasharray="6 10" opacity={0.5} />
      <circle r={R - 14} fill={broth} />
      <Noodles r={R - 20} color={kind === "koayTeow" ? "#fbf6ea" : "#f2c84a"} seed={kind.length * 11 + 3} wide={kind === "koayTeow"} />
      {kind === "koayTeow" &&
        [[-30, -24], [26, -30], [8, 26], [-34, 22]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={11} fill="#fffdf4" stroke="#e8e0cc" strokeWidth={2} />)}
      {kind === "curryMee" && (
        <g>
          {[[-30, -20], [24, 24]].map(([x, y], i) => (
            <rect key={i} x={x - 12} y={y - 12} width={24} height={24} rx={5} fill="#c98a3a" />
          ))}
          {[[20, -30], [-24, 30], [36, 0]].map(([x, y], i) => (
            <path key={i} d={`M${x - 10},${y} a10,10 0 1 1 14,9`} fill="none" stroke="#f08a6a" strokeWidth={7} strokeLinecap="round" />
          ))}
          <circle cx={0} cy={-6} r={9} fill="#9a1f1f" />
        </g>
      )}
      {kind === "lohMee" && (
        <g>
          <ellipse cx={-22} cy={-18} rx={22} ry={18} fill="#ffffff" />
          <circle cx={-22} cy={-18} r={10} fill="#f2a12a" />
          {[[22, 14], [6, 30]].map(([x, y], i) => (
            <rect key={i} x={x - 18} y={y - 9} width={36} height={18} rx={4} fill="#9a5a3a" />
          ))}
        </g>
      )}
      {new Array(10).fill(0).map((_, i) => (
        <circle key={i} cx={Math.cos(i * 2.4) * (20 + i * 5)} cy={Math.sin(i * 2.4) * (20 + i * 5)} r={3} fill={i % 2 ? "#5fa84a" : "#8a5a2a"} />
      ))}
    </g>
  );
};
