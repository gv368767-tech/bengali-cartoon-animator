// ছবি-চরিত্র: একটি স্বচ্ছ-ব্যাকগ্রাউন্ড PNG-কে "কাটআউট পুতুল" হিসেবে নড়ানো (দোলা, লাফ, হাঁটার ওঠানামা, কথার ঝাঁকুনি)।
import type { Pose, Shape, Action } from "./shapes";

export type PhotoDef = { id: string; name: string; key: string; w: number; h: number; hgt?: number };
const sin = Math.sin, abs = Math.abs;
export const PHOTO_ACTIONS: Exclude<Action, "auto">[] = ["stand", "talk", "walk", "run", "jump", "sit", "dance", "wave", "laugh", "cry", "angry", "clap", "point", "namaste", "thumbsup", "think", "bow", "cheer", "shrug"];

export function photoMotion(p: Pose): { x: number; y: number; r: number } {
  const t = p.phase, s = sin(t), a = abs(s), talking = p.talk > 0.12 || p.action === "talk";
  switch (p.action) {
    case "walk": return { x: 0, y: -6 * a, r: 2 * s };
    case "run": return { x: 0, y: -12 * a, r: 4 * s };
    case "jump": return { x: 0, y: -70 * abs(sin(t * 0.8)), r: 0 };
    case "dance": return { x: 10 * s, y: -8 * a, r: 5 * s };
    case "laugh": return { x: 0, y: s > 0 ? -8 : 0, r: 3 * s };
    case "cry": return { x: 0, y: 2 * (s > 0 ? 1 : -1), r: 0 };
    case "angry": return { x: 3 * (s > 0 ? 1 : -1), y: 0, r: 0 };
    case "clap": case "cheer": return { x: 0, y: -4 * abs(sin(t * 2)), r: 1.5 * s };
    default: return talking ? { x: 0, y: -2.5 * abs(sin(t * 3)), r: 1.2 * sin(t * 1.5) } : { x: 0, y: -1.5 * sin(t * 0.8), r: 0.4 * sin(t * 0.5) };
  }
}
export function photoShapes(d: PhotoDef, p: Pose): Shape[] {
  const H = d.hgt ?? 330, W = (d.w / d.h) * H, m = photoMotion(p);
  return [{ t: "img", k: d.key, u: 0, v: 0, pw: d.w, ph: d.h, x: -W / 2, y: -H, w: W, h: H, e: m.x, f: m.y, r: m.r, s: 1 }];
}
export const photoBounds = (d: PhotoDef): [number, number, number, number] => { const H = d.hgt ?? 330, W = (d.w / d.h) * H; return [-W / 2, -H, W / 2, 8]; };
