// ভিডিও থেকে বানানো "খালি পটভূমি" (মানুষ সরানো ছবি) — দৃশ্যের ব্যাকগ্রাউন্ড হিসেবে। ছবি ফোনের ভেতরের ফাইলে থাকে, কোথাও যায় না।
// id = "vid_<কোড>_<প্রস্থ>x<উচ্চতা>" (অনুপাত থেকে মঞ্চে ঠিক আকারে বসে); ফাইল = <ফোল্ডার>/<id>.jpg
import { G, R, Shape } from "./shapes";
import type { BgDef } from "./backgrounds";

export const VID_PREFIX = "vid_";
let dir = ""; export const setVideoBgDir = (d: string) => { dir = d.endsWith("/") ? d : d + "/"; };
export const isVideoBg = (id: string) => id.startsWith(VID_PREFIX);
export const videoBgKey = (id: string) => "vid:" + id;
export const videoBgPath = (id: string) => dir + id + ".jpg";
export const videoBgId = (code: string, w: number, h: number) => `${VID_PREFIX}${code}_${w}x${h}`;

export function videoBgDef(id: string): BgDef | null {
  const m = /^vid_[^_]+_(\d+)x(\d+)$/.exec(id); if (!m) return null;
  const aw = +m[1], ah = +m[2], H = 720, W = Math.round((H * aw) / ah), x = Math.round((1280 - W) / 2);
  const shapes: Shape[] = [
    G(0, 0, 1280, 720, "#1d1d27", "#0f0f15"),
    { t: "img", k: videoBgKey(id), u: 0, v: 0, pw: aw, ph: ah, x, y: 0, w: W, h: H, e: 0, f: 0, r: 0, s: 1 },
  ];
  return { id, name: "ভিডিওর পটভূমি", horizon: 430, sky: ["#1d1d27", "#0f0f15"], shapes };
}
