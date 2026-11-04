import { C, DARK, E, L, PA, PO, Shape, Pose, abs, f, sin, PI } from "./shapes";

// পাখি ডানদিকে মুখ করে; পায়ের তলা y=0
export type BirdDef = {
  body: string; wing: string; belly?: string; beak: string; head: string; tailCol: string;
  size: number; legCol: string; comb?: boolean; longTail?: boolean; neckShine?: string; flatBill?: boolean; crest?: boolean;
};

export function birdShapes(d: BirdDef, p: Pose): Shape[] {
  const S: Shape[] = [];
  const k = d.size, ph = p.phase, flying = p.action === "fly";
  const flap = flying ? sin(ph) : p.action === "run" ? sin(ph) * 0.35 : 0;
  const dy = flying ? -50 * k - sin(ph) * 4 : p.action === "walk" || p.action === "run" ? -abs(sin(ph)) * 3 * k : 0;
  const bodyY = -34 * k + dy;
  // লেজ
  if (d.longTail) S.push(PO([-22 * k, bodyY, -88 * k, bodyY + 16 * k, -86 * k, bodyY + 30 * k, -20 * k, bodyY + 12 * k], d.tailCol));
  else S.push(PO([-24 * k, bodyY - 2 * k, -48 * k, bodyY - 14 * k - (d.comb ? 12 * k : 0), -46 * k, bodyY + 8 * k, -22 * k, bodyY + 12 * k], d.tailCol));
  // পা
  if (!flying) {
    const a = p.action === "walk" || p.action === "run" ? sin(ph) * 6 * k : 0;
    S.push(L(-4 * k, bodyY + 18 * k, -4 * k + a, -3, 3.5 * k, d.legCol), L(8 * k, bodyY + 18 * k, 8 * k - a, -3, 3.5 * k, d.legCol));
    S.push(L(-4 * k + a, -3, 6 * k + a, -3, 3 * k, d.legCol), L(8 * k - a, -3, 18 * k - a, -3, 3 * k, d.legCol));
  } else S.push(L(-2 * k, bodyY + 16 * k, 8 * k, bodyY + 26 * k, 3 * k, d.legCol));
  // শরীর
  S.push(E(0, bodyY, 28 * k, 20 * k, d.body));
  if (d.belly) S.push(E(5 * k, bodyY + 7 * k, 20 * k, 11 * k, d.belly));
  // ডানা
  const wa = flying ? -0.2 + flap * 1.0 : 0.15;
  const wx = -4 * k, wy = bodyY - 4 * k, wl = 38 * k;
  S.push(PO([wx, wy, wx - wl * Math.cos(wa + 0.2), wy - wl * Math.sin(wa + 0.9) * 1.2, wx - wl * 0.2 - 14 * k * Math.cos(wa), wy - wl * 0.2 * Math.sin(wa + 0.9) * 1.2 + 14 * k, wx - 10 * k, wy + 12 * k], d.wing));
  if (flying) S.push(PO([wx + 4 * k, wy - 2 * k, wx + wl * 0.7 * Math.cos(-wa), wy - wl * 1.0 * Math.sin(wa + 0.9), wx + 18 * k, wy + 8 * k], d.wing, 0.75));
  // মাথা
  const hx = 24 * k, hy = bodyY - 18 * k;
  if (d.neckShine) S.push(E(16 * k, bodyY - 8 * k, 14 * k, 14 * k, d.neckShine));
  S.push(C(hx, hy, 13 * k, d.head));
  if (d.comb) S.push(C(hx - 3 * k, hy - 14 * k, 5 * k, "#d62828"), C(hx + 3 * k, hy - 15 * k, 5 * k, "#d62828"), C(hx - 9 * k, hy - 11 * k, 4 * k, "#d62828"), E(hx + 12 * k, hy + 14 * k, 4 * k, 7 * k, "#d62828"));
  if (d.crest) S.push(PO([hx - 6 * k, hy - 10 * k, hx - 12 * k, hy - 26 * k, hx + 2 * k, hy - 12 * k], d.tailCol));
  const open = p.talk > 0.12 ? 7 * p.talk * k : 0;
  if (d.flatBill) S.push(E(hx + 18 * k, hy + 4 * k, 12 * k, 4.5 * k, d.beak));
  else S.push(PO([hx + 10 * k, hy - 3 * k, hx + 25 * k, hy + 2 * k - open * 0.2, hx + 10 * k, hy + 5 * k], d.beak), open ? PO([hx + 10 * k, hy + 5 * k, hx + 22 * k, hy + 6 * k + open, hx + 10 * k, hy + 9 * k], d.beak) : PO([hx + 10 * k, hy + 3 * k, hx + 10 * k, hy + 3 * k, hx + 10 * k, hy + 3 * k], d.beak));
  S.push(C(hx + 4 * k, hy - 3 * k, 2.8 * k, DARK), C(hx + 5 * k, hy - 4 * k, 0.9 * k, "#fff"));
  return S;
}

export const BIRDS: Record<string, BirdDef> = {
  crow: { body: "#26262e", wing: "#1b1b22", beak: "#4a4a55", head: "#26262e", tailCol: "#1b1b22", size: 1, legCol: "#3a3a44" },
  parrot: { body: "#3cb44b", wing: "#2a8f3a", belly: "#8de08a", beak: "#e63946", head: "#3cb44b", tailCol: "#e63946", size: 1, legCol: "#8a7a5a", longTail: true },
  pigeon: { body: "#9aa3b2", wing: "#7d8696", belly: "#c4cad6", beak: "#e8b4a0", head: "#8e98a8", tailCol: "#6e7686", size: 1.05, legCol: "#d77a8a", neckShine: "#7fc4a8" },
  duck: { body: "#fafafa", wing: "#e6e6e6", beak: "#ff9f1c", head: "#fafafa", tailCol: "#e6e6e6", size: 1.15, legCol: "#ff9f1c", flatBill: true },
  hen: { body: "#b5651d", wing: "#8b4513", belly: "#d99a5b", beak: "#f2b134", head: "#b5651d", tailCol: "#5a3318", size: 1.2, legCol: "#e0a030", comb: true },
};
