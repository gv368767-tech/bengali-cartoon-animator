// হিন্দু দেবদেবী — শ্রদ্ধাপূর্ণ 2D কার্টুন। সবাই মানুষের রিগ (হাঁটা, কথা, হাত নাড়া, আশীর্বাদ, ঠোঁট নড়া) ব্যবহার করে
// এবং অলংকার/মুকুট/অতিরিক্ত হাত/প্রতীক "deco" হিসেবে যোগ হয়। চেহারা (রং, মুকুট) প্রতিটি চরিত্রের জন্য স্থির, তাই সব দৃশ্যে একই।
import { C, CS, E, L, PA, PO, R, Shape, abs, cos, f, sin, View } from "./shapes";
import type { Anchors, Deco, HumanDef } from "./human";
import { HUMANS } from "./human";

const GOLD = "#f2b705", GOLD2 = "#b8860b", RED = "#d62828";

// ---------- প্রতীক/অস্ত্র (স্থানীয় নিয়মে: হাত মূল বিন্দুতে, উপরের দিক = −y) ----------
const tf = (x: number, y: number, th: number, s: number) => (u: number, v: number): [number, number] => [x + s * (u * cos(th) - v * sin(th)), y + s * (u * sin(th) + v * cos(th))];
function item(name: string, x: number, y: number, th = 0, s = 1): Shape[] {
  const T = tf(x, y, th, s), P = (...q: number[]) => { const o: number[] = []; for (let i = 0; i < q.length; i += 2) o.push(...T(q[i], q[i + 1])); return o; };
  const Ln = (u1: number, v1: number, u2: number, v2: number, w: number, c: string) => { const a = T(u1, v1), b = T(u2, v2); return L(a[0], a[1], b[0], b[1], w * s, c); };
  const Ci = (u: number, v: number, r: number, c: string, op?: number) => { const a = T(u, v); return C(a[0], a[1], r * s, c, op); };
  const Ri = (u: number, v: number, r: number, c: string, w: number) => { const a = T(u, v); return CS(a[0], a[1], r * s, c, w * s); };
  const El = (u: number, v: number, rx: number, ry: number, c: string) => { const a = T(u, v); return E(a[0], a[1], rx * s, ry * s, c); };
  switch (name) {
    case "trishul": return [Ln(0, 34, 0, -112, 5, "#8a6a2a"), Ln(-21, -98, 21, -98, 4, GOLD), Ln(-21, -98, -21, -128, 4, GOLD), Ln(21, -98, 21, -128, 4, GOLD), PO(P(-21, -138, -27, -124, -15, -124), GOLD), PO(P(21, -138, 15, -124, 27, -124), GOLD), PO(P(0, -150, -8, -110, 8, -110), GOLD), Ln(0, -70, 0, -52, 7, RED)];
    case "sword": return [PO(P(-6, -20, 6, -20, 4, -118, 0, -134, -4, -118), "#dfe4ee"), Ln(0, -24, 0, -112, 1.5, "#9aa3b2"), Ln(-15, -20, 15, -20, 6, GOLD), Ln(0, -18, 0, 14, 7, "#7a4a21")];
    case "chakra": { const o: Shape[] = [Ri(0, -34, 27, GOLD, 5), Ci(0, -34, 5, GOLD)]; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; o.push(Ln(sin(a) * 6, -34 + cos(a) * 6, sin(a) * 27, -34 + cos(a) * 27, 2.5, GOLD)); const q = T(sin(a) * 29, -34 + cos(a) * 29); o.push(C(q[0], q[1], 3.5 * s, "#e8e8e8")); } return o; }
    case "shankha": return [El(0, -22, 14, 22, "#fff3dc"), PO(P(-5, 0, 5, 0, 0, 14), "#fff3dc"), PA(`M ${f(T(-8, -34)[0])} ${f(T(-8, -34)[1])} Q ${f(T(0, -22)[0])} ${f(T(0, -22)[1])} ${f(T(8, -8)[0])} ${f(T(8, -8)[1])}`, undefined, "#d9b98a", 2.5), PA(`M ${f(T(-9, -24)[0])} ${f(T(-9, -24)[1])} Q ${f(T(0, -14)[0])} ${f(T(0, -14)[1])} ${f(T(9, -2)[0])} ${f(T(9, -2)[1])}`, undefined, "#d9b98a", 2.5)];
    case "lotus": return [Ln(0, 24, 0, -8, 4, "#3a8a3a"), El(-13, -24, 8, 16, "#ff9fc4"), El(13, -24, 8, 16, "#ff9fc4"), El(-6, -30, 8, 17, "#ff7eb0"), El(6, -30, 8, 17, "#ff7eb0"), El(0, -33, 7, 18, "#ff5f9e")];
    case "gada": return [Ln(0, 30, 0, -70, 7, "#8a5a2b"), Ci(0, -94, 24, GOLD), Ri(0, -94, 24, GOLD2, 3), Ci(0, -94, 8, GOLD2), Ci(0, -118, 5, GOLD2)];
    case "bow": { const a = T(0, -80), b = T(0, 80), c = T(-48, 0); return [PA(`M ${f(a[0])} ${f(a[1])} Q ${f(c[0])} ${f(c[1])} ${f(b[0])} ${f(b[1])}`, undefined, "#7a4a21", 6 * s), L(a[0], a[1], b[0], b[1], 2, "#f5f5f5")]; }
    case "arrow": return [Ln(0, 30, 0, -112, 3.5, "#8a6a2a"), PO(P(0, -128, -7, -108, 7, -108), "#cfd6e0"), PO(P(0, 30, -8, 40, 0, 20), RED), PO(P(0, 30, 8, 40, 0, 20), RED)];
    case "bell": return [Ci(0, -20, 15, GOLD), PO(P(-15, -14, 15, -14, 20, 4, -20, 4), GOLD2), Ci(0, 7, 4, "#7a4a21"), Ln(0, -36, 0, -46, 4, GOLD2)];
    case "mala": return [Ri(0, -18, 15, "#7a3b1b", 5), Ri(0, -18, 15, "#e8c27a", 1.5)];
    case "damaru": return [PO(P(-14, -34, 14, -34, 0, -12), "#a8742b"), PO(P(-14, 6, 14, 6, 0, -12), "#a8742b"), Ci(0, -12, 3, "#fff"), Ln(0, -12, 18, 6, 2, RED)];
    case "modak": return [Ci(0, -20, 15, "#f2b134"), Ci(-5, -24, 2.5, "#e08e0b"), Ci(5, -18, 2.5, "#e08e0b"), PO(P(-5, -33, 5, -33, 0, -42), "#f2b134")];
    case "kalash": return [El(0, -20, 17, 19, GOLD), Ln(-10, -38, 10, -38, 6, GOLD2), Ci(0, -50, 12, "#8a5a2b"), Ci(0, -62, 6, "#3a8a3a")];
    case "vel": return [Ln(0, 34, 0, -92, 5, "#8a6a2a"), PO(P(0, -150, -13, -108, 0, -92, 13, -108), "#dfe4ee"), Ln(0, -108, 0, -140, 2, "#9aa3b2")];
    case "palm": return [Ci(0, -2, 11, "#ffffff", 0), Ci(0, -2, 5, "#e8453c", 0.85)];
    case "book": return [PO(P(-18, -8, 18, -8, 18, -42, -18, -42), "#3a6ea5"), Ln(-14, -14, 14, -14, 3, "#fff")];
    case "coins": return [Ci(0, 8, 6, GOLD), Ci(-6, 24, 6, GOLD), Ci(7, 40, 6, GOLD), Ci(-2, 56, 6, GOLD), Ci(0, 8, 3, GOLD2)];
    default: return [];
  }
}

// ---------- সাধারণ নির্মাতা ----------
type Arm = { side: 1 | -1; ang: number; item: string };
type Cfg = {
  halo?: string; crown?: { col?: string; h?: number; feather?: boolean; gem?: string }; tilak?: "bindi" | "u" | "chandan"; thirdEye?: boolean; necklace?: string; garland?: string;
  arms?: Arm[]; heldR?: string; heldL?: string; bangles?: boolean;
  special?: (a: Anchors, o: Required<Deco>) => void;
};
function build(cfg: Cfg): (a: Anchors) => Deco {
  return (a) => {
    const { hx, hy, r, sy, dx, view, wk, skin } = a;
    const fr = view === "front" || view === "q_front", sd = view === "side", bk = view === "back" || view === "q_back";
    const o: Required<Deco> = { mid: [], back: [], headUnder: [], headOver: [], front: [] };
    const ox = sd ? -r * 0.1 : 0;
    if (cfg.halo) o.back.push(C(hx + ox, hy - 0.1 * r, r * 1.75, cfg.halo, 0.3), CS(hx + ox, hy - 0.1 * r, r * 1.75, GOLD, 4));
    // অতিরিক্ত হাত (শরীরের পেছনে, স্থির)
    for (const m of cfg.arms ?? []) {
      const sx = dx + m.side * 30 * wk * (sd ? 0.3 : 1), ay = sy + 8, len = 84;
      const ex = sx + m.side * len * sin(m.ang), ey = ay - len * cos(m.ang), th = m.side * m.ang;
      o.back.push(L(sx, ay, ex, ey, 14, skin), C(ex, ey, 9.5, skin), CS(ex - m.side * 0 + 0, ey, 10.5, GOLD, 3), ...item(m.item, ex, ey, th));
    }
    if (cfg.necklace && !bk) { o.mid.push(PA(`M ${f(dx - 25 * wk)} ${f(sy - 3)} Q ${f(dx)} ${f(sy + 52)} ${f(dx + 25 * wk)} ${f(sy - 3)}`, undefined, cfg.necklace, 5), C(dx, sy + 36, 7, RED)); }
    if (cfg.garland && !bk) { for (let i = 0; i <= 8; i++) { const u = i / 8, x = dx - 30 * wk + 60 * wk * u, y = sy - 2 + 64 * u * (1 - u) * 1.9 + 10 * u * (1 - u); o.mid.push(C(x, y + 6, 6.5, cfg.garland), C(x, y + 6, 2.2, "#ffd84a")); } }
    cfg.special?.(a, o);
    if (cfg.crown) {
      const { col = GOLD, h = 1, feather, gem = RED } = cfg.crown, x = hx + ox;
      o.front.push(PO([x - r * 0.82, hy - r * 0.42, x - r * 0.6, hy - r * 1.35 * h, x - r * 0.25, hy - r * 1.0 * h, x, hy - r * 1.62 * h, x + r * 0.25, hy - r * 1.0 * h, x + r * 0.6, hy - r * 1.35 * h, x + r * 0.82, hy - r * 0.42], col),
        L(x - r * 0.82, hy - r * 0.5, x + r * 0.82, hy - r * 0.5, 6, GOLD2), C(x, hy - r * 0.72, r * 0.1, gem), C(x, hy - r * 1.3 * h, r * 0.07, gem));
      if (feather) { const fx = x + r * 0.05, fy = hy - r * 1.55 * h; o.front.push(PA(`M ${f(fx)} ${f(fy + r * 0.2)} Q ${f(fx + r * 0.25)} ${f(fy - r * 0.6)} ${f(fx + r * 0.1)} ${f(fy - r * 1.1)}`, undefined, "#1e8f5a", 4), E(fx + r * 0.1, fy - r * 0.95, r * 0.16, r * 0.26, "#1e8f5a"), E(fx + r * 0.1, fy - r * 0.95, r * 0.09, r * 0.14, "#2a6fd1"), C(fx + r * 0.1, fy - r * 0.95, r * 0.04, "#ffd84a")); }
    }
    if (fr) {
      if (cfg.tilak === "bindi") o.front.push(C(hx, hy - r * 0.35, r * 0.075, RED));
      if (cfg.tilak === "chandan") o.front.push(C(hx, hy - r * 0.35, r * 0.075, "#f4d35e"));
      if (cfg.tilak === "u") o.front.push(PA(`M ${f(hx - r * 0.2)} ${f(hy - r * 0.62)} L ${f(hx - r * 0.2)} ${f(hy - r * 0.3)} M ${f(hx + r * 0.2)} ${f(hy - r * 0.62)} L ${f(hx + r * 0.2)} ${f(hy - r * 0.3)}`, undefined, "#ffffff", 4), L(hx, hy - r * 0.6, hx, hy - r * 0.3, 4, RED));
      if (cfg.thirdEye) o.front.push(E(hx, hy - r * 0.42, r * 0.05, r * 0.12, RED));
    }
    if (cfg.bangles !== false) { o.front.push(CS(a.hR[0], a.hR[1] - 2, 11.5, GOLD, 3), CS(a.hL[0], a.hL[1] - 2, 11.5, GOLD, 3)); }
    if (cfg.heldR) o.front.push(...item(cfg.heldR, a.hR[0], a.hR[1]));
    if (cfg.heldL) o.front.push(...item(cfg.heldL, a.hL[0], a.hL[1]));
    return o;
  };
}

const V = (v: View) => ({ fr: v === "front" || v === "q_front", sd: v === "side", bk: v === "back" || v === "q_back" });
const ganeshaHead = (a: Anchors, o: Required<Deco>, ear: string) => {
  const { hx, hy, r, view } = a, { fr, bk } = V(view);
  o.headUnder.push(E(hx - r * 1.05, hy + r * 0.15, r * 0.62, r * 0.85, ear), E(hx + r * 1.05, hy + r * 0.15, r * 0.62, r * 0.85, ear), E(hx - r * 1.05, hy + r * 0.2, r * 0.4, r * 0.6, "#f0a8a0", 0.6), E(hx + r * 1.05, hy + r * 0.2, r * 0.4, r * 0.6, "#f0a8a0", 0.6));
  if (fr) {
    o.front.push(PA(`M ${f(hx - r * 0.12)} ${f(hy + r * 0.12)} Q ${f(hx - r * 0.95)} ${f(hy + r * 0.5)} ${f(hx - r * 0.7)} ${f(hy + r * 1.15)} Q ${f(hx - r * 0.55)} ${f(hy + r * 1.5)} ${f(hx - r * 0.2)} ${f(hy + r * 1.3)}`, undefined, ear, r * 0.36),
      PA(`M ${f(hx + r * 0.42)} ${f(hy + r * 0.62)} L ${f(hx + r * 0.62)} ${f(hy + r * 1.05)}`, undefined, "#fffbe8", r * 0.12));
  } else if (!bk) o.front.push(PA(`M ${f(hx + r * 0.8)} ${f(hy + r * 0.15)} Q ${f(hx + r * 1.6)} ${f(hy + r * 0.6)} ${f(hx + r * 1.25)} ${f(hy + r * 1.35)}`, undefined, ear, r * 0.36));
};

// ---------- ১১টি চরিত্র ----------
const base = (o: Partial<HumanDef> & Pick<HumanDef, "skin" | "hair" | "hairStyle" | "top" | "bottom" | "outfit" | "lower">): HumanDef => ({ head: 1, shoe: GOLD2, extras: [], ...o } as HumanDef);

export const DEITIES: Record<string, HumanDef> = {
  durga: base({ skin: "#f0a864", hair: "#1b1b1b", hairStyle: "long", top: RED, top2: GOLD, bottom: RED, outfit: "saree", lower: "none",
    deco: build({ halo: "#ffe9a8", crown: { h: 1.15 }, tilak: "bindi", necklace: GOLD, heldR: "trishul", heldL: "lotus",
      arms: [{ side: 1, ang: 0.4, item: "sword" }, { side: 1, ang: 0.95, item: "chakra" }, { side: 1, ang: 1.5, item: "gada" }, { side: 1, ang: 2.05, item: "arrow" },
        { side: -1, ang: 0.4, item: "shankha" }, { side: -1, ang: 0.95, item: "bow" }, { side: -1, ang: 1.5, item: "bell" }, { side: -1, ang: 2.05, item: "palm" }] }) }),
  lakshmi: base({ skin: "#f3b27c", hair: "#1b1b1b", hairStyle: "long", top: "#e8467c", top2: GOLD, bottom: "#e8467c", outfit: "saree", lower: "none",
    deco: build({ halo: "#fff0b8", crown: {}, tilak: "bindi", necklace: GOLD, heldR: "lotus", heldL: "kalash", arms: [{ side: 1, ang: 1.1, item: "lotus" }, { side: -1, ang: 1.1, item: "coins" }] }) }),
  ganesha: base({ skin: "#e8963a", hair: "#e8963a", hairStyle: "none", top: "#f2c230", bottom: "#f2c230", outfit: "vest", lower: "lungi", head: 1.1,
    deco: build({ crown: { h: 0.95 }, tilak: "chandan", garland: "#ff7a1a", heldR: "modak", heldL: "mala", arms: [{ side: 1, ang: 1.15, item: "gada" }, { side: -1, ang: 1.15, item: "lotus" }],
      special: (a, o) => { ganeshaHead(a, o, "#d98a38"); if (!V(a.view).bk) o.mid.push(E(a.dx, -148 + a.dy, 44 * a.wk, 46, "#e8963a"), C(a.dx, -138 + a.dy, 4, "#b86a1a")); } }) }),
  shiva: base({ skin: "#b9c7e6", hair: "#2b2b33", hairStyle: "long", top: "#ffffff", bottom: "#e0902a", outfit: "vest", lower: "lungi",
    deco: build({ thirdEye: true, tilak: undefined, heldR: "trishul", heldL: "damaru", garland: "#7a3b1b",
      special: (a, o) => { const { hx, hy, r, view, dx, sy, dy, wk } = a, { fr, bk } = V(view);
        o.front.push(PA(`M ${f(hx + r * 0.1)} ${f(hy - r * 1.0)} A ${f(r * 0.3)} ${f(r * 0.3)} 0 1 0 ${f(hx + r * 0.1)} ${f(hy - r * 1.5)} A ${f(r * 0.22)} ${f(r * 0.22)} 0 1 1 ${f(hx + r * 0.1)} ${f(hy - r * 1.0)} Z`, "#f6f2e0"));
        if (!bk) { o.front.push(PA(`M ${f(hx - r * 0.45)} ${f(hy - r * 0.85)} Q ${f(hx - r * 0.9)} ${f(hy - r * 0.2)} ${f(hx - r * 0.75)} ${f(hy + r * 0.8)}`, undefined, "#5bb6ff", 5, 0.85)); }
        if (fr) { o.front.push(L(hx - r * 0.3, hy - r * 0.7, hx + r * 0.3, hy - r * 0.7, 3, "#ffffff"), L(hx - r * 0.3, hy - r * 0.62, hx + r * 0.3, hy - r * 0.62, 3, "#ffffff"), L(hx - r * 0.3, hy - r * 0.54, hx + r * 0.3, hy - r * 0.54, 3, "#ffffff")); }
        if (!bk) o.mid.push(PA(`M ${f(dx - 28 * wk)} ${f(sy - 6)} Q ${f(dx - 10 * wk)} ${f(sy + 18)} ${f(dx + 6 * wk)} ${f(sy + 2)} Q ${f(dx + 26 * wk)} ${f(sy - 10)} ${f(dx + 30 * wk)} ${f(sy + 14)}`, undefined, "#2e9e4f", 7), C(dx + 30 * wk, sy + 16, 6, "#2e9e4f"));
        o.mid.push(L(dx - 36 * wk, -112 + dy, dx + 36 * wk, -112 + dy, 3, "#7a4a1a"), L(dx - 34 * wk, -90 + dy, dx + 34 * wk, -90 + dy, 3, "#7a4a1a"), L(dx - 32 * wk, -68 + dy, dx + 32 * wk, -68 + dy, 3, "#7a4a1a")); } }) }),
  saraswati: base({ skin: "#f4c492", hair: "#1b1b1b", hairStyle: "long", top: "#fafafa", top2: GOLD, bottom: "#fafafa", outfit: "saree", lower: "none",
    deco: build({ halo: "#fff7d0", crown: { h: 0.9 }, tilak: "bindi", necklace: GOLD, bangles: true, arms: [{ side: 1, ang: 1.1, item: "mala" }, { side: -1, ang: 1.1, item: "book" }],
      special: (a, o) => { const dxv = a.hR[0] - a.hL[0], dyv = a.hR[1] - a.hL[1], len = Math.hypot(dxv, dyv) || 1, ux = dxv / len, uy = dyv / len, A = [a.hL[0] - ux * 70, a.hL[1] - uy * 70], B = [a.hR[0] + ux * 70, a.hR[1] + uy * 70];
        o.front.push(L(A[0], A[1], B[0], B[1], 8, "#8a4b14"), C(A[0], A[1], 22, "#c97a2b"), C(B[0], B[1], 13, "#c97a2b"), L(A[0], A[1], B[0], B[1], 2, "#f5e6c8")); } }) }),
  krishna: base({ skin: "#4f7fd1", hair: "#1b1b1b", hairStyle: "short", top: "#f2c230", bottom: "#f2c230", outfit: "vest", lower: "lungi", extras: [],
    deco: build({ crown: { h: 0.8, feather: true }, tilak: "chandan", garland: "#ff7ab8", necklace: "#fff",
      special: (a, o) => { const dxv = a.hR[0] - a.hL[0], dyv = a.hR[1] - a.hL[1], len = Math.hypot(dxv, dyv) || 1; if (len > 8) { const ux = dxv / len, uy = dyv / len; o.front.push(L(a.hL[0] - ux * 40, a.hL[1] - uy * 40, a.hR[0] + ux * 40, a.hR[1] + uy * 40, 7, "#b5651d"), L(a.hL[0] - ux * 40, a.hL[1] - uy * 40, a.hR[0] + ux * 40, a.hR[1] + uy * 40, 2, "#e8c27a")); } else o.front.push(L(a.hR[0] - 50, a.hR[1], a.hR[0] + 50, a.hR[1], 7, "#b5651d")); } }) }),
  rama: base({ skin: "#58a6b8", hair: "#1b1b1b", hairStyle: "bun", top: "#f08a24", bottom: "#f08a24", outfit: "vest", lower: "lungi",
    deco: build({ halo: "#fff0b8", crown: { h: 1 }, tilak: "u", necklace: GOLD, heldL: "bow", heldR: "arrow",
      special: (a, o) => { o.back.push(R(a.dx - 6, a.sy - 70, 18, 96, "#7a4a21", 5), L(a.dx, a.sy - 70, a.dx - 6, a.sy - 92, 3, "#cfd6e0"), L(a.dx + 8, a.sy - 70, a.dx + 14, a.sy - 92, 3, "#cfd6e0")); } }) }),
  hanuman: base({ skin: "#e8892e", hair: "#e8892e", hairStyle: "none", top: RED, bottom: RED, outfit: "vest", lower: "shorts", head: 1.05,
    deco: build({ crown: { h: 0.7 }, tilak: "u", heldR: "gada",
      special: (a, o) => { const { hx, hy, r, dx, dy, view } = a, { fr, bk } = V(view);
        o.back.push(PA(`M ${f(dx - 18)} ${f(-130 + dy)} Q ${f(dx - 100)} ${f(-160 + dy)} ${f(dx - 70)} ${f(-250 + dy)} Q ${f(dx - 50)} ${f(-320 + dy)} ${f(dx - 110)} ${f(-300 + dy)}`, undefined, "#e8892e", 13));
        o.headUnder.push(C(hx - r * 1.02, hy, r * 0.3, "#e8892e"), C(hx + r * 1.02, hy, r * 0.3, "#e8892e"), C(hx - r * 1.02, hy, r * 0.17, "#f4b684"), C(hx + r * 1.02, hy, r * 0.17, "#f4b684"));
        if (fr) o.headOver.push(E(hx, hy + r * 0.38, r * 0.62, r * 0.5, "#f4c29a"), E(hx, hy - r * 0.2, r * 0.8, r * 0.34, "#f4c29a", 0.9)); } }) }),
  kali: base({ skin: "#33408f", hair: "#111118", hairStyle: "long", top: "#c1121f", top2: GOLD, bottom: "#c1121f", outfit: "saree", lower: "none",
    deco: build({ halo: "#ffd0d0", crown: { col: GOLD, h: 0.9, gem: "#6fd3ff" }, thirdEye: true, tilak: undefined, garland: RED, heldR: "sword", heldL: "trishul",
      arms: [{ side: 1, ang: 1.2, item: "palm" }, { side: -1, ang: 1.2, item: "palm" }],
      special: (a, o) => { if (V(a.view).fr) o.front.push(E(a.hx, a.hy + a.r * 0.78, a.r * 0.13, a.r * 0.2, "#ff4d6d")); } }) }),
  kartik: base({ skin: "#f1b883", hair: "#1b1b1b", hairStyle: "short", top: RED, bottom: "#f2b705", outfit: "vest", lower: "lungi", head: 0.98,
    deco: build({ halo: "#fff0b8", crown: { h: 0.9, feather: true }, tilak: "chandan", necklace: GOLD, heldR: "vel" }) }),
  vishnu: base({ skin: "#4a78c8", hair: "#1b1b1b", hairStyle: "none", top: "#f2c230", bottom: "#f2c230", outfit: "vest", lower: "lungi",
    deco: build({ halo: "#dfeaff", crown: { h: 1.2, gem: "#6fd3ff" }, tilak: "u", garland: "#ffffff", necklace: GOLD, heldR: "chakra", heldL: "shankha", arms: [{ side: 1, ang: 1.2, item: "gada" }, { side: -1, ang: 1.2, item: "lotus" }] }) }),
};
Object.assign(HUMANS, DEITIES);

export const DEITY_LIST: { id: string; name: string; scale: number }[] = [
  { id: "durga", name: "মা দুর্গা", scale: 1 }, { id: "lakshmi", name: "মা লক্ষ্মী", scale: 1 }, { id: "ganesha", name: "ভগবান গণেশ", scale: 0.95 },
  { id: "shiva", name: "মহাদেব (শিব)", scale: 1.05 }, { id: "saraswati", name: "মা সরস্বতী", scale: 1 }, { id: "krishna", name: "ভগবান শ্রীকৃষ্ণ", scale: 1 },
  { id: "rama", name: "ভগবান শ্রীরাম", scale: 1.05 }, { id: "hanuman", name: "হনুমানজি", scale: 1.05 }, { id: "kali", name: "মা কালী", scale: 1 },
  { id: "kartik", name: "কার্তিক", scale: 1 }, { id: "vishnu", name: "ভগবান বিষ্ণু", scale: 1.05 },
];
