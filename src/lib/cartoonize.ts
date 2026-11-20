// পুরো ভিডিও → কার্টুন ভিডিও (JS দিক)। কাজ নেটিভে (ডিকোড → ফিল্টার → এনকোড, মূল অডিও কপি); এখানে শুধু চালানো, অগ্রগতি, বাতিল, সেভ।
import * as FileSystem from "expo-file-system";
import StudioExport, { NativeProgress } from "../../modules/studio-export";

export type BgMode = 0 | 1 | 2 | 3;
export const BG_MODES: { id: BgMode; name: string; hint: string }[] = [
  { id: 0, name: "সব কার্টুন", hint: "মানুষ ও পটভূমি দুটোই কার্টুন (সবচেয়ে নির্ভরযোগ্য)" },
  { id: 1, name: "ঝাপসা পটভূমি", hint: "মানুষ আলাদা করে পেছন সরল-ঝাপসা (পরীক্ষামূলক)" },
  { id: 2, name: "কার্টুন আকাশ-মাঠ", hint: "মানুষ আলাদা করে নতুন কার্টুন পটভূমি (পরীক্ষামূলক)" },
  { id: 3, name: "সাদা পটভূমি", hint: "পটভূমি সরিয়ে সাদা (পরীক্ষামূলক)" },
];
export type CartoonResult = { path: string; w: number; h: number; fps: number; frames: number; skipped: number; audio: boolean; bgApplied: boolean; warnings: string[]; ms: number; bytes: number };

export function onNativeProgress(cb: (e: NativeProgress) => void): { remove(): void } {
  try { const s = StudioExport?.addListener?.("onNativeProgress", cb); if (s) return s; } catch { /* নিচে */ }
  return { remove() {} };
}

export const strip = (u: string) => u.replace("file://", "");

/** opts: bg, work (ফিল্টারের দীর্ঘ-দিক px), maxOut (আউটপুটের দীর্ঘ-দিক px), maxFrames (0 = সব) */
export async function cartoonizeVideo(videoUri: string, opts: { bg: BgMode; work?: number; maxOut?: number; maxFrames?: number }, onProgress: (p: number, msg: string) => void): Promise<CartoonResult> {
  if (!StudioExport) throw new Error("এই সুবিধা শুধু ইনস্টল করা অ্যাপে (APK) চলে");
  const dir = (FileSystem.cacheDirectory ?? "") + "cartoon/";
  const info = await FileSystem.getInfoAsync(dir); if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const out = dir + `cartoon_${Date.now()}.mp4`;
  onProgress(0, "শুরু হচ্ছে…");
  const sub = onNativeProgress((e) => { if (e.task === "cartoon") onProgress(e.p, e.msg); });
  try {
    const r = await StudioExport.cartoonizeVideo(strip(videoUri), strip(out), JSON.stringify(opts));
    return JSON.parse(r) as CartoonResult;
  } finally { sub.remove(); }
}
export async function cancelCartoon() { try { await StudioExport?.cancelNative(); } catch { /* ignore */ } }
