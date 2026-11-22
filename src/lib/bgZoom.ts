// পটভূমির জুম ও সরানো — আকার (vector) বদলে আঁকা হয়, তাই জুমেও ফাটে না। প্রান্তে ফাঁকা দেখা যায় না (সরানো সীমিত)।
import { xf } from "../art/vehicles";
import type { Shape } from "../art/shapes";

export type BgView = { z: number; x: number; y: number };
export const BG_W = 1280, BG_H = 720, BG_MAXZ = 3;
export const DEFAULT_VIEW: BgView = { z: 1, x: 0, y: 0 };
const r1 = (n: number) => Math.round(n * 100) / 100;
export function clampView(v: BgView): BgView {
  const z = Math.max(1, Math.min(BG_MAXZ, v.z)), mx = ((z - 1) * BG_W) / 2, my = ((z - 1) * BG_H) / 2;
  return { z: r1(z), x: r1(Math.max(-mx, Math.min(mx, v.x))), y: r1(Math.max(-my, Math.min(my, v.y))) };
}
export const isDefaultView = (v?: BgView | null) => !v || (v.z === 1 && v.x === 0 && v.y === 0);
export const viewKey = (bgId: string, v?: BgView | null) => (isDefaultView(v) ? bgId : `${bgId}@z${v!.z},${v!.x},${v!.y}`);
/** মঞ্চের কেন্দ্র ধরে z গুণ বড় করে (x,y) সরানো */
export function zoomShapes(shapes: Shape[], v: BgView): Shape[] {
  const c = clampView(v); return xf(shapes, c.z, BG_W / 2 * (1 - c.z) + c.x, BG_H / 2 * (1 - c.z) + c.y);
}
export const zoomStep = (v: BgView, dz: number): BgView => { const z = Math.max(1, Math.min(BG_MAXZ, v.z + dz)); return clampView({ ...v, z }); };
export const panStep = (v: BgView, dx: number, dy: number): BgView => clampView({ ...v, x: v.x + dx, y: v.y + dy });
