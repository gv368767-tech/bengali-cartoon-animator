// ভিডিও থেকে নেওয়া রঙ → কার্টুন-উপযোগী রঙ (ছায়ায় গাঢ় আসা রঙ উজ্জ্বল ও সতেজ করা) → চরিত্রের Look।
import type { Look } from "./scene";

export type RawProfile = { skin: number[]; hair: number[]; top: number[]; top2: number[]; bottom: number[]; longHair: boolean; samples: number };
const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
function rgb2hsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d > 0) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, mx === 0 ? 0 : d / mx, mx];
}
function hsv2rgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  const m = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6]; return [m[0] * 255, m[1] * 255, m[2] * 255];
}
/** উজ্জ্বলতা ×gain (কমপক্ষে vmin), সাদাটে না হওয়ার জন্য vmax, রঙের গাঢ়তা কমপক্ষে smin */
export function lift(c: number[], vmin: number, smin = 0, gain = 1.6, vmax = 1): string {
  const [h, s, v] = rgb2hsv(c[0], c[1], c[2]); const [r, g, b] = hsv2rgb(h, Math.max(s, smin), Math.min(vmax, Math.max(v * gain, vmin))); return hex(r, g, b);
}
export function profileToLook(p: RawProfile, baseHairStyle?: string): Look {
  const hair = p.hair.every((v) => v > 170) ? "#1b1b1b" : hex(...(p.hair.map((v) => Math.min(v, 90)) as [number, number, number]));
  const look: Look = { skin: lift(p.skin, 0.55, 0.25), hair, top: lift(p.top, 0.5, 0.55), top2: lift(p.top2, 0.55, 0.4), bottom: lift(p.bottom, 0.5, 0.55) };
  if (p.longHair && (baseHairStyle === "bun" || baseHairStyle === "pigtails" || baseHairStyle === "long")) look.hairStyle = "long";
  return look;
}
