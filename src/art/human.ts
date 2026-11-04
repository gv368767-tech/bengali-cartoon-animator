import { C, CS, DARK, E, L, PA, PO, R, Shape, Pose, abs, cos, f, sin, PI } from "./shapes";

export type HumanDef = {
  skin: string; hair: string;
  hairStyle: "short" | "pigtails" | "bun" | "tuft" | "elder" | "long" | "none";
  top: string; top2?: string; bottom: string;
  outfit: "tee" | "frock" | "saree" | "panjabi" | "shirt" | "romper" | "vest";
  lower: "shorts" | "pants" | "lungi" | "none";
  head: number; shoe: string;
  extras: ("glasses" | "moustache" | "hat" | "gamchha" | "book" | "tie" | "stick" | "bindi")[];
};

export function humanShapes(d: HumanDef, p: Pose): Shape[] {
  const S: Shape[] = [];
  const ph = p.phase, act = p.action;
  const walking = act === "walk" || act === "run";
  const sw = act === "run" ? 0.85 : 0.5;
  const a = walking ? sin(ph) * sw : 0;
  let bob = walking ? -abs(sin(ph)) * (act === "run" ? 9 : 5) : sin(ph * 0.6) * 1.5;
  let sway = 0, jump = 0, drop = 0;
  let thL = 0.12 + (walking ? a * 0.9 : 0), thR = 0.12 - (walking ? a * 0.9 : 0);
  let liftL = 0, liftR = 0;
  if (act === "wave") thR = 2.5 + 0.35 * sin(ph * 3);
  if (act === "dance") {
    bob = -abs(sin(ph)) * 10; sway = sin(ph / 2) * 8;
    thL = 2.2 + 0.5 * sin(ph); thR = 2.2 + 0.5 * sin(ph + PI);
    liftL = Math.max(0, sin(ph)) * 18; liftR = Math.max(0, -sin(ph)) * 18;
  }
  if (act === "jump") { jump = -abs(sin(ph / 2)) * 95; thL = thR = 2.4; liftL = liftR = 22; bob = 0; }
  if (act === "sit") { drop = 38; bob = 0; thL = 0.25; thR = 0.25; }
  const dy = bob + drop + jump, dx = sway;
  const hipY = -112 + drop, Ll = 102;
  const skin = d.skin;

  // ---- পা ----
  const hipDy = bob * 0.3 + jump, base = hipY + hipDy;
  const legs: { hx: number; fx: number; fy: number; mx: number; my: number }[] = [];
  for (const side of [-1, 1]) {
    const ang = side * a, hx = side * 15, lift = side < 0 ? liftL : liftR;
    if (act === "sit") legs.push({ hx, mx: hx + side * 6, my: -62, fx: hx + side * 8, fy: -10 });
    else legs.push({ hx, mx: hx + 0.5 * Ll * sin(ang), my: base + 0.5 * Ll * cos(ang) - lift * 0.5, fx: hx + Ll * sin(ang), fy: base + Ll * cos(ang) - lift });
  }
  const upperCol = d.lower === "shorts" ? d.bottom : d.lower === "pants" ? d.bottom : skin;
  const lowerCol = d.lower === "pants" ? d.bottom : skin;
  for (const lg of legs) {
    S.push(L(lg.hx, base, lg.mx, lg.my, 26, upperCol));
    S.push(L(lg.mx, lg.my, lg.fx, lg.fy - 6, d.lower === "pants" ? 25 : 16, lowerCol));
    S.push(E(lg.fx + 7, lg.fy - 2, 17, 8, d.shoe));
  }
  if (d.lower === "lungi") S.push(PO([-38, -120 + dy, 38, -120 + dy, 44, -34, -44, -34], d.bottom), L(-38, -76 + dy * 0.5, 38, -76 + dy * 0.5, 4, "#ffffff", 0.35));

  // ---- হাত ----
  const sy = -205 + dy, shL = -34 + dx, shR = 34 + dx, AL = 88;
  const armEnd = (sx: number, th: number, side: number) => [sx + side * AL * sin(th), sy + AL * cos(th)];
  const [lhx, lhy] = armEnd(shL, thL, -1), [rhx, rhy] = armEnd(shR, thR, 1);
  const arm = (sx: number, hx: number, hy: number, sleeve: string, long: boolean) => {
    S.push(L(sx, sy, hx, hy, 17, skin));
    const k = long ? 0.85 : d.outfit === "tee" || d.outfit === "frock" || d.outfit === "romper" ? 0.4 : 0.55;
    if (d.outfit !== "vest") S.push(L(sx, sy, sx + (hx - sx) * k, sy + (hy - sy) * k, 22, sleeve));
    S.push(C(hx, hy, 10, skin));
  };
  const longSleeve = d.outfit === "shirt" || d.outfit === "panjabi";
  arm(shL, lhx, lhy, d.top, longSleeve);

  // ---- ধড় ----
  const t2 = d.top2 ?? d.top;
  if (d.outfit === "frock") S.push(PO([-30 + dx, -215 + dy, 30 + dx, -215 + dy, 58, -78, -58, -78], d.top), L(-52, -86, 52, -86, 6, t2));
  else if (d.outfit === "saree") {
    S.push(PO([-32 + dx, -215 + dy, 32 + dx, -215 + dy, 50, -16, -50, -16], d.top), L(-49, -22, 49, -22, 8, t2));
    S.push(R(-32 + dx, -215 + dy, 64, 38, t2, 12));
    S.push(PO([-34 + dx, -212 + dy, -12 + dx, -216 + dy, 40, -80, 14, -74], t2, 0.95));
  } else if (d.outfit === "panjabi") S.push(R(-37 + dx, -217 + dy, 74, 150, d.top, 20), L(-3 + dx, -212 + dy, -3 + dx, -150 + dy, 3, t2), C(-3 + dx, -185 + dy, 3, t2));
  else if (d.outfit === "romper") S.push(R(-36 + dx, -215 + dy, 72, 108, d.top, 22), R(-36, -150 + dy, 72, 8, t2));
  else if (d.outfit === "vest") S.push(R(-34 + dx, -215 + dy, 68, 112, skin, 22), R(-34 + dx, -215 + dy, 20, 100, d.top, 8), R(14 + dx, -215 + dy, 20, 100, d.top, 8));
  else S.push(R(-34 + dx, -215 + dy, 68, 112, d.top, 22));
  if (d.extras.includes("tie")) S.push(PO([-5 + dx, -212 + dy, 5 + dx, -212 + dy, 8 + dx, -160 + dy, 0 + dx, -150 + dy, -8 + dx, -160 + dy], "#c0392b"));
  if (d.extras.includes("gamchha")) S.push(PO([-34 + dx, -212 + dy, -12 + dx, -217 + dy, 38 + dx, -108 + dy, 14 + dx, -102 + dy], "#d94141"), L(-10 + dx, -190 + dy, 28 + dx, -118 + dy, 3, "#fff", 0.8));
  arm(shR, rhx, rhy, d.top, longSleeve);
  if (d.extras.includes("book")) S.push(R(lhx - 16, lhy - 34, 30, 40, "#3a6ea5", 3), R(lhx - 12, lhy - 30, 22, 6, "#fff"), C(lhx, lhy, 10, skin));
  if (d.extras.includes("stick")) S.push(L(rhx + 4, rhy - 12, rhx + 10, -4, 6, "#7a4a21"), C(rhx, rhy, 10, skin));

  // ---- মাথা ----
  const r = 44 * d.head;
  const hx = dx, hy = -222 - r * 0.85 + dy;
  S.push(R(hx - 9, -232 + dy, 18, 24, skin));
  if (d.hairStyle === "long") S.push(R(hx - r, hy - r * 0.2, r * 2, r * 1.75, d.hair, r * 0.5));
  if (d.hairStyle === "bun") S.push(C(hx, hy - r * 1.15, r * 0.42, d.hair));
  S.push(C(hx - r - 1, hy + 2, r * 0.2, skin), C(hx + r + 1, hy + 2, r * 0.2, skin));
  S.push(C(hx, hy, r, skin));
  const cap = `M ${f(hx - r)} ${f(hy)} C ${f(hx - r)} ${f(hy - r * 1.4)}, ${f(hx + r)} ${f(hy - r * 1.4)}, ${f(hx + r)} ${f(hy)} C ${f(hx + r * 0.6)} ${f(hy - r * 0.55)}, ${f(hx - r * 0.6)} ${f(hy - r * 0.55)}, ${f(hx - r)} ${f(hy)} Z`;
  if (["short", "pigtails", "bun", "long"].includes(d.hairStyle)) S.push(PA(cap, d.hair));
  if (d.hairStyle === "pigtails") S.push(C(hx - r * 1.15, hy + r * 0.2, r * 0.3, d.hair), C(hx + r * 1.15, hy + r * 0.2, r * 0.3, d.hair), C(hx - r * 0.98, hy - r * 0.12, r * 0.1, "#e63946"), C(hx + r * 0.98, hy - r * 0.12, r * 0.1, "#e63946"));
  if (d.hairStyle === "tuft") S.push(PA(`M ${f(hx - r * 0.7)} ${f(hy - r * 0.6)} Q ${f(hx)} ${f(hy - r * 1.5)} ${f(hx + r * 0.7)} ${f(hy - r * 0.6)} Z`, d.hair));
  if (d.hairStyle === "elder") S.push(C(hx - r * 0.92, hy - r * 0.2, r * 0.28, d.hair), C(hx + r * 0.92, hy - r * 0.2, r * 0.28, d.hair));
  // মুখ
  const ex = r * 0.36, ey = hy + r * 0.05;
  if (p.blink) S.push(L(hx - ex - 7, ey, hx - ex + 7, ey, 3, DARK), L(hx + ex - 7, ey, hx + ex + 7, ey, 3, DARK));
  else S.push(C(hx - ex, ey, r * 0.13, DARK), C(hx + ex, ey, r * 0.13, DARK), C(hx - ex + 2, ey - 2, r * 0.04, "#fff"), C(hx + ex + 2, ey - 2, r * 0.04, "#fff"));
  S.push(C(hx - r * 0.62, hy + r * 0.38, r * 0.15, "#ff8a8a", 0.45), C(hx + r * 0.62, hy + r * 0.38, r * 0.15, "#ff8a8a", 0.45));
  S.push(E(hx, hy + r * 0.25, r * 0.08, r * 0.06, "#000", 0.18));
  const my = hy + r * 0.52;
  if (p.talk > 0.12) S.push(E(hx, my, r * 0.18 + r * 0.06 * p.talk, r * 0.05 + r * 0.2 * p.talk, "#7a1f2b"), E(hx, my + r * 0.08 * p.talk, r * 0.1, r * 0.06 * p.talk, "#e57373"));
  else S.push(PA(`M ${f(hx - r * 0.22)} ${f(my - 2)} Q ${f(hx)} ${f(my + r * 0.2)} ${f(hx + r * 0.22)} ${f(my - 2)}`, undefined, DARK, 3));
  if (d.extras.includes("moustache")) S.push(E(hx, hy + r * 0.36, r * 0.42, r * 0.1, d.hair === "#f2f2f2" ? "#e8e8e8" : d.hair));
  if (d.extras.includes("glasses")) S.push(CS(hx - ex, ey, r * 0.24, DARK, 3), CS(hx + ex, ey, r * 0.24, DARK, 3), L(hx - ex + r * 0.24, ey, hx + ex - r * 0.24, ey, 3, DARK));
  if (d.extras.includes("bindi")) S.push(C(hx, hy - r * 0.35, r * 0.07, "#d62828"));
  if (d.extras.includes("hat")) S.push(PO([hx - r * 0.85, hy - r * 0.55, hx + r * 0.85, hy - r * 0.55, hx + r * 0.45, hy - r * 1.35, hx - r * 0.45, hy - r * 1.35], "#e7c566"), E(hx, hy - r * 0.6, r * 1.55, r * 0.3, "#d9b04a"), L(hx - r * 0.8, hy - r * 0.68, hx + r * 0.8, hy - r * 0.68, 5, "#b5453a"));
  return S;
}

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
