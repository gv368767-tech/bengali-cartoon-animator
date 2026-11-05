import { C, CS, DARK, E, L, PA, PO, R, Shape, Pose, View, Mouth, abs, cos, f, sin, PI } from "./shapes";

export type HumanDef = {
  skin: string; hair: string;
  hairStyle: "short" | "pigtails" | "bun" | "tuft" | "elder" | "long" | "none";
  top: string; top2?: string; bottom: string;
  outfit: "tee" | "frock" | "saree" | "panjabi" | "shirt" | "romper" | "vest";
  lower: "shorts" | "pants" | "lungi" | "none";
  head: number; shoe: string;
  extras: ("glasses" | "moustache" | "hat" | "gamchha" | "book" | "tie" | "stick" | "bindi")[];
};


// ====================== রিগ (শরীরের জোড়া ও ভঙ্গি) ======================
const U = 44, FA = 44; // উপরের হাত, নিচের হাত
type Arm = { a?: [number, number]; h?: [number, number]; up?: boolean };
type Expr = "neutral" | "smile" | "angry" | "sad" | "cry" | "scared" | "laugh" | "think" | "eat" | "shout";
type Eyes = "open" | "closed" | "happy" | "wide" | "up" | "down";
type Rig = {
  L: Arm; R: Arm; lg: number; liftL: number; liftR: number; bob: number; sway: number; drop: number; jump: number;
  sh: number; hd: number; tilt: number; expr: Expr; eyes: Eyes; talk?: boolean;
  armsFront?: boolean; headL?: boolean; headR?: boolean; noHold?: boolean; prop?: string;
};
const idle = (k = 0): Arm => ({ a: [0.12 + k, 0.12 + k] });

export function rigFor(act: string, ph: number): Rig {
  const s = sin(ph), c = cos(ph);
  const r: Rig = { L: idle(), R: idle(), lg: 0, liftL: 0, liftR: 0, bob: sin(ph * 0.6) * 1.5, sway: 0, drop: 0, jump: 0, sh: 0, hd: 0, tilt: 0, expr: "neutral", eyes: "open" };
  switch (act) {
    case "walk": case "run": {
      const run = act === "run", a = s * (run ? 0.85 : 0.5);
      r.lg = a; r.bob = -abs(s) * (run ? 9 : 5);
      r.L = { a: [0.12 + a * 0.9, 0.12 + a * 0.9 + (run ? 0.9 : 0.15)] }; r.R = { a: [0.12 - a * 0.9, 0.12 - a * 0.9 + (run ? 0.9 : 0.15)] };
      if (run) r.expr = "smile";
      break;
    }
    case "jump": r.jump = -abs(sin(ph / 2)) * 95; r.bob = 0; r.liftL = r.liftR = 22; r.L = { a: [2.4, 2.4] }; r.R = { a: [2.4, 2.4] }; r.expr = "laugh"; r.eyes = "happy"; break;
    case "sit": r.drop = 38; r.bob = 0; r.sh = sin(ph * 0.6) * 1.4; r.hd = sin(ph * 0.5) * 1.2; r.L = { a: [0.25, 0.4] }; r.R = { a: [0.25, 0.4] }; r.prop = "stool"; r.expr = "smile"; break;
    case "dance":
      r.bob = -abs(s) * 10; r.sway = sin(ph / 2) * 8; r.L = { a: [2.2 + 0.5 * s, 2.2 + 0.5 * s] }; r.R = { a: [2.2 - 0.5 * s, 2.2 - 0.5 * s] };
      r.liftL = Math.max(0, s) * 18; r.liftR = Math.max(0, -s) * 18; r.expr = "laugh"; r.eyes = "happy"; break;
    case "talk":
      r.R = { a: [0.7 + 0.25 * sin(ph * 0.9), 1.5 + 0.5 * sin(ph * 1.7)] }; r.L = { a: [0.25 + 0.1 * sin(ph * 1.1 + 1), 0.45] };
      r.hd = sin(ph * 2.2) * 2; r.tilt = sin(ph * 0.7) * 0.04; r.expr = "smile"; r.talk = true; r.noHold = true; break;
    case "wave": r.R = { a: [2.3, 2.3 + 0.6 * sin(ph * 3)] }; r.expr = "smile"; r.noHold = true; break;
    case "clap": {
      const cp = (1 + s) / 2;
      r.L = { a: [0.45, PI + 0.8 + 0.55 * cp] }; r.R = { a: [0.45, PI + 0.8 + 0.55 * cp] }; r.armsFront = true; r.expr = "smile"; r.eyes = "happy"; r.noHold = true; r.bob = -abs(sin(ph * 0.5)) * 2; break;
    }
    case "salute": r.R = { a: [2.4, PI + 0.9 + 0.05 * sin(ph * 2)] }; r.headR = true; r.bob = 0; r.sh = sin(ph * 0.6) * 1.4; r.hd = sin(ph * 0.5) * 1.2; r.noHold = true; break;
    case "point": r.R = { a: [1.5, 1.5 + 0.08 * s] }; r.expr = "smile"; r.noHold = true; r.prop = "finger"; break;
    case "thumbsup": r.R = { a: [0.9, PI + 0.15] }; r.expr = "smile"; r.eyes = "happy"; r.noHold = true; r.prop = "thumb"; r.hd = -1 - 1.5 * abs(s); break;
    case "namaste": r.L = { h: [-9, -180] }; r.R = { h: [9, -180] }; r.armsFront = true; r.hd = 4 + 3 * s; r.expr = "smile"; r.noHold = true; break;
    case "bow": { const dip = 0.5 - 0.5 * cos(ph * 0.8); r.sh = dip * 8; r.hd = dip * 24; r.L = { a: [0.1, 0.1] }; r.R = { a: [0.1, 0.1] }; r.expr = "smile"; r.eyes = "closed"; r.noHold = true; break; }
    case "shrug": { const u = 0.5 + 0.5 * s; r.L = { a: [0.5, 1.3] }; r.R = { a: [0.5, 1.3] }; r.sh = -8 * u; r.hd = -3 * u; r.tilt = 0.05 * s; r.eyes = "up"; r.noHold = true; break; }
    case "cheer": r.L = { a: [2.55 + 0.15 * s, 2.55 + 0.15 * s] }; r.R = { a: [2.55 - 0.15 * s, 2.55 - 0.15 * s] }; r.jump = -abs(sin(ph)) * 14; r.expr = "laugh"; r.eyes = "happy"; r.noHold = true; break;
    case "angry":
      r.L = { a: [0.8, -0.7] }; r.R = { a: [0.8, -0.7] }; r.bob = sin(ph * 7) * 2; r.sway = sin(ph * 5) * 2; r.expr = "shout"; r.talk = true; r.hd = 4; r.prop = "anger"; r.noHold = true; break;
    case "laugh":
      r.L = { a: [0.5, -1.29] }; r.R = { a: [0.5, -1.29] }; r.armsFront = true; r.bob = sin(ph * 9) * 3; r.hd = -4; r.tilt = sin(ph * 6) * 0.05; r.expr = "laugh"; r.eyes = "happy"; r.noHold = true; break;
    case "cry":
      r.L = { a: [2.4, PI + 1.14] }; r.R = { a: [2.4, PI + 1.14] }; r.headL = r.headR = true; r.bob = sin(ph * 8) * 2; r.expr = "cry"; r.eyes = "closed"; r.noHold = true; r.prop = "tears"; break;
    case "scared":
      r.L = { a: [2.0, PI + 1.1] }; r.R = { a: [2.0, PI + 1.1] }; r.headL = r.headR = true; r.sway = sin(ph * 14) * 2; r.expr = "scared"; r.eyes = "wide"; r.noHold = true; r.prop = "sweat"; r.hd = 2; break;
    case "think":
      r.R = { a: [2.3, -1.3] }; r.L = { a: [0.6, -1.2] }; r.armsFront = true; r.headR = true; r.tilt = 0.1; r.eyes = "up"; r.expr = "think"; r.noHold = true; r.prop = "think"; break;
    case "cook":
      r.R = { h: [38 + 14 * cos(ph * 2), -146 + 6 * sin(ph * 2)] }; r.L = { h: [-4, -118] }; r.armsFront = true; r.expr = "smile"; r.noHold = true; r.prop = "cook"; r.bob = 0; break;
    case "teach":
      r.R = { h: [100, -246 + 4 * s] }; r.L = { a: [0.45 + 0.1 * sin(ph * 0.8), 0.9] }; r.expr = "smile"; r.talk = true; r.noHold = true; r.prop = "teach"; r.tilt = 0.05; break;
    case "carry":
      r.L = { h: [-36, -112] }; r.R = { h: [36, -112] }; r.armsFront = true; r.lg = s * 0.3; r.bob = -abs(s) * 3; r.expr = "smile"; r.noHold = true; r.prop = "box"; break;
    case "read":
      r.L = { h: [-30, -166] }; r.R = { h: [30, -166] }; r.armsFront = true; r.eyes = "down"; r.hd = 4; r.noHold = true; r.prop = "book"; break;
    case "write":
      r.L = { h: [-30, -168] }; r.R = { h: [10 + 7 * sin(ph * 3), -158 + 3 * cos(ph * 5)] }; r.armsFront = true; r.eyes = "down"; r.hd = 5; r.noHold = true; r.prop = "paper"; break;
    case "eat": {
      const u = 0.5 + 0.5 * sin(ph * 1.2);
      r.L = { h: [-30, -160] }; r.R = { h: [40 - 24 * u, -160 - 68 * u] }; r.armsFront = true; r.headR = u > 0.55; r.expr = "eat"; r.noHold = true; r.prop = "bowl"; break;
    }
    case "drink": {
      const u = 0.5 + 0.5 * sin(ph * 0.9);
      r.R = { h: [46 - 30 * u, -168 - 62 * u] }; r.L = { a: [0.8, -0.7] }; r.headR = u > 0.5; r.hd = -4 * u; r.eyes = u > 0.6 ? "closed" : "open"; r.noHold = true; r.prop = "cup"; break;
    }
    case "phone":
      r.R = { h: [50, -262] }; r.L = { a: [0.8, -0.7] }; r.headR = true; r.tilt = 0.06; r.expr = "smile"; r.talk = true; r.noHold = true; r.prop = "phone"; break;
    default: break;
  }
  return r;
}

function ik(sx: number, sy: number, tx: number, ty: number, side: number, up?: boolean): { e: [number, number]; h: [number, number] } {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
  const mx = U + FA - 0.5;
  if (d > mx) { dx *= mx / d; dy *= mx / d; d = mx; }
  if (d < 6) { d = 6; if (!dx && !dy) dy = 6; }
  const base = Math.atan2(dy, dx), A = Math.acos(Math.max(-1, Math.min(1, (U * U + d * d - FA * FA) / (2 * U * d))));
  const c1: [number, number] = [sx + U * cos(base + A), sy + U * sin(base + A)], c2: [number, number] = [sx + U * cos(base - A), sy + U * sin(base - A)];
  const sc = (e: [number, number]) => (up ? -e[1] : e[1] * 0.6 + side * (e[0] - sx) * 0.8);
  return { e: sc(c1) >= sc(c2) ? c1 : c2, h: [sx + dx, sy + dy] };
}

const shade = (hex: string, k = 0.84) => {
  const m = /^#([0-9a-f]{6})/i.exec(hex); if (!m) return hex;
  const n = parseInt(m[1], 16), ch = (v: number) => Math.round(v * k).toString(16).padStart(2, "0");
  return "#" + ch((n >> 16) & 255) + ch((n >> 8) & 255) + ch(n & 255);
};
const VW: Record<View, { wk: number; mv: number }> = { front: { wk: 1, mv: 1 }, q_front: { wk: 0.86, mv: 0.85 }, q_back: { wk: 0.86, mv: 0.85 }, back: { wk: 1, mv: 1 }, side: { wk: 0.56, mv: 1 } };

// ====================== মাথা ও মুখ ======================
type Face = { hx: number; hy: number; r: number; view: View; expr: Expr; eyes: Eyes; mouth: Mouth | null; ph: number; legacyTalk: number; tint?: boolean };

function mouthShapes(S: Shape[], mx: number, my: number, r: number, ws: number, m: Mouth) {
  const o = m.open;
  const IN = "#7a1f2b", TG = "#e57373";
  switch (m.shape) {
    case "A": S.push(E(mx, my, r * 0.2 * ws, r * (0.07 + 0.2 * o), IN), E(mx, my + r * 0.08 * o, r * 0.12 * ws, r * 0.06 * o, TG)); break;
    case "E": S.push(E(mx, my, r * (0.2 + 0.08 * o) * ws, r * (0.05 + 0.08 * o), IN), L(mx - r * 0.16 * ws, my - r * 0.03, mx + r * 0.16 * ws, my - r * 0.03, 2.5, "#fff", 0.9)); break;
    case "O": S.push(E(mx, my, r * (0.08 + 0.08 * o) * ws, r * (0.07 + 0.12 * o), IN), E(mx, my + r * 0.05 * o, r * 0.05 * ws, r * 0.04 * o, TG)); break;
    case "U": S.push(E(mx, my, r * (0.05 + 0.05 * o) * ws, r * (0.05 + 0.06 * o), IN)); break;
    case "C": S.push(E(mx, my, r * 0.13 * ws, r * (0.03 + 0.09 * o), IN)); break;
    default: S.push(L(mx - r * 0.14 * ws, my, mx + r * 0.14 * ws, my, 3, DARK)); break;
  }
}

function faceShapes(S: Shape[], G: Face, ws: number, fcx: number, side: boolean) {
  const { hy, r, expr, ph } = G;
  const ex = r * 0.36 * ws, ey = hy + r * 0.05;
  const eyes: Eyes = G.eyes === "open" && false ? "open" : G.eyes;
  const closed = eyes === "closed";
  const eyeAt = (x: number, k: number) => {
    if (closed) { S.push(L(x - 7 * k, ey, x + 7 * k, ey, 3, DARK)); return; }
    if (eyes === "happy") { S.push(PA(`M ${f(x - 8 * k)} ${f(ey + 3)} Q ${f(x)} ${f(ey - 10)} ${f(x + 8 * k)} ${f(ey + 3)}`, undefined, DARK, 3.5)); return; }
    if (eyes === "wide") { S.push(C(x, ey, r * 0.2 * k, "#fff"), CS(x, ey, r * 0.2 * k, DARK, 2), C(x, ey, r * 0.09 * k, DARK)); return; }
    const py = eyes === "up" ? -r * 0.07 : eyes === "down" ? r * 0.07 : 0;
    S.push(C(x, ey + py, r * 0.13 * k, DARK), C(x + 2, ey + py - 2, r * 0.04 * k, "#fff"));
  };
  if (side) eyeAt(fcx + r * 0.0 + ex * 0.0 + r * 0.5 - fcx + fcx, 0.9); // একটি চোখ
  else { eyeAt(fcx - ex, ws < 1 ? 0.85 : 1); eyeAt(fcx + ex, ws < 1 ? 1.05 : 1); }
  // ভুরু
  const bx = (side ? [fcx + r * 0.5] : [fcx - ex, fcx + ex]);
  const brow = (x: number, k: number) => {
    if (expr === "angry" || expr === "shout") S.push(L(x - 9 * k, ey - 17 + (k > 0 ? 0 : 0), x + 9 * k, ey - 9, 4, DARK));
    else if (expr === "sad" || expr === "cry") S.push(L(x - 9 * k, ey - 10, x + 9 * k, ey - 18, 4, DARK));
    else if (expr === "scared") S.push(L(x - 8, ey - 21, x + 8, ey - 21, 3.5, DARK));
    else if (expr === "think" && k > 0) S.push(L(x - 8, ey - 20, x + 8, ey - 23, 3.5, DARK));
  };
  if (side) { if (expr === "angry" || expr === "shout") S.push(L(bx[0] - 8, ey - 18, bx[0] + 8, ey - 9, 4, DARK)); else brow(bx[0], 1); }
  else { brow(bx[0], 1); if (expr === "angry" || expr === "shout") S.push(L(bx[1] + 9, ey - 17, bx[1] - 9, ey - 9, 4, DARK)); else if (expr === "sad" || expr === "cry") S.push(L(bx[1] + 9, ey - 10, bx[1] - 9, ey - 18, 4, DARK)); else if (expr === "scared") S.push(L(bx[1] - 8, ey - 21, bx[1] + 8, ey - 21, 3.5, DARK)); else if (expr === "think") S.push(L(bx[1] - 8, ey - 20, bx[1] + 8, ey - 23, 3.5, DARK)); }
  // গাল
  if (!side) S.push(C(fcx - r * 0.62 * ws, hy + r * 0.38, r * 0.15, "#ff8a8a", 0.45), C(fcx + r * 0.62 * ws, hy + r * 0.38, r * 0.15, "#ff8a8a", 0.45));
  if (!side) S.push(E(fcx, hy + r * 0.25, r * 0.08, r * 0.06, "#000", 0.18));
  // কান্নার জল
  if (expr === "cry") for (let i = 0; i < 3; i++) { const t = (ph * 1.4 + i * 0.33) % 1; for (const sx of (side ? [bx[0]] : bx)) S.push(E(sx + (i - 1) * 3, ey + 8 + t * 46, 3.5, 6, "#6ec6ff", 1 - t * 0.7)); }
  // মুখ
  const my = hy + r * 0.52, mx = side ? G.hx + r * 0.62 : fcx;
  const mw = side ? 0.5 : ws;
  if (G.mouth) { mouthShapes(S, mx, my, r, mw, G.mouth); return; }
  if (G.legacyTalk > 0.12) { S.push(E(mx, my, r * 0.18 * mw + r * 0.06 * G.legacyTalk, r * 0.05 + r * 0.2 * G.legacyTalk, "#7a1f2b"), E(mx, my + r * 0.08 * G.legacyTalk, r * 0.1 * mw, r * 0.06 * G.legacyTalk, "#e57373")); return; }
  const w = r * 0.22 * mw;
  switch (expr) {
    case "smile": S.push(PA(`M ${f(mx - w)} ${f(my - 3)} Q ${f(mx)} ${f(my + r * 0.3)} ${f(mx + w)} ${f(my - 3)}`, undefined, DARK, 3)); break;
    case "laugh": S.push(PA(`M ${f(mx - w * 1.3)} ${f(my - 4)} Q ${f(mx)} ${f(my + r * 0.6)} ${f(mx + w * 1.3)} ${f(my - 4)} Z`, "#7a1f2b", DARK, 2), E(mx, my + r * 0.18, w * 0.7, r * 0.09, "#e57373")); break;
    case "sad": S.push(PA(`M ${f(mx - w)} ${f(my + 4)} Q ${f(mx)} ${f(my - r * 0.18)} ${f(mx + w)} ${f(my + 4)}`, undefined, DARK, 3)); break;
    case "cry": S.push(PA(`M ${f(mx - w)} ${f(my + 8)} Q ${f(mx)} ${f(my - r * 0.3)} ${f(mx + w)} ${f(my + 8)} Z`, "#7a1f2b", DARK, 2)); break;
    case "scared": S.push(E(mx, my + 2, r * 0.1 * mw, r * 0.14, "#7a1f2b")); break;
    case "think": S.push(L(mx - w * 0.6, my, mx + w * 0.9, my - 4, 3, DARK)); break;
    case "eat": S.push(E(mx, my, r * 0.14 * mw, r * (0.04 + 0.08 * abs(sin(ph * 4))), "#7a1f2b")); break;
    default: S.push(PA(`M ${f(mx - w)} ${f(my - 2)} Q ${f(mx)} ${f(my + r * 0.2)} ${f(mx + w)} ${f(my - 2)}`, undefined, DARK, 3));
  }
}

function headShapes(S: Shape[], d: HumanDef, G: Face): void {
  const { hx, hy, r, view } = G;
  const skin = d.skin, hair = d.hair, st = d.hairStyle;
  const front = view === "front" || view === "q_front", qf = view === "q_front", qb = view === "q_back", bk = view === "back", sd = view === "side";
  const hairCol = st === "none" || st === "elder" ? skin : hair;
  const cap = (cx: number) => `M ${f(cx - r)} ${f(hy)} C ${f(cx - r)} ${f(hy - r * 1.4)}, ${f(cx + r)} ${f(hy - r * 1.4)}, ${f(cx + r)} ${f(hy)} C ${f(cx + r * 0.6)} ${f(hy - r * 0.55)}, ${f(cx - r * 0.6)} ${f(hy - r * 0.55)}, ${f(cx - r)} ${f(hy)} Z`;
  // ---- মাথার পেছনের জিনিস ----
  if (st === "long") S.push(R(sd ? hx - r * 1.1 : hx - r, hy - r * 0.2, sd ? r * 1.0 : r * 2, r * 1.75, hair, r * 0.5));
  if (st === "bun") S.push(C(sd ? hx - r * 0.5 : hx, hy - r * 1.15, r * 0.42, hair));
  if (sd) { S.push(C(hx - r * 0.1, hy + 2, r * 0.2, shade(skin, 0.92))); }
  else if (qf) S.push(C(hx - r - 1, hy + 2, r * 0.2, skin));
  else if (qb) S.push(C(hx + r * 0.88, hy + 2, r * 0.2, skin));
  else S.push(C(hx - r - 1, hy + 2, r * 0.2, skin), C(hx + r + 1, hy + 2, r * 0.2, skin));
  // ---- মাথা ----
  S.push(C(hx, hy, r, skin));
  if (sd) {
    S.push(PO([hx + r * 0.9, hy + r * 0.0, hx + r * 1.14, hy + r * 0.3, hx + r * 0.88, hy + r * 0.34], skin));
    S.push(C(hx - r * 0.12, hy + 2, r * 0.17, shade(skin, 0.9)));
  }
  // ---- চুল ----
  const full = bk || qb;
  if (full) {
    if (st === "none") { /* টাক/টুপি — চামড়াই */ }
    else if (st === "elder") S.push(E(hx + (qb ? -r * 0.12 : 0), hy + r * 0.28, r * 0.97, r * 0.66, hair));
    else S.push(C(hx + (qb ? -r * 0.15 : 0), hy, r * (qb ? 0.98 : 1.01), hair));
    if (st === "tuft") S.push(PA(`M ${f(hx - r * 0.7)} ${f(hy - r * 0.6)} Q ${f(hx)} ${f(hy - r * 1.5)} ${f(hx + r * 0.7)} ${f(hy - r * 0.6)} Z`, hair));
    if (st === "pigtails") S.push(C(hx - r * 1.15, hy + r * 0.2, r * 0.3, hair), C(hx + r * 1.15, hy + r * 0.2, r * 0.3, hair), C(hx - r * 0.98, hy - r * 0.12, r * 0.1, "#e63946"), C(hx + r * 0.98, hy - r * 0.12, r * 0.1, "#e63946"));
    if (st === "elder") S.push(C(hx - r * 0.92, hy - r * 0.2, r * 0.28, hair), C(hx + r * 0.92, hy - r * 0.2, r * 0.28, hair));
  } else if (sd) {
    if (st !== "none" && st !== "elder") S.push(C(hx - r * 0.4, hy - r * 0.08, r * 0.7, hair), PA(cap(hx - r * 0.12), hair));
    if (st === "tuft") S.push(PA(`M ${f(hx - r * 0.7)} ${f(hy - r * 0.6)} Q ${f(hx - r * 0.1)} ${f(hy - r * 1.5)} ${f(hx + r * 0.5)} ${f(hy - r * 0.6)} Z`, hair));
    if (st === "pigtails") S.push(C(hx - r * 0.95, hy + r * 0.3, r * 0.3, hair), C(hx - r * 0.7, hy - r * 0.1, r * 0.1, "#e63946"));
    if (st === "elder") S.push(C(hx - r * 0.75, hy - r * 0.1, r * 0.3, hair));
  } else {
    if (["short", "pigtails", "bun", "long"].includes(st)) S.push(PA(cap(hx), hair));
    if (st === "pigtails") S.push(C(hx - r * 1.15, hy + r * 0.2, r * 0.3, hair), C(hx + r * 1.15, hy + r * 0.2, r * 0.3, hair), C(hx - r * 0.98, hy - r * 0.12, r * 0.1, "#e63946"), C(hx + r * 0.98, hy - r * 0.12, r * 0.1, "#e63946"));
    if (st === "tuft") S.push(PA(`M ${f(hx - r * 0.7)} ${f(hy - r * 0.6)} Q ${f(hx)} ${f(hy - r * 1.5)} ${f(hx + r * 0.7)} ${f(hy - r * 0.6)} Z`, hair));
    if (st === "elder") S.push(C(hx - r * 0.92, hy - r * 0.2, r * 0.28, hair), C(hx + r * 0.92, hy - r * 0.2, r * 0.28, hair));
  }
  // ---- মুখ ----
  if (front || sd) {
    const fs = qf ? 0.3 : 0, ws = qf ? 0.85 : 1;
    faceShapes(S, G, ws, hx + r * fs, sd);
    if (G.expr === "angry" || G.expr === "shout") S.push(C(hx, hy, r, "#ff3b30", 0.16));
    const fcx = sd ? hx + r * 0.5 : hx + r * fs, ex = r * 0.36 * ws, ey = hy + r * 0.05;
    if (d.extras.includes("moustache")) S.push(E(sd ? hx + r * 0.7 : fcx, hy + r * 0.36, sd ? r * 0.2 : r * 0.42 * ws, r * 0.1, d.hair === "#f2f2f2" ? "#e8e8e8" : d.hair));
    if (d.extras.includes("glasses")) {
      if (sd) S.push(CS(fcx, ey, r * 0.24, DARK, 3), L(fcx - r * 0.24, ey, hx - r * 0.1, ey, 3, DARK));
      else S.push(CS(fcx - ex, ey, r * 0.24, DARK, 3), CS(fcx + ex, ey, r * 0.24, DARK, 3), L(fcx - ex + r * 0.24, ey, fcx + ex - r * 0.24, ey, 3, DARK));
    }
    if (d.extras.includes("bindi") && !sd) S.push(C(fcx, hy - r * 0.35, r * 0.07, "#d62828"));
  }
  if (d.extras.includes("hat")) { const o = sd ? -r * 0.05 : 0; S.push(PO([hx + o - r * 0.85, hy - r * 0.55, hx + o + r * 0.85, hy - r * 0.55, hx + o + r * 0.45, hy - r * 1.35, hx + o - r * 0.45, hy - r * 1.35], "#e7c566"), E(hx + o, hy - r * 0.6, r * 1.55, r * 0.3, "#d9b04a"), L(hx + o - r * 0.8, hy - r * 0.68, hx + o + r * 0.8, hy - r * 0.68, 5, "#b5453a")); }
}

// ====================== আসবাব/যন্ত্র (প্রপ) ======================
type PCtx = { ph: number; hL: [number, number]; hR: [number, number]; eR: [number, number]; hx: number; hy: number; r: number; d: HumanDef };
function propShapes(name: string | undefined, x: PCtx): { back: Shape[]; mid: Shape[]; front: Shape[] } {
  const back: Shape[] = [], mid: Shape[] = [], front: Shape[] = [];
  const { ph, hL, hR, hx, hy, r, d } = x, s = sin(ph), c = cos(ph);
  switch (name) {
    case "stool": back.push(R(-48, -64, 96, 13, "#a9773e", 5), R(-40, -52, 9, 52, "#8a5a2b"), R(31, -52, 9, 52, "#8a5a2b")); break;
    case "finger": { const dx = hR[0] - x.eR[0], dy = hR[1] - x.eR[1], n = Math.hypot(dx, dy) || 1; front.push(L(hR[0], hR[1], hR[0] + (dx / n) * 20, hR[1] + (dy / n) * 20, 7, d.skin)); break; }
    case "thumb": front.push(L(hR[0], hR[1] - 6, hR[0], hR[1] - 26, 8, d.skin), C(hR[0], hR[1] - 26, 4.5, d.skin)); break;
    case "anger": { const k = 1 + 0.25 * abs(s), ax = hx + r * 0.75, ay = hy - r * 1.0; front.push(L(ax - 8 * k, ay - 6 * k, ax - 2 * k, ay - 2 * k, 4, "#e63946"), L(ax + 8 * k, ay - 6 * k, ax + 2 * k, ay - 2 * k, 4, "#e63946"), L(ax - 8 * k, ay + 6 * k, ax - 2 * k, ay + 2 * k, 4, "#e63946"), L(ax + 8 * k, ay + 6 * k, ax + 2 * k, ay + 2 * k, 4, "#e63946")); break; }
    case "tears": break; // মুখের ভেতরেই
    case "sweat": { const t = (ph * 0.8) % 1, sx = hx + r * 1.1, sy = hy - r * 0.5 + t * 30; front.push(PA(`M ${f(sx)} ${f(sy)} Q ${f(sx + 7)} ${f(sy + 13)} ${f(sx)} ${f(sy + 17)} Q ${f(sx - 7)} ${f(sy + 13)} ${f(sx)} ${f(sy)} Z`, "#7fd1ff", undefined, 0, 1 - t * 0.6)); break; }
    case "think": { const bx = hx + r * 1.2, by = hy - r * 1.5 + s * 3; front.push(C(bx - 16, by + 40, 5, "#fff", 0.95), C(bx - 4, by + 24, 8, "#fff", 0.95), E(bx + 22, by - 8, 38, 24, "#fff", 0.97), PA(`M ${f(bx + 14)} ${f(by - 14)} Q ${f(bx + 14)} ${f(by - 24)} ${f(bx + 22)} ${f(by - 24)} Q ${f(bx + 32)} ${f(by - 24)} ${f(bx + 32)} ${f(by - 15)} Q ${f(bx + 32)} ${f(by - 8)} ${f(bx + 22)} ${f(by - 6)}`, undefined, "#555", 3.5), C(bx + 22, by + 2, 2.6, "#555")); break; }
    case "cook": {
      mid.push(R(-80, -102, 160, 102, "#b9824a", 4), R(-86, -110, 172, 12, "#d9a15f", 4), L(0, -90, 0, -6, 3, "#8a5a2b"), C(-10, -50, 3, "#f4c430"), C(10, -50, 3, "#f4c430"));
      mid.push(E(34, -122, 40, 20, "#3b3b44"), E(34, -131, 40, 9, "#5a5a66"), E(34, -131, 33, 6, "#e0702e"), C(8 + 0, -128, 5, "#3b3b44"), C(60, -128, 5, "#3b3b44"));
      for (let i = 0; i < 3; i++) { const t = (ph * 0.5 + i * 0.33) % 1; mid.push(C(24 + i * 10 + sin(ph + i) * 4, -140 - t * 46, 6 + t * 7, "#fff", 0.6 * (1 - t))); }
      front.push(L(hR[0], hR[1], 34 + 6 * c, -128, 5, "#8a5a2b"));
      front.push(R(hx - r * 0.75, hy - r * 1.55, r * 1.5, r * 0.75, "#fff", 8), C(hx - r * 0.5, hy - r * 1.55, r * 0.4, "#fff"), C(hx, hy - r * 1.75, r * 0.5, "#fff"), C(hx + r * 0.5, hy - r * 1.55, r * 0.4, "#fff"), R(hx - r * 0.8, hy - r * 0.9, r * 1.6, r * 0.16, "#e6e6e6", 4));
      break;
    }
    case "teach": {
      back.push(R(64, -342, 118, 90, "#7a4a21", 8), R(70, -336, 106, 78, "#1f4d3a", 6), L(82, -318, 150, -318, 3, "#fff", 0.85), L(82, -302, 128, -302, 3, "#fff", 0.85), L(82, -286, 158, -286, 3, "#fff", 0.85), C(160, -318, 6, "#fff", 0.8), R(70, -256, 106, 6, "#a9773e", 2));
      front.push(L(hR[0] - 8, hR[1] + 4, hR[0] + 34, hR[1] - 18, 4, "#e7c566"));
      break;
    }
    case "box": mid.push(R(-48, -176, 96, 68, "#c8a15a", 4), R(-8, -176, 16, 68, "#e2c488"), L(-48, -142, 48, -142, 2, "#a8803f"), R(14, -158, 26, 18, "#fff", 2)); break;
    case "book": mid.push(R(-38, -196, 76, 52, "#3a6ea5", 4), PO([-34, -192, 0, -186, 0, -150, -34, -156], "#fff"), PO([0, -186, 34, -192, 34, -156, 0, -150], "#f7f3e6"), L(-28, -178, -6, -174, 2, "#999"), L(-28, -168, -6, -164, 2, "#999"), L(6, -174, 28, -178, 2, "#999"), L(6, -164, 28, -168, 2, "#999")); break;
    case "paper": mid.push(PO([-42, -188, -6, -192, -4, -148, -40, -144], "#fff"), L(-36, -178, -12, -181, 2, "#9aa"), L(-36, -168, -12, -171, 2, "#9aa"), L(-36, -158, -14, -161, 2, "#9aa")); front.push(L(hR[0] - 4, hR[1] - 14, hR[0] + 6, hR[1] + 8, 5, "#f4c430"), C(hR[0] + 6, hR[1] + 9, 2.5, "#333")); break;
    case "bowl": front.push(E(hL[0], hL[1] + 8, 24, 11, "#d8cdb8"), E(hL[0], hL[1] + 1, 19, 9, "#ffffff"), L(hR[0] - 3, hR[1] + 6, hR[0] + 5, hR[1] - 14, 4, "#c8ccd4")); break;
    case "cup": front.push(R(hR[0] - 9, hR[1] - 22, 18, 28, "#4aa3df", 4), E(hR[0], hR[1] - 22, 9, 3, "#bfe6ff")); break;
    case "phone": front.push(R(hR[0] - 6, hR[1] - 18, 12, 32, "#222", 3), R(hR[0] - 4, hR[1] - 14, 8, 20, "#4cc9f0", 2)); break;
    default: break;
  }
  return { back, mid, front };
}

// ====================== ঘুম (শোয়া) ======================
function sleepShapes(d: HumanDef, p: Pose): Shape[] {
  const S: Shape[] = [], ph = p.phase, br = sin(ph * 0.8) * 2.5;
  const r = 44 * d.head * 0.92, hx = -34, hy = -52 - r * 0.2;
  S.push(R(-110, -26, 270, 26, "#6b86c9", 8), R(-110, -26, 270, 7, "#8aa3de", 4), E(-38, -40, 52, 17, "#fff"));
  S.push(E(146, -44, 16, 10, d.skin));
  S.push(R(-8, -80 + br * 0.3, 40, 48, d.top, 16));
  S.push(R(-2, -78 - br, 148, 46 + br, d.top2 ?? "#ff8a3d", 18), R(-2, -52, 148, 9, "#ffffff", 4, 0.35));
  headShapes(S, d, { hx, hy, r, view: "front", expr: "smile", eyes: "closed", mouth: null, ph, legacyTalk: 0 });
  for (let i = 0; i < 3; i++) {
    const t = (ph * 0.35 + i * 0.34) % 1, sz = 9 + i * 5 + t * 6, zx = 20 + i * 30 + t * 14, zy = -130 - t * 38 - i * 18;
    S.push(PA(`M ${f(zx)} ${f(zy)} L ${f(zx + sz)} ${f(zy)} L ${f(zx)} ${f(zy + sz)} L ${f(zx + sz)} ${f(zy + sz)}`, undefined, "#4a90d9", 3.5, 1 - t * 0.8));
  }
  return S;
}

// ====================== মূল ফাংশন ======================
export function humanShapes(d: HumanDef, p: Pose): Shape[] {
  const view: View = p.view ?? "front";
  if (p.action === "sleep") return sleepShapes(d, p);
  const ph = p.phase, rg = rigFor(p.action, ph);
  const { wk, mv } = VW[view];
  const sd = view === "side", bk = view === "back" || view === "q_back";
  const dx = rg.sway, dy = rg.bob + rg.drop + rg.jump;
  const skin = d.skin;
  const S: Shape[] = [];
  const hipY = -112 + rg.drop, Ll = 102, base = hipY + rg.bob * 0.3 + rg.jump;
  const sy = -205 + dy + rg.sh, swh = sd ? 8 : 34 * wk;
  const shL = -swh + dx, shR = swh + dx;

  // ---- হাতের বিন্দু ----
  const armPts = (sgn: number, arm: Arm, sx: number) => {
    if (arm.a) {
      const fx = sd ? 1 : sgn * mv;
      const ex = sx + fx * U * sin(arm.a[0]), ey = sy + U * cos(arm.a[0]);
      return { e: [ex, ey] as [number, number], h: [ex + fx * FA * sin(arm.a[1]), ey + FA * cos(arm.a[1])] as [number, number] };
    }
    let [tx, ty] = arm.h!;
    tx = sd ? abs(tx) * 0.6 + 6 : tx * mv;
    return ik(sx, sy, tx + dx, ty + dy + rg.sh, sd ? 1 : sgn, arm.up);
  };
  const pL = armPts(-1, rg.L, shL), pR = armPts(1, rg.R, shR);

  // ---- মাথার অবস্থান ----
  const r = 44 * d.head;
  const hx = dx + rg.tilt * 40, hy = -222 - r * 0.85 + dy + rg.sh + rg.hd;

  const props = propShapes(rg.prop, { ph, hL: pL.h, hR: pR.h, eR: pR.e, hx, hy, r, d });
  S.push(...props.back);

  // ---- পা ----
  const upperCol = d.lower === "shorts" || d.lower === "pants" ? d.bottom : skin;
  const lowerCol = d.lower === "pants" ? d.bottom : skin;
  const legList = [-1, 1].map((sg) => {
    const ang = sg * rg.lg, hxl = sd ? sg * 5 : sg * 15 * wk, lift = sg < 0 ? rg.liftL : rg.liftR;
    if (p.action === "sit") { const sw = sin(ph * 1.3 + (sg > 0 ? PI : 0)) * 7; return { sg, hx: hxl, mx: hxl + sg * 6 * wk + (sd ? 18 : 0), my: -62, fx: hxl + sg * 8 * wk + (sd ? 44 : 0) + sw, fy: -10 - abs(sw) * 0.3 }; }
    return { sg, hx: hxl, mx: hxl + 0.5 * Ll * sin(ang), my: base + 0.5 * Ll * cos(ang) - lift * 0.5, fx: hxl + Ll * sin(ang), fy: base + Ll * cos(ang) - lift };
  });
  for (const lg of legList) {
    const far = sd && lg.sg < 0, k = far ? 0.82 : 1;
    S.push(L(lg.hx, base, lg.mx, lg.my, 26, shade(upperCol, k)));
    S.push(L(lg.mx, lg.my, lg.fx, lg.fy - 6, d.lower === "pants" ? 25 : 16, shade(lowerCol, k)));
    S.push(E(lg.fx + (sd ? 10 : bk ? 0 : 7), lg.fy - 2, sd ? 20 : 17, 8, shade(d.shoe, k)));
  }
  if (d.lower === "lungi") S.push(PO([-38 * wk + dx, -120 + dy, 38 * wk + dx, -120 + dy, 44 * wk, -34, -44 * wk, -34], d.bottom), L(-38 * wk + dx, -76 + dy * 0.5, 38 * wk + dx, -76 + dy * 0.5, 4, "#ffffff", 0.35));

  // ---- হাত আঁকা ----
  const longSleeve = d.outfit === "shirt" || d.outfit === "panjabi";
  const arm = (pt: { e: [number, number]; h: [number, number] }, sx: number, far: boolean) => {
    const k = far ? 0.82 : 1, sk = shade(skin, k), sl = shade(d.top, k);
    S.push(L(sx, sy, pt.e[0], pt.e[1], 17, sk), L(pt.e[0], pt.e[1], pt.h[0], pt.h[1], 16, sk), C(pt.e[0], pt.e[1], 8.5, sk));
    if (d.outfit !== "vest") {
      const kk = longSleeve ? 0.85 : d.outfit === "tee" || d.outfit === "frock" || d.outfit === "romper" ? 0.4 : 0.55, Ls = kk * (U + FA);
      const u1 = Math.min(1, Ls / U);
      S.push(L(sx, sy, sx + (pt.e[0] - sx) * u1, sy + (pt.e[1] - sy) * u1, 22, sl));
      if (Ls > U) { const u2 = (Ls - U) / FA; S.push(L(pt.e[0], pt.e[1], pt.e[0] + (pt.h[0] - pt.e[0]) * u2, pt.e[1] + (pt.h[1] - pt.e[1]) * u2, 21, sl), C(pt.e[0], pt.e[1], 10.5, sl)); }
    }
    S.push(C(pt.h[0], pt.h[1], 10, sk));
  };
  const farFirst = sd; // পাশ থেকে দূরের হাত আগে
  if (!rg.armsFront || farFirst) if (!rg.headL) arm(pL, shL, sd);

  // ---- ধড় ----
  const T = (x: number) => x * wk + dx;
  const t2 = d.top2 ?? d.top;
  if (d.outfit === "frock") S.push(PO([T(-30), -215 + dy, T(30), -215 + dy, 58 * wk, -78, -58 * wk, -78], d.top), L(-52 * wk, -86, 52 * wk, -86, 6, t2));
  else if (d.outfit === "saree") {
    S.push(PO([T(-32), -215 + dy, T(32), -215 + dy, 50 * wk, -16, -50 * wk, -16], d.top), L(-49 * wk, -22, 49 * wk, -22, 8, t2));
    S.push(R(T(-32), -215 + dy, 64 * wk, 38, t2, 12));
    if (!bk) S.push(PO([T(-34), -212 + dy, T(-12), -216 + dy, 40 * wk, -80, 14 * wk, -74], t2, 0.95));
  } else if (d.outfit === "panjabi") { S.push(R(T(-37), -217 + dy, 74 * wk, 150, d.top, 20)); if (!bk) S.push(L(T(-3), -212 + dy, T(-3), -150 + dy, 3, t2), C(T(-3), -185 + dy, 3, t2)); }
  else if (d.outfit === "romper") S.push(R(T(-36), -215 + dy, 72 * wk, 108, d.top, 22), R(-36 * wk, -150 + dy, 72 * wk, 8, t2));
  else if (d.outfit === "vest") S.push(R(T(-34), -215 + dy, 68 * wk, 112, skin, 22), R(T(-34), -215 + dy, 20 * wk, 100, d.top, 8), R(T(14), -215 + dy, 20 * wk, 100, d.top, 8));
  else S.push(R(T(-34), -215 + dy, 68 * wk, 112, d.top, 22));
  if (d.extras.includes("tie") && !bk && !sd) S.push(PO([T(-5), -212 + dy, T(5), -212 + dy, T(8), -160 + dy, T(0), -150 + dy, T(-8), -160 + dy], "#c0392b"));
  if (d.extras.includes("gamchha")) S.push(PO([T(-34), -212 + dy, T(-12), -217 + dy, T(38), -108 + dy, T(14), -102 + dy], "#d94141"), L(T(-10), -190 + dy, T(28), -118 + dy, 3, "#fff", 0.8));
  S.push(...props.mid);

  // ---- সামনের হাত ----
  if (rg.armsFront && !farFirst && !rg.headL) arm(pL, shL, false);
  if (!rg.headR) arm(pR, shR, false);
  if (!rg.noHold) {
    if (d.extras.includes("book")) S.push(R(pL.h[0] - 16, pL.h[1] - 34, 30, 40, "#3a6ea5", 3), R(pL.h[0] - 12, pL.h[1] - 30, 22, 6, "#fff"), C(pL.h[0], pL.h[1], 10, skin));
    if (d.extras.includes("stick")) S.push(L(pR.h[0] + 4, pR.h[1] - 12, pR.h[0] + 10, -4, 6, "#7a4a21"), C(pR.h[0], pR.h[1], 10, skin));
  }

  // ---- গলা ও মাথা ----
  S.push(R(hx - 9, -232 + dy + rg.sh * 0.5, 18, 24, skin));
  headShapes(S, d, {
    hx, hy, r, view, expr: rg.expr, eyes: p.blink && rg.eyes === "open" ? "closed" : rg.eyes, ph, legacyTalk: p.mouth ? 0 : p.talk,
    mouth: p.mouth ?? (rg.talk && p.talk <= 0.12 ? synth(ph) : null),
  });
  if (rg.headL) arm(pL, shL, false);
  if (rg.headR) arm(pR, shR, false);
  S.push(...props.front);
  return S;
}

const SYN: Mouth["shape"][] = ["A", "E", "O", "M", "A", "U", "E", "C"];
function synth(ph: number): Mouth { const i = Math.floor(ph * 2.4); return { shape: SYN[((i % 8) + 8) % 8], open: 0.55 + 0.45 * abs(sin(ph * 7)) }; }

const SK = { a: "#c98a5b", b: "#d9a066", c: "#b9794c", d: "#cf9163", e: "#c58a5f", f: "#a96d43" };
export const HUMANS: Record<string, HumanDef> = {
  boy: { skin: SK.a, hair: "#1b1b1b", hairStyle: "short", top: "#e63946", bottom: "#2a4d9b", outfit: "tee", lower: "shorts", head: 1, shoe: "#333", extras: [] },
  girl: { skin: SK.b, hair: "#1b1b1b", hairStyle: "pigtails", top: "#ff6fb5", top2: "#ffd1e8", bottom: "#fff", outfit: "frock", lower: "none", head: 1, shoe: "#b5453a", extras: [] },
  kid: { skin: SK.d, hair: "#1b1b1b", hairStyle: "tuft", top: "#ffd23f", top2: "#ff8a3d", bottom: "#ffd23f", outfit: "romper", lower: "shorts", head: 1.35, shoe: "#e63946", extras: [] },
  man: { skin: SK.a, hair: "#1b1b1b", hairStyle: "short", top: "#3a7bd5", bottom: "#3b3f4a", outfit: "shirt", lower: "pants", head: 1, shoe: "#222", extras: [] },
  woman: { skin: SK.d, hair: "#1b1b1b", hairStyle: "bun", top: "#c0392b", top2: "#f1c40f", bottom: "#c0392b", outfit: "saree", lower: "none", head: 1, shoe: "#8a5a2b", extras: ["bindi"] },
  elder: { skin: SK.e, hair: "#f2f2f2", hairStyle: "elder", top: "#f4efe0", top2: "#c9c2a8", bottom: "#3a5ba0", outfit: "panjabi", lower: "lungi", head: 1, shoe: "#7a4a21", extras: ["moustache", "glasses", "stick"] },
  farmer: { skin: SK.f, hair: "#1b1b1b", hairStyle: "none", top: "#8a8f98", bottom: "#d9d2b0", outfit: "vest", lower: "lungi", head: 1, shoe: "#7a4a21", extras: ["hat", "gamchha", "moustache"] },
  teacher: { skin: SK.b, hair: "#1b1b1b", hairStyle: "short", top: "#f5f5f5", bottom: "#4a4f5c", outfit: "shirt", lower: "pants", head: 1, shoe: "#222", extras: ["glasses", "tie", "book"] },
};
