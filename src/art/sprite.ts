// ছবি-ভিত্তিক (PNG অংশ) চরিত্র: "নতুন স্টাইল" — অংশগুলো আলাদা, হাড়-রিগে ঘুরে অ্যানিমেশন হয়। সম্পূর্ণ অফলাইন।
import type { Action, Pose, Shape, View } from "./shapes";
import { R } from "./shapes";
import { SPRITES, SP } from "./sprites/data";

export type SpriteDef = { id: string; kind: "kid" | "deity"; k: number; ground: number; emo: boolean; actions: Exclude<Action, "auto" | "fly">[]; name: string };
const KID: SpriteDef["actions"] = ["stand", "walk", "run", "jump", "sit", "sleep", "dance", "talk", "wave", "clap", "angry", "laugh", "cry"];
const DEI: SpriteDef["actions"] = ["stand", "walk", "run", "jump", "dance", "talk", "wave", "bless"];
const DEI_E: SpriteDef["actions"] = [...DEI, "angry", "laugh", "cry"];
const kid = (id: string, name: string): SpriteDef => ({ id, name, kind: "kid", k: 0.32, ground: 1040, emo: true, actions: KID });
const dei = (id: string, name: string, emo = true): SpriteDef => ({ id, name, kind: "deity", k: 0.29, ground: 1070, emo, actions: emo ? DEI_E : DEI });
export const SPRITE_LIST: SpriteDef[] = [
  kid("boy", "ছেলে (নতুন)"), kid("girl", "মেয়ে (নতুন)"),
  dei("durga", "মা দুর্গা (নতুন)"), dei("lakshmi", "মা লক্ষ্মী (নতুন)"), dei("ganesha", "গণেশ (নতুন)", false), dei("shiva", "মহাদেব (নতুন)"), dei("saraswati", "মা সরস্বতী (নতুন)"),
  dei("krishna", "শ্রীকৃষ্ণ (নতুন)"), dei("rama", "শ্রীরাম (নতুন)"), dei("hanuman", "হনুমানজি (নতুন)", false), dei("kali", "মা কালী (নতুন)"), dei("kartik", "কার্তিক (নতুন)"), dei("vishnu", "বিষ্ণু (নতুন)"),
];
export const spriteDef = (id: string) => SPRITE_LIST.find((s) => s.id === id);
// শিশু-চরিত্রের সব ছবির ফাইল-কী (এক্সপোর্টে লাগে)
export const atlasKeysOf = (id: string): string[] => Object.values(SPRITES[id] ?? {}).map((v) => v.k);

const sin = Math.sin, cos = Math.cos, abs = Math.abs, max = Math.max, PI = Math.PI, D = PI / 180;
type M = [number, number, number, number, number, number];
const mul = (a: M, b: M): M => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const T = (x: number, y: number): M => [1, 0, 0, 1, x, y];
const Sc = (s: number): M => [s, 0, 0, s, 0, 0];
const Ro = (deg: number, px: number, py: number): M => { const c = cos(deg * D), s = sin(deg * D); return [c, s, -s, c, px - c * px + s * py, py - s * px - c * py]; };

type Pl = { root: { x?: number; y?: number; rot?: number; s?: number }; U?: [number, number]; F?: [number, number]; leg?: [number, number]; shin?: [number, number]; shoe?: [number, number]; head?: number; expr?: string; mouth?: boolean; off?: Record<string, [number, number]>; ang?: Record<string, number>; prop?: "stool" | "bed" };
// L = বাঁ/দূরের, R = ডান/কাছের
function kidPlan(act: string, ph: number, view: View): Pl {
  const t = ph, s = sin(t), c = cos(t), side = view === "side";
  switch (act) {
    case "walk": { const a = side ? 28 * s : 7 * s; return { root: { y: -5 * abs(c) }, leg: [a, -a], shin: [30 * max(0, -c) + 4, 30 * max(0, c) + 4], U: [-a * 0.9, a * 0.9], F: [-18 + 8 * s, -18 - 8 * s], shoe: [-a * 0.3, a * 0.3] }; }
    case "run": { const a = side ? 48 * s : 10 * s; return { root: { y: -14 * abs(c), rot: side ? 7 : 0 }, leg: [a, -a], shin: [70 * max(0, -c) + 8, 70 * max(0, c) + 8], U: [-a * 1.1, a * 1.1], F: [-75, -75], head: -4 }; }
    case "jump": { const p = (s + 1) / 2; return { root: { y: 36 - 156 * p }, U: [30 + 135 * p, -30 - 135 * p], leg: [28 - 20 * p, -28 + 20 * p], shin: [-50 + 94 * p, 50 - 94 * p] }; }
    case "wave": return { root: {}, U: [5, -150], F: [0, -14 + 24 * s] };
    case "clap": { const o = s > 0 ? 1 : 0; return { root: { y: o ? -3 : 0 }, U: [-8, 8], F: [o ? -96 : -44, o ? 96 : 44] }; }
    case "dance": return { root: { y: -8 * abs(s), rot: 5 * s, x: 10 * s }, U: [100 + 40 * s, -100 + 40 * s], F: [-20 * s, -20 * s], leg: [12 * s, 12 * s], shin: [16 * max(0, -s), 16 * max(0, s)] };
    case "sit": return { root: { y: 150 }, leg: [-90, -90], shin: [90, 90], U: [-20, -30], F: [-40, -50], prop: "stool" };
    case "sleep": return { root: { rot: -90, s: 0.58, y: 190, x: 100 }, U: [8, -8], expr: "sleep", prop: "bed" };
    case "angry": return { root: { x: 3 * (s > 0 ? 1 : -1) }, U: [14, -14], F: [20, -20], head: 2 * (s > 0 ? 1 : -1), expr: "angry" };
    case "cry": return { root: { y: 2 * (s > 0 ? 1 : -1) }, U: [-18, 18], F: [-158, 158], expr: "cry" };
    case "laugh": return { root: { y: s > 0 ? -10 : 0, rot: 3 * (s > 0 ? 1 : -1) }, U: [-6, 6], F: [-78, 78], expr: "laugh" };
    case "talk": return { root: { y: -2 * abs(s) }, U: [6, -22 - 8 * s], F: [0, -45 - 15 * s], mouth: true };
    default: return { root: { y: -2 * abs(sin(t * 0.5)) }, U: [4, -4] };
  }
}
function deityPlan(act: string, ph: number): Pl {
  const t = ph, s = sin(t), c = cos(t);
  switch (act) {
    case "walk": return { root: { y: -6 * abs(c), rot: 2 * s }, off: { footL: [0, -16 * max(0, s)], footR: [0, -16 * max(0, -s)] }, ang: { skirt: 2.5 * s } };
    case "run": return { root: { y: -14 * abs(c), rot: 4 * s }, off: { footL: [0, -26 * max(0, s)], footR: [0, -26 * max(0, -s)] }, ang: { skirt: 4 * s } };
    case "jump": { const p = (s + 1) / 2; return { root: { y: 24 - 130 * p }, off: { footL: [0, -20 * p], footR: [0, -20 * p] }, ang: { frontL_arm: 10 * p, frontR_arm: -10 * p } }; }
    case "dance": return { root: { y: -8 * abs(s), rot: 5 * s, x: 12 * s }, ang: { frontL_arm: 14 * s, frontR_arm: 14 * s, skirt: -4 * s, head: -4 * s }, off: { footL: [0, -10 * max(0, s)], footR: [0, -10 * max(0, -s)] } };
    case "wave": return { root: {}, ang: { frontL_arm: 12 * s } };
    case "bless": return { root: { y: -2 * abs(sin(t * 0.5)) }, ang: { frontL_arm: 5 * s, head: 2 * s } };
    case "talk": return { root: { y: -2 * abs(s) }, ang: { frontL_arm: 5 * s }, mouth: true };
    case "angry": return { root: { x: 3 * (s > 0 ? 1 : -1) }, expr: "angry" };
    case "cry": return { root: { y: 2 * (s > 0 ? 1 : -1) }, expr: "cry" };
    case "laugh": return { root: { y: s > 0 ? -10 : 0 }, expr: "laugh" };
    default: return { root: { y: -2 * abs(sin(t * 0.5)) }, ang: { frontL_arm: 2 * sin(t * 0.5) } };
  }
}
const SHAPE_OF: Record<string, string> = { A: "A", E: "E", O: "O", U: "O", M: "M", C: "E" };
const SIDE_DEF: Record<string, View> = {};
void SIDE_DEF;
const VKEY: Record<View, string> = { front: "front", q_front: "q", q_back: "qb", back: "back", side: "side" };

export function spriteShapes(id: string, p: Pose): Shape[] {
  const d = spriteDef(id)!, sv = SPRITES[id];
  let vk = VKEY[p.view ?? "front"]; if (!sv[vk]) vk = vk === "qb" ? "back" : "front";
  const V = sv[vk], isSide = vk === "side";
  const act = d.actions.includes(p.action as never) ? p.action : "stand";
  const pl = d.kind === "kid" ? kidPlan(act, p.phase, p.view ?? "front") : deityPlan(act, p.phase);
  if (id === "girl" && act === "sit") { pl.root = { y: 95 }; pl.leg = [0, 0]; pl.shin = [0, 0]; pl.shoe = [0, 0]; }
  // মুখ/অভিব্যক্তি
  let variant = "";
  if (vk === "front" || vk === "q") {
    if (p.mouth) variant = p.mouth.open < 0.12 ? "M" : SHAPE_OF[p.mouth.shape] ?? "A";
    else if (pl.mouth || p.talk > 0) variant = sin(p.phase * 3) > 0 ? "A" : "M";
    if (pl.expr && d.emo) variant = pl.expr;
  }
  const byId: Record<string, SP> = {}; for (const q of V.parts) byId[q.id] = q;
  const hv = variant && byId["head@" + variant] ? "head@" + variant : "head";
  const ids = V.parts.map((q) => q.id).filter((i) => i.indexOf("@") < 0 || i === hv).filter((i) => !(i.indexOf("head") === 0 && i !== hv));
  const base = (i: string) => i.replace(/^head.*$/, "head");
  const parse = (i: string) => { const m = /^(armU|armF|shorts|shin|shoe|braid)(.*)$/.exec(i); return m ? { kind: m[1], sfx: m[2] } : null; };
  const has = (n: string) => !!byId[n];
  const parentOf = (i: string): string | null => {
    const b = base(i), pr = parse(b);
    if (pr) {
      if (pr.kind === "armU" || pr.kind === "shorts" || pr.kind === "braid") return "torso";
      if (pr.kind === "armF") return "armU" + pr.sfx;
      if (pr.kind === "shin") return has("shorts" + pr.sfx) ? "shorts" + pr.sfx : "torso";
      if (pr.kind === "shoe") return "shin" + pr.sfx;
    }
    if (b === "torso") return null;
    if (d.kind === "deity" && (b === "footL" || b === "footR")) return null;
    return "torso";
  };
  // L/R ↔ দূরের/কাছের
  const lr = (sfx: string): 0 | 1 => (sfx === "L" || sfx === "Far" || sfx === "" ? 0 : 1);
  const angOf = (b: string): number => {
    const pr = parse(b); let a = 0;
    if (pr) {
      const i = lr(pr.sfx), g = (arr?: [number, number]) => (arr ? arr[i] : 0);
      a = pr.kind === "armU" ? g(pl.U) : pr.kind === "armF" ? g(pl.F) : pr.kind === "shorts" ? g(pl.leg) : pr.kind === "shin" ? g(pl.shin) + (has("shorts" + pr.sfx) ? 0 : g(pl.leg)) : pr.kind === "shoe" ? g(pl.shoe) : 0;
      if (isSide && (pr.kind === "armU" || pr.kind === "armF") && (act === "wave" || act === "jump" || act === "dance" || act === "clap" || act === "cry" || act === "laugh")) a = a * (pr.sfx === "Near" ? 1 : 1);
    } else if (b === "head") a = pl.head ?? 0;
    else if (pl.ang && pl.ang[b] !== undefined) a = pl.ang[b];
    else if (b.indexOf("xarm") === 0) a = 4 * sin(p.phase * 0.7 + b.length);
    return a;
  };
  const root = pl.root, G = d.ground;
  let W: M = T(root.x ?? 0, root.y ?? 0);
  if (root.s) W = mul(W, mul(T(350, 1040), mul(Sc(root.s), T(-350, -1040))));
  const BASE: M = mul(Sc(d.k), T(-350, -G));
  const out: Shape[] = [];
  const sorted = ids.slice().sort((a, b) => byId[a].z - byId[b].z);
  if (pl.prop === "stool") out.push(R(-30, -88, 70, 10, "#b9824a", 4), R(-22, -78, 7, 78, "#9a6a38"), R(24, -78, 7, 78, "#9a6a38"));
  if (pl.prop === "bed") out.push({ t: "ellipse", x: -70, y: -14, rx: 62, ry: 16, fill: "#ffffff" }, R(-10, -48, 120, 36, "#7ec8f2", 10));
  for (const i of sorted) {
    const q = byId[i]; let m: M = W;
    const chain: string[] = []; for (let k: string | null = base(i); k && (byId[k] || k === "torso"); k = parentOf(k)) { chain.unshift(k); if (chain.length > 6) break; }
    const o = pl.off?.[base(i)]; if (o) m = mul(m, T(o[0], o[1]));
    for (const k of chain) {
      let a = angOf(k); if (k === "torso") a += root.rot ?? 0;
      const kp = byId[k]?.pv; if (a && kp) m = mul(m, Ro(a, kp[0], kp[1]));
    }
    m = mul(BASE, m);
    const sc = Math.hypot(m[0], m[1]), rot = Math.atan2(m[1], m[0]) / D;
    out.push({ t: "img", k: V.k, u: q.u, v: q.v, pw: q.pw, ph: q.ph, x: q.x, y: q.y, w: q.w, h: q.h, e: m[4], f: m[5], r: rot, s: sc });
  }
  return out;
}
