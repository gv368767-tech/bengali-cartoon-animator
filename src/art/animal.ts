import { C, DARK, E, L, PA, PO, Shape, Pose, abs, cos, f, sin, PI } from "./shapes";

// সব চতুষ্পদ প্রাণী ডানদিকে মুখ করে (+x), পায়ের তলা y=0
export type QuadDef = {
  body: string; belly?: string; head: string; ear: string; legCol: string; hoof: string;
  bx: number; bodyRx: number; bodyRy: number; bodyY: number;
  hx: number; hy: number; hr: number; neck?: number;
  ears: "cow" | "dog" | "cat" | "goat" | "horse" | "elephant" | "monkey";
  tail: "cow" | "dog" | "cat" | "horse" | "monkey" | "goat" | "elephant";
  muzzle?: string; snout: number;
  horns?: string; trunk?: boolean; tusks?: boolean; mane?: string; spots?: string; udder?: boolean; beard?: boolean; whiskers?: boolean; legW: number;
};

export function quadShapes(d: QuadDef, p: Pose): Shape[] {
  const S: Shape[] = [];
  const ph = p.phase, act = p.action;
  const moving = act === "walk" || act === "run" || act === "dance";
  const sw = act === "run" ? 0.75 : 0.45;
  const a = moving ? sin(ph) * sw : 0;
  let dy = moving ? -abs(sin(ph)) * (act === "run" ? 8 : 3) : sin(ph * 0.6) * 1.2;
  let tuck = 0;
  if (act === "jump") { dy = -abs(sin(ph / 2)) * 80; tuck = 18; }
  if (act === "sit") dy = 18;
  const hipY = d.bodyY + d.bodyRy * 0.45;
  const Ll = -hipY - 4;
  const legs = [
    { x: d.bx - d.bodyRx * 0.62, ang: -a, far: true }, { x: d.bx + d.bodyRx * 0.62, ang: a, far: true },
    { x: d.bx - d.bodyRx * 0.5, ang: a, far: false }, { x: d.bx + d.bodyRx * 0.5, ang: -a, far: false },
  ];
  const leg = (l: { x: number; ang: number; far: boolean }) => {
    const sh = act === "sit" ? 0.7 : 1;
    const fx = l.x + Ll * sh * sin(l.ang), fy = hipY + dy + (Ll * sh) * cos(l.ang) - tuck - (act === "sit" ? 0 : 0);
    S.push(L(l.x, hipY + dy, fx, Math.min(fy, -4), d.legW, l.far ? shade(d.legCol) : d.legCol));
    S.push(E(fx + 3, Math.min(fy, -4) + 1, d.legW * 0.62, d.legW * 0.4, d.hoof));
  };
  // ---- লেজ ----
  const tx = d.bx - d.bodyRx * 0.92, ty = d.bodyY - d.bodyRy * 0.3 + dy;
  const wag = sin(ph * (d.tail === "dog" ? 3 : 1.4)) * (moving || d.tail === "dog" ? 12 : 5);
  if (d.tail === "cow") S.push(PA(`M ${f(tx)} ${f(ty)} Q ${f(tx - 25)} ${f(ty + 30 + wag)} ${f(tx - 14)} ${f(ty + 70)}`, undefined, d.body, 6), E(tx - 14, ty + 76, 7, 13, DARK));
  else if (d.tail === "dog") S.push(PA(`M ${f(tx)} ${f(ty)} Q ${f(tx - 28)} ${f(ty - 14 + wag)} ${f(tx - 34 + wag)} ${f(ty - 42)}`, undefined, d.body, 9));
  else if (d.tail === "cat") S.push(PA(`M ${f(tx)} ${f(ty + 6)} Q ${f(tx - 50)} ${f(ty + 10)} ${f(tx - 40 + wag)} ${f(ty - 50)}`, undefined, d.body, 9));
  else if (d.tail === "horse") S.push(PA(`M ${f(tx)} ${f(ty)} Q ${f(tx - 40)} ${f(ty + 20 + wag)} ${f(tx - 30)} ${f(ty + 90)}`, undefined, d.mane ?? DARK, 14));
  else if (d.tail === "monkey") S.push(PA(`M ${f(tx)} ${f(ty)} Q ${f(tx - 60)} ${f(ty - 10)} ${f(tx - 55)} ${f(ty - 70)} Q ${f(tx - 50 + wag)} ${f(ty - 100)} ${f(tx - 30)} ${f(ty - 85)}`, undefined, d.body, 9));
  else if (d.tail === "goat") S.push(PO([tx, ty, tx - 18, ty - 18 + wag * 0.4, tx - 4, ty + 6], d.body));
  else S.push(L(tx, ty + 6, tx - 14, ty + 48, 7, shade(d.body)), E(tx - 14, ty + 52, 5, 7, shade(d.body)));
  legs.filter((l) => l.far).forEach(leg);
  // ---- শরীর ----
  S.push(E(d.bx, d.bodyY + dy, d.bodyRx, d.bodyRy, d.body));
  if (d.belly) S.push(E(d.bx + 6, d.bodyY + dy + d.bodyRy * 0.45, d.bodyRx * 0.75, d.bodyRy * 0.5, d.belly));
  if (d.spots) S.push(E(d.bx - 20, d.bodyY + dy - 12, 24, 18, d.spots), E(d.bx + 30, d.bodyY + dy + 8, 20, 15, d.spots), E(d.bx - 55, d.bodyY + dy + 14, 14, 11, d.spots));
  if (d.udder) S.push(E(d.bx - 8, hipY + dy + 8, 16, 11, "#f4a6b8"));
  legs.filter((l) => !l.far).forEach(leg);
  // ---- গলা ও মাথা ----
  const hx = d.hx, hy = d.hy + dy * 0.8, r = d.hr;
  if (d.neck) S.push(L(d.bx + d.bodyRx * 0.65, d.bodyY + dy - d.bodyRy * 0.3, hx - r * 0.2, hy + r * 0.2, d.neck, d.body));
  if (d.mane) S.push(PA(`M ${f(d.bx + d.bodyRx * 0.5)} ${f(d.bodyY + dy - d.bodyRy)} Q ${f(hx - r)} ${f(hy - r * 0.8)} ${f(hx - r * 0.1)} ${f(hy - r * 1.1)}`, undefined, d.mane, 14));
  // কান (পিছনের)
  if (d.ears === "elephant") S.push(C(hx - r * 0.3, hy + r * 0.25, r * 1.05, d.ear), C(hx - r * 0.3, hy + r * 0.25, r * 0.75, "#e8a6b0", 0.5));
  if (d.ears === "monkey") S.push(C(hx - r * 0.1, hy - r * 0.05, r * 0.38, d.head), C(hx - r * 0.1, hy - r * 0.05, r * 0.22, "#e8b89a"));
  if (d.horns === "cow") S.push(PA(`M ${f(hx - r * 0.2)} ${f(hy - r * 0.85)} Q ${f(hx - r * 0.5)} ${f(hy - r * 1.4)} ${f(hx - r * 0.1)} ${f(hy - r * 1.5)}`, undefined, "#f2ead3", 8));
  if (d.horns === "goat") S.push(PA(`M ${f(hx - r * 0.1)} ${f(hy - r * 0.85)} Q ${f(hx - r * 0.7)} ${f(hy - r * 1.5)} ${f(hx - r * 0.9)} ${f(hy - r * 1.1)}`, undefined, "#d8cfb0", 7));
  S.push(E(hx, hy, r * 1.05, r, d.head));
  if (d.snout > 0) S.push(E(hx + r * 0.65, hy + r * 0.3, d.snout, r * 0.62, d.muzzle ?? d.head));
  if (d.trunk) { S.push(PA(`M ${f(hx + r * 0.7)} ${f(hy + r * 0.1)} Q ${f(hx + r * 1.7)} ${f(hy + r * 0.5)} ${f(hx + r * 1.3)} ${f(hy + r * 1.7 + sin(ph * 1.5) * 6)}`, undefined, d.head, r * 0.55)); }
  if (d.tusks) S.push(PA(`M ${f(hx + r * 0.6)} ${f(hy + r * 0.55)} Q ${f(hx + r * 1.3)} ${f(hy + r * 0.9)} ${f(hx + r * 1.25)} ${f(hy + r * 0.45)}`, undefined, "#fffbe8", 7));
  // কান (সামনের)
  const ex = hx - r * 0.2;
  if (d.ears === "cow") S.push(E(ex - r * 0.45, hy - r * 0.55, r * 0.5, r * 0.2, d.head), E(ex - r * 0.45, hy - r * 0.55, r * 0.3, r * 0.1, "#f4a6b8"));
  if (d.ears === "dog") S.push(E(ex - r * 0.15, hy + r * 0.1, r * 0.3, r * 0.7, d.ear));
  if (d.ears === "cat") S.push(PO([ex - r * 0.7, hy - r * 0.6, ex - r * 0.55, hy - r * 1.5, ex + r * 0.1, hy - r * 0.9], d.head), PO([ex - r * 0.55, hy - r * 0.75, ex - r * 0.5, hy - r * 1.25, ex - r * 0.1, hy - r * 0.9], "#f4a6b8"), PO([ex + r * 0.4, hy - r * 0.8, ex + r * 0.75, hy - r * 1.5, ex + r * 0.95, hy - r * 0.5], d.head));
  if (d.ears === "goat") S.push(E(ex - r * 0.55, hy - r * 0.1, r * 0.55, r * 0.17, d.ear));
  if (d.ears === "horse") S.push(PO([ex - r * 0.5, hy - r * 0.8, ex - r * 0.35, hy - r * 1.6, ex + r * 0.05, hy - r * 0.85], d.head));
  // মুখের বিবরণ
  S.push(C(hx + r * 0.38, hy - r * 0.2, r * 0.13, DARK), C(hx + r * 0.42, hy - r * 0.25, r * 0.04, "#fff"));
  if (d.ears === "dog") S.push(C(hx + r * 0.65 + d.snout * 0.8, hy + r * 0.18, r * 0.14, DARK));
  else if (d.ears === "cat") S.push(C(hx + r * 0.78 + d.snout * 0.5, hy + r * 0.12, r * 0.09, "#e58b9a"));
  else if (!d.trunk) S.push(C(hx + r * 0.68 + d.snout * 0.7, hy + r * 0.2, r * 0.07, "#00000066"));
  if (d.whiskers) S.push(L(hx + r * 0.7, hy + r * 0.3, hx + r * 1.4, hy + r * 0.15, 2, "#555"), L(hx + r * 0.7, hy + r * 0.36, hx + r * 1.4, hy + r * 0.4, 2, "#555"));
  if (d.beard) S.push(PO([hx + r * 0.5, hy + r * 0.85, hx + r * 0.7, hy + r * 1.35, hx + r * 0.9, hy + r * 0.85], "#f2f2f2"));
  const m = p.talk > 0.12 ? E(hx + r * 0.75, hy + r * 0.55, r * 0.14, r * 0.1 + r * 0.14 * p.talk, "#7a1f2b") : PA(`M ${f(hx + r * 0.55)} ${f(hy + r * 0.5)} Q ${f(hx + r * 0.75)} ${f(hy + r * 0.62)} ${f(hx + r * 0.95)} ${f(hy + r * 0.48)}`, undefined, DARK, 2.5);
  S.push(m);
  return S;
}
const shade = (hex: string) => {
  const n = parseInt(hex.slice(1), 16), k = 0.8;
  const r = Math.round(((n >> 16) & 255) * k), g = Math.round(((n >> 8) & 255) * k), b = Math.round((n & 255) * k);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
};

export const ANIMALS: Record<string, QuadDef> = {
  cow: { body: "#f4f1ea", head: "#f4f1ea", ear: "#f4f1ea", legCol: "#f4f1ea", hoof: "#3b2f2f", belly: undefined, spots: "#3b3535", udder: true,
    bx: 0, bodyRx: 92, bodyRy: 48, bodyY: -100, hx: 112, hy: -128, hr: 36, neck: 40, ears: "cow", tail: "cow", muzzle: "#f4a6b8", snout: 28, horns: "cow", legW: 17 },
  goat: { body: "#f1ece0", head: "#f1ece0", ear: "#e3dccb", legCol: "#e8e2d2", hoof: "#4a3f33", bx: 0, bodyRx: 62, bodyRy: 32, bodyY: -80, hx: 76, hy: -112, hr: 26, neck: 24, ears: "goat", tail: "goat", snout: 18, horns: "goat", beard: true, legW: 11 },
  dog: { body: "#c68642", belly: "#e8c49a", head: "#c68642", ear: "#7a4a21", legCol: "#c68642", hoof: "#7a4a21", bx: 0, bodyRx: 58, bodyRy: 28, bodyY: -68, hx: 72, hy: -96, hr: 26, neck: 24, ears: "dog", tail: "dog", muzzle: "#e8c49a", snout: 20, legW: 11 },
  cat: { body: "#e8943a", belly: "#fbe3c2", head: "#e8943a", ear: "#e8943a", legCol: "#e8943a", hoof: "#fbe3c2", bx: 0, bodyRx: 46, bodyRy: 24, bodyY: -58, hx: 56, hy: -84, hr: 23, neck: 20, ears: "cat", tail: "cat", snout: 6, whiskers: true, legW: 9 },
  elephant: { body: "#9aa3b2", head: "#9aa3b2", ear: "#8a93a2", legCol: "#9aa3b2", hoof: "#6f7787", bx: 0, bodyRx: 120, bodyRy: 78, bodyY: -140, hx: 140, hy: -158, hr: 58, neck: 70, ears: "elephant", tail: "elephant", snout: 0, trunk: true, tusks: true, legW: 36 },
  horse: { body: "#8b5a2b", head: "#8b5a2b", ear: "#8b5a2b", legCol: "#8b5a2b", hoof: "#2b2b33", bx: 0, bodyRx: 88, bodyRy: 38, bodyY: -135, hx: 120, hy: -205, hr: 28, neck: 40, ears: "horse", tail: "horse", muzzle: "#a8743f", snout: 30, mane: "#2b2b33", legW: 12 },
  monkey: { body: "#8a5a35", belly: "#e8c49a", head: "#8a5a35", ear: "#8a5a35", legCol: "#8a5a35", hoof: "#6e4426", bx: 0, bodyRx: 44, bodyRy: 30, bodyY: -75, hx: 58, hy: -110, hr: 28, neck: 24, ears: "monkey", tail: "monkey", muzzle: "#e8c49a", snout: 16, legW: 12 },
};
