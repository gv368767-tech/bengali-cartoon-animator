// নতুন: চালকসহ যানবাহন, মন্দির/বাজার/মঞ্চের জিনিস — একই সরল-আকার (Shape) পদ্ধতিতে
import { C, CS, DARK, E, L, PA, PI, PO, R, Shape, Pose, abs, cos, f, sin, wheel } from "./shapes";
import { HUMANS, humanShapes } from "./human";
import * as P from "./props";

// ---------- আকার বদল: মাপ k, সরানো (dx,dy) — পথ (path)-ও ঠিকঠাক ----------
const ARGS: Record<string, number> = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7 };
function xfPath(d: string, k: number, dx: number, dy: number): string {
  const tok = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) ?? []; const out: string[] = []; let i = 0;
  while (i < tok.length) {
    const c = tok[i++]; const up = c.toUpperCase(), rel = c !== up; out.push(c);
    if (up === "Z") continue;
    const n = ARGS[up]; let first = true;
    while (i < tok.length && /^[-\d.]/.test(tok[i])) {
      const a = tok.slice(i, i + n).map(Number); i += n;
      const r = a.map((v, j) => {
        if (up === "A") return j < 2 ? v * k : j === 5 ? (rel ? v * k : v * k + dx) : j === 6 ? (rel ? v * k : v * k + dy) : v;
        if (up === "H") return rel ? v * k : v * k + dx;
        if (up === "V") return rel ? v * k : v * k + dy;
        const isX = j % 2 === 0; return rel ? v * k : v * k + (isX ? dx : dy);
      });
      out.push(r.map((v) => f(v)).join(" ")); first = false;
    }
  }
  return out.join(" ");
}
export function xf(S: Shape[], k: number, dx: number, dy: number): Shape[] {
  return S.map((s): Shape => {
    switch (s.t) {
      case "rect": return { ...s, x: s.x * k + dx, y: s.y * k + dy, w: s.w * k, h: s.h * k, r: (s.r ?? 0) * k };
      case "circle": return { ...s, x: s.x * k + dx, y: s.y * k + dy, r: s.r * k, sw: s.sw ? s.sw * k : s.sw };
      case "ellipse": return { ...s, x: s.x * k + dx, y: s.y * k + dy, rx: s.rx * k, ry: s.ry * k };
      case "line": return { ...s, x1: s.x1 * k + dx, y1: s.y1 * k + dy, x2: s.x2 * k + dx, y2: s.y2 * k + dy, w: s.w * k };
      case "path": return { ...s, d: xfPath(s.d, k, dx, dy), sw: s.sw ? s.sw * k : s.sw };
      case "poly": return { ...s, pts: s.pts.map((v, i) => v * k + (i % 2 ? dy : dx)) };
      case "img": return { ...s, e: s.e * k + dx, f: s.f * k + dy, s: s.s * k };   // ছবির আকার: বাইরের রূপান্তর e,f,s-এ
      default: return { ...s, x: s.x * k + dx, y: s.y * k + dy, w: s.w * k, h: s.h * k };
    }
  });
}

// ---------- চালক বসানো ----------
type Seat = { hip: [number, number]; hand: [number, number]; foot: [number, number] | ((ph: number) => [number, number]); k: number; look?: "front" | "side" };
function rider(id: string, p: Pose, s: Seat, moving: boolean): Shape[] {
  const k = s.k, drop = 38, dy = s.hip[1] + (112 - drop) * k, dx = s.hip[0];
  const foot = typeof s.foot === "function" ? s.foot(moving ? p.phase : 0) : s.foot;
  const ang = Math.atan2(foot[0] - s.hip[0], foot[1] - s.hip[1]);          // কোমর থেকে পা-দানি; সোজা-নিচ থেকে কোণ
  const hl: [number, number] = [(s.hand[0] - dx) / k, (s.hand[1] - dy) / k];
  const mc = { drop, bob: 0, jump: 0, sway: 0, sh: 0, lgA: [ang, ang] as [number, number], L: { h: hl }, R: { h: hl }, armsFront: true, noHold: true, prop: "none", expr: "smile" as const };
  return xf(humanShapes(HUMANS[id], { ...p, action: "sit", view: "side", mc, talk: 0, mouth: null }), k, dx, dy);
}
const moving = (p: Pose) => p.action === "walk" || p.action === "run";
const bump = (p: Pose) => (moving(p) ? sin(p.phase * 2) * 1.2 : 0);

// ---------- সাইকেল / স্কুটি / মোটরসাইকেল ----------
export const cycleRider = (id: string): ((p: Pose) => Shape[]) => (p) => {
  const ph = -p.phase * 1.5, px = cos(ph) * 12, py = sin(ph) * 12, b = bump(p);
  return [...P.bicycle(p), ...rider(id, p, { hip: [-20, -108 + b], hand: [50, -110 + b], foot: (q) => [-8 + cos(-q * 1.5) * 12, -42 + sin(-q * 1.5) * 12], k: 0.74 }, moving(p))];
};
const scootyBody = (p: Pose, c1: string, c2: string): { back: Shape[]; front: Shape[] } => {
  const b = bump(p), ph = -p.phase * 2;
  return {
    back: [...wheel(-64, -26 + b * 0, 26, ph, DARK, "#dfe3ea"), ...wheel(66, -26, 24, ph, DARK, "#dfe3ea"), PA(`M -88 -50 Q -86 -92 -40 -92 L -10 -92 L 10 -50 Z`, c1), R(-30, -52, 70, 12, c2, 5)],
    front: [PA("M 30 -48 Q 44 -50 52 -80 L 64 -112 L 74 -108 L 66 -78 Q 62 -50 70 -40 L 52 -34 Z", c1), L(56, -112, 74, -128, 6, "#4b4b55"), L(66, -130, 86, -130, 6, "#4b4b55"), C(80, -120, 7, "#ffe9a8"), R(-58, -96, 52, 10, DARK, 5)],
  };
};
export const scootyRider = (id: string, c1: string): ((p: Pose) => Shape[]) => (p) => {
  const v = scootyBody(p, c1, "#2b2b33"), b = bump(p);
  return [...v.back, ...rider(id, p, { hip: [-34, -86 + b], hand: [78, -128 + b], foot: [34, -46], k: 0.72 }, moving(p)), ...v.front];
};
export const motoRider = (id: string, c1: string): ((p: Pose) => Shape[]) => (p) => {
  const b = bump(p), ph = -p.phase * 2;
  const back = [...wheel(-72, -34, 34, ph, DARK, "#c7ccd6"), ...wheel(76, -34, 34, ph, DARK, "#c7ccd6"), L(-72, -34, -10, -66, 7, "#4b4b55"), L(76, -34, 58, -92, 7, "#4b4b55"), R(-70, -92 + b, 50, 10, DARK, 5), PA(`M -20 -62 Q 0 -84 34 -84 L 56 -76 L 50 -50 L -10 -48 Z`, c1), E(12, -44, 26, 14, "#6b7280"), L(-10, -44, -88, -50, 7, "#8c929c")];
  const front = [L(58, -92, 66, -118, 6, "#4b4b55"), L(58, -120, 80, -120, 6, "#4b4b55"), E(84, -108, 8, 11, "#ffe9a8"), PA("M 52 -92 Q 66 -96 76 -74 L 70 -60 L 56 -64 Z", c1)];
  return [...back, ...rider(id, p, { hip: [-38, -98 + b], hand: [70, -122 + b], foot: [10, -40], k: 0.68 }, moving(p)), ...front];
};

// ---------- অটো, গাড়ি, বাস, ট্রাক (চালকসহ) ----------
export const autoDriver = (p: Pose): Shape[] => {
  const b = bump(p), ph = -p.phase * 2;
  const back = [...wheel(-70, -30, 28, ph, DARK, "#f4c430"), ...wheel(74, -26, 24, ph, DARK, "#f4c430"), R(-118, -96, 170, 54, "#2f9e5b", 10), R(-118, -52, 170, 14, "#f4c430"), R(-104, -88, 66, 30, "#cfe6ff", 6), R(-26, -88, 26, 30, "#cfe6ff", 6)];
  const drv = rider("man", p, { hip: [38, -66 + b], hand: [66, -102 + b], foot: [66, -34], k: 0.5 }, moving(p));
  const front = [PA("M 54 -96 Q 80 -100 92 -60 L 96 -40 L 54 -40 Z", "#f4c430"), L(62, -100, 66, -120, 5, "#555"), R(10, -178, 4, 82, "#444"), R(86, -178, 4, 90, "#444"), PA("M -122 -176 Q -20 -204 94 -176 L 94 -166 Q -20 -190 -122 -166 Z", "#1f1f27"), E(98, -58, 5, 8, "#fff3a8")];
  return [...back, ...drv, ...front];
};
export const carDriver = (p: Pose): Shape[] => {
  const S = P.car(p), body = S[0], b = bump(p);
  const fill = (body as any).fill ?? "#e8453c";
  const drv = rider("man", p, { hip: [24, -40 + b], hand: [52, -80 + b], foot: [40, -20], k: 0.3 }, moving(p));
  const rest = S.slice(1).map((s) => (s.t === "poly" && (s as any).fill === "#bfe6ff" ? { ...s, op: 0.55 } : s));
  return [body, ...drv, R(-30, -80, 110, 44, fill, 0), ...rest.slice(0)];
};
export const busDriver = (p: Pose): Shape[] => {
  const ph = -p.phase * 2, b = bump(p);
  const body: Shape[] = [R(-150, -128, 300, 94, "#f4c430", 14)];
  const drv = rider("man", p, { hip: [128, -44 + b], hand: [150, -86 + b], foot: [138, -30], k: 0.3 }, moving(p));
  const out: Shape[] = [...body, ...drv, R(104, -70, 46, 30, "#f4c430", 0), R(-150, -74, 300, 14, "#2a7de1"), R(-150, -52, 300, 6, "#c9a010")];
  for (let i = 0; i < 5; i++) out.push(R(-135 + i * 54, -118, 44, 38, "#bfe6ff", 6));
  out.push(R(112, -118, 32, 60, "#bfe6ff", 6, 0.5), E(146, -70, 5, 9, "#fff3a8"), ...wheel(-90, -30, 28, ph), ...wheel(90, -30, 28, ph));
  return out;
};
export const truck = (p: Pose): Shape[] => {
  const ph = -p.phase * 2, b = bump(p);
  const cab: Shape[] = [PA("M 70 -40 L 70 -130 L 118 -130 L 150 -86 L 160 -80 L 160 -40 Z", "#d9534f")];
  const drv = rider("man", p, { hip: [108, -50 + b], hand: [130, -88 + b], foot: [120, -34], k: 0.28 }, moving(p));
  return [R(-170, -150, 230, 106, "#4a7fb5", 6), R(-170, -150, 230, 12, "#2f5f8f"), ...[0, 1, 2, 3].map((i) => L(-130 + i * 56, -138, -130 + i * 56, -48, 3, "#2f5f8f")), ...cab.slice(0, 1), ...drv,
    R(76, -128, 36, 30, "#cfe6ff", 4, 0.55), PA("M 112 -128 L 140 -94 L 112 -94 Z", "#cfe6ff", undefined, 0, 0.55), R(70, -60, 92, 20, "#d9534f", 0), R(66, -46, 100, 10, "#555", 3), E(158, -66, 5, 9, "#fff3a8"),
    ...wheel(-110, -28, 30, ph), ...wheel(-50, -28, 30, ph), ...wheel(110, -28, 30, ph)];
};

// ---------- বাজার ----------
const fruitHeap = (x: number, y: number, n: number): Shape[] => Array.from({ length: n }).map((_, i) => C(x + (i % 4) * 22 - 33 + (Math.floor(i / 4) % 2) * 11, y - Math.floor(i / 4) * 16, 11, ["#e63946", "#ff9f1c", "#ffd23f", "#8ab17d", "#9b5de5"][i % 5]));
export const fruitVan = (p: Pose): Shape[] => {
  const ph = -p.phase * 2, b = bump(p);
  return [PA("M -120 -40 L -120 -96 L 70 -96 L 70 -40 Z", "#ffffff"), R(-122, -100, 194, 12, "#e63946", 3), ...[0, 1, 2, 3, 4, 5].map((i) => PO([-122 + i * 33, -100 + b, -89 + i * 33, -100 + b, -105 + i * 33, -78 + b], i % 2 ? "#ffffff" : "#e63946")),
    R(-116, -64, 180, 22, "#a9773e", 4), ...fruitHeap(-84, -68, 12), PA("M 70 -40 L 70 -100 L 108 -100 L 140 -64 L 150 -58 L 150 -40 Z", "#2a9d8f"), PO([78, -94, 106, -94, 130, -66, 78, -66], "#cfe6ff"), E(148, -54, 5, 8, "#fff3a8"),
    ...wheel(-70, -26, 26, ph), ...wheel(100, -26, 26, ph), R(-100, -112, 4, 14, "#8a5a2b"), R(-40, -112, 4, 14, "#8a5a2b")];
};
export const handcart = (p: Pose): Shape[] => {
  const ph = -p.phase * 2.2, b = bump(p);
  return [R(-84, -76 + b, 156, 12, "#a9773e", 4), R(-84, -100 + b, 8, 30, "#8a5a2b"), R(64, -100 + b, 8, 30, "#8a5a2b"), ...fruitHeap(-50, -84 + b, 12), L(72, -70 + b, 140, -96 + b, 7, "#6b4a2a"), L(-84, -70, -84, -40, 6, "#6b4a2a"), L(-84, -40, -100, -40, 6, "#6b4a2a"),
    L(0, -64 + b, 0, -34, 6, "#6b4a2a"), ...wheel(0, -32, 32, ph, DARK, "#e8eaee"), PA("M -90 -118 Q 0 -150 84 -118", undefined, "#e63946", 6), L(-90, -118, -90, -100, 3, "#e63946"), L(84, -118, 84, -100, 3, "#e63946")];
};
export const fruitStall = (): Shape[] => [R(-120, -50, 240, 50, "#a9773e", 6), R(-130, -60, 260, 14, "#8a5a2b", 4), R(-124, -190, 6, 130, "#6b4a2a"), R(118, -190, 6, 130, "#6b4a2a"), R(-140, -200, 280, 16, "#e63946", 3),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => PO([-140 + i * 35, -184, -105 + i * 35, -184, -122 + i * 35, -158], i % 2 ? "#fff" : "#e63946")), ...fruitHeap(-88, -70, 8), ...fruitHeap(10, -70, 8), R(-100, -78, 80, 6, "#7a4a21", 2), R(0, -78, 90, 6, "#7a4a21", 2)];
export const veggieBasket = (): Shape[] => [PA("M -50 -44 Q -50 0 0 0 Q 50 0 50 -44 Z", "#c8963e"), ...[-30, -10, 10, 30].map((x) => L(x, -44, x * 0.7, -4, 2, "#8a6a2a")), ...[0, 1, 2, 3, 4].map((i) => C(-32 + i * 16, -52 - (i % 2) * 6, 13, ["#2f9e44", "#e63946", "#ff9f1c", "#9b5de5", "#2f9e44"][i])), PA("M -30 -60 q 6 -28 16 -6 q 4 -26 14 -2", "#3f9d4a")];
export const fishTray = (): Shape[] => [R(-70, -26, 140, 26, "#c7ccd6", 6), R(-64, -34, 128, 12, "#9aa0aa", 4), ...[0, 1, 2].flatMap((i) => [E(-40 + i * 40, -42, 22, 9, ["#8ea9c1", "#a8b8c8", "#7f9db5"][i]), PO([-18 + i * 40, -42, -4 + i * 40, -52, -4 + i * 40, -32], ["#8ea9c1", "#a8b8c8", "#7f9db5"][i]), C(-52 + i * 40, -44, 2, "#222")])];
export const weighScale = (): Shape[] => [R(-60, -26, 120, 26, "#8a5a2b", 5), R(-4, -120, 8, 94, "#6b7280"), L(-70, -116, 70, -116, 5, "#6b7280"), L(-70, -116, -86, -64, 2, "#555"), L(-70, -116, -54, -64, 2, "#555"), E(-70, -62, 26, 6, "#c7ccd6"), L(70, -116, 54, -64, 2, "#555"), L(70, -116, 86, -64, 2, "#555"), E(70, -62, 26, 6, "#c7ccd6"), C(-78, -72, 9, "#e63946"), C(-62, -72, 9, "#ff9f1c"), C(-70, -86, 9, "#ffd23f"), R(64, -76, 12, 12, "#555", 2), C(0, -120, 7, "#9aa0aa")];

// ---------- মন্দির ----------
export const diyaProp = (p: Pose): Shape[] => { const fl = sin(p.phase * 6) * 2.5; return [E(0, -6, 26, 8, "#c8742e"), E(0, -10, 22, 6, "#e8964a"), E(0, -12, 12, 3, "#7a3f12"), PO([-7, -13, fl * 0.6, -48, 7, -13], "#ffb703"), PO([-3.5, -13, fl * 0.3, -34, 3.5, -13], "#fff1a8"), C(0, -28, 36, "#ffd166", 0.2)]; };
export const bellProp = (p: Pose): Shape[] => { const a = sin(p.phase * 2.2) * 0.28, c = cos(a), s = sin(a), r = (x: number, y: number) => `${f(x * c - y * s)} ${f(x * s + y * c - 150)}`; return [R(-50, -158, 100, 10, "#8a5a2b", 3), L(0, -158, 0, -150, 4, "#6b4a2a"), PA(`M ${r(-34, 0)} Q ${r(-34, -64)} ${r(0, -72)} Q ${r(34, -64)} ${r(34, 0)} Z`, "#e0b341"), E(0, -150, 1, 1, "#e0b341", 0), C(0 + s * -3, -146 + 12 * 0, 7, "#b8860b"), PA(`M ${r(-34, 0)} Q ${r(0, 8)} ${r(34, 0)}`, undefined, "#b8860b", 4)]; };
export const incense = (p: Pose): Shape[] => { const out: Shape[] = [R(-30, -16, 60, 16, "#c8742e", 6), L(-10, -16, -6, -92, 3, "#8a5a2b"), L(0, -16, 0, -96, 3, "#8a5a2b"), L(10, -16, 6, -92, 3, "#8a5a2b"), C(-6, -92, 3, "#e63946"), C(0, -96, 3, "#e63946"), C(6, -92, 3, "#e63946")]; for (let i = 0; i < 4; i++) { const t = (p.phase * 0.35 + i * 0.25) % 1; out.push(C(sin(t * 7 + i) * 10, -98 - t * 70, 5 + t * 12, "#d9d9d9", 0.55 * (1 - t))); } return out; };
export const thaliProp = (): Shape[] => [E(0, -4, 46, 10, "#b8860b"), E(0, -8, 44, 9, "#f4c430"), E(0, -10, 36, 5, "#ffe08a"), ...[0, 1, 2, 3].map((i) => C(-28 + i * 18, -14 - (i % 2) * 2, 7, ["#ff9f1c", "#ff6b9d", "#ffd23f", "#e63946"][i])), E(0, -14, 9, 4, "#c8742e"), PO([-4, -16, 0, -36, 4, -16], "#ffb703"), PO([-2, -16, 0, -28, 2, -16], "#fff1a8"), C(-60, -10, 0, "#fff")];
export const altar = (p: Pose): Shape[] => { const fl = sin(p.phase * 5) * 2; return [R(-110, -34, 220, 34, "#8a5a2b", 5), R(-100, -66, 200, 34, "#a9773e", 5), PA("M -60 -66 L -60 -190 Q 0 -250 60 -190 L 60 -66 Z", "#6b2f12"), PA("M -50 -66 L -50 -186 Q 0 -236 50 -186 L 50 -66 Z", "#ffd9a0"), C(0, -150, 70, "#ffd16640"), C(0, -164, 22, "#4a6fa5"), R(-14, -142, 28, 60, "#4a6fa5", 10), E(0, -78, 40, 8, "#e63946"), PA("M -22 -184 Q 0 -214 22 -184", undefined, "#ffd166", 5), ...garlandShapes(), E(-84, -70, 10, 4, "#c8742e"), PO([-88, -73, -84 + fl, -96, -80, -73], "#ffb703"), E(84, -70, 10, 4, "#c8742e"), PO([80, -73, 84 - fl, -96, 88, -73], "#ffb703")]; };
const garlandShapes = (): Shape[] => Array.from({ length: 11 }).map((_, i) => { const t = i / 10; return C(-40 + 80 * t, -110 + Math.sin(t * PI) * 22, 6, i % 2 ? "#ff9f1c" : "#ff6b9d"); });
export const asana = (): Shape[] => [R(-60, -12, 120, 12, "#e63946", 4), R(-52, -8, 104, 4, "#ffd166", 2), ...[0, 1, 2, 3, 4].map((i) => C(-40 + i * 20, -6, 2.4, "#fff"))];
export const harmonium = (): Shape[] => [R(-62, -50, 124, 50, "#7a4a21", 6), R(-62, -50, 124, 8, "#a9773e", 4), ...Array.from({ length: 12 }).map((_, i) => R(-56 + i * 9.6, -44, 8, 26, "#fffdf2", 1)), ...[1, 2, 4, 5, 6, 8, 9].map((i) => R(-52 + i * 9.6, -44, 5, 16, "#222", 1)), R(-56, -76, 112, 26, "#8a5a2b", 4), L(-70, -62, -62, -62, 4, "#c0c0c0")];
export const flowerGarland = (): Shape[] => Array.from({ length: 14 }).flatMap((_, i) => { const t = i / 13, x = -90 + 180 * t, y = -80 + Math.sin(t * PI) * 40; return [C(x, y, 9, i % 3 === 0 ? "#ff9f1c" : i % 3 === 1 ? "#ff6b9d" : "#ffd23f"), C(x, y, 3, "#c0392b")]; });

// ---------- মঞ্চ ও গান ----------
export const stage = (): Shape[] => [R(-190, -30, 380, 30, "#8a5a2b", 4), R(-190, -40, 380, 12, "#b8814a", 4), R(-170, -240, 340, 200, "#4b1a3d", 6), PA("M -170 -240 Q -110 -170 -90 -40 L -170 -40 Z", "#e63946"), PA("M 170 -240 Q 110 -170 90 -40 L 170 -40 Z", "#e63946"), R(-170, -250, 340, 14, "#ffd166", 4), ...[0, 1, 2, 3, 4, 5, 6].map((i) => C(-150 + i * 50, -243, 7, i % 2 ? "#fff3a8" : "#ffd23f")), PO([-60, -236, 60, -236, 120, -40, -120, -40], "#fff3a8", 0.12), E(0, -34, 150, 8, "#ffffff", 0.12)];
export const micStand = (): Shape[] => [L(0, 0, 0, -150, 5, "#3b3b44"), E(0, -4, 26, 6, "#3b3b44"), L(0, -150, 12, -166, 5, "#3b3b44"), C(14, -172, 10, "#9aa0aa"), C(14, -172, 10, "#c7ccd6", 0.5)];
export const speaker = (): Shape[] => [R(-34, -120, 68, 120, "#2b2b33", 8), C(0, -84, 20, "#4b4b55"), C(0, -84, 8, "#1b1b22"), C(0, -36, 11, "#4b4b55"), C(0, -36, 5, "#1b1b22"), R(-30, -116, 60, 4, "#ffffff22", 2)];
export const tabla = (): Shape[] => [E(-24, -26, 22, 26, "#c8742e"), E(-24, -52, 22, 8, "#f1e4c2"), C(-24, -52, 8, "#222"), E(30, -34, 18, 34, "#a9773e"), E(30, -68, 18, 7, "#f1e4c2"), C(30, -68, 6, "#222"), ...[0, 1, 2].map((i) => L(-44 + i * 6, -50, -40 + i * 6, -8, 1.6, "#6b4a2a"))];
export const bench = (): Shape[] => [R(-90, -66, 180, 12, "#9b6a35", 4), R(-90, -108, 180, 8, "#9b6a35", 3), R(-82, -54, 9, 54, "#5b3f24"), R(73, -54, 9, 54, "#5b3f24"), R(-82, -100, 7, 36, "#5b3f24"), R(75, -100, 7, 36, "#5b3f24")];
