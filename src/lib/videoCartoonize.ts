// পুরো ভিডিও → ২ডি কার্টুন ভিডিও (প্রতিটি ফ্রেম): ফোনের ভেতরে, ক্লাসিক ইমেজ প্রসেসিং; মূল অডিও বজায়; MP4।
import * as FileSystem from "expo-file-system";
import StudioExport from "../../modules/studio-export";
import { Cancelled, Control, Progress } from "./videoCartoon";

const strip = (u: string) => u.replace("file://", "");
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
export const MAX_CARTOON_SECONDS = 60;

export async function cartoonizeVideo(videoUri: string, opts: { fps: 15 | 24 | 30; levels: number }, onProgress: Progress, ctl?: Partial<Control>): Promise<{ path: string; w: number; h: number; frames: number; secs: number; warnings: string[] }> {
  if (!StudioExport) throw new Error("এই সুবিধা শুধু ইনস্টল করা অ্যাপে (APK) চলে");
  const X = StudioExport; const log = ctl?.log ?? (() => {}); const stop = () => { if (ctl?.cancelled?.()) throw new Cancelled(); };
  const src = strip(videoUri), t00 = Date.now();
  onProgress(0.01, "ভিডিও পরীক্ষা হচ্ছে…");
  let info: { w: number; h: number; srcFps: number; durMs: number };
  try { info = JSON.parse(await X.cartoonProbe(src)); } catch (e: any) { log(`✘ ভিডিও খোলা: ${e?.message ?? e}`); throw new Error(`ভিডিও লোড ব্যর্থ: ${e?.message ?? e}`); }
  const fps = Math.min(opts.fps, Math.round(info.srcFps)) as number;
  const secs = Math.min(MAX_CARTOON_SECONDS, info.durMs / 1000), frames = Math.max(1, Math.floor(secs * fps));
  log(`ভিডিও ${info.w}×${info.h}, মূল ~${info.srcFps}fps, ${(info.durMs / 1000).toFixed(1)}s → আউটপুট ${fps}fps, ${frames} ফ্রেম`);
  const out = ((FileSystem.cacheDirectory ?? "") + `cartoon_${Date.now()}.mp4`).replace("file://", "");
  onProgress(0.03, "এনকোডার ও অডিও প্রস্তুত…");
  let warn = "";
  try {
    warn = await X.begin(JSON.stringify({ out, w: info.w, h: info.h, fps, totalMs: Math.round(secs * 1000), bitrate: info.h >= 1000 || info.w >= 1000 ? 6_000_000 : 3_500_000, music: "", musicVol: 0, voices: [], clips: [{ path: src, startMs: 0, vol: 1, durMs: Math.round(secs * 1000) }] }));
  } catch (e: any) { log(`✘ এনকোডার: ${e?.message ?? e}`); throw new Error(`MP4 এনকোডার চালু হয়নি: ${e?.message ?? e}`); }
  const warnings = warn.split(",").filter(Boolean);
  if (warnings.includes("no_audio")) log("⚠ ভিডিওতে অডিও পাওয়া যায়নি — নিঃশব্দ MP4");
  try {
    await X.cartoonReset();
    const CH = 6, t0 = Date.now();
    for (let i = 0; i < frames; i += CH) {
      stop();
      await X.cartoonFrames(src, i, Math.min(CH, frames - i), fps, opts.levels);
      const done = Math.min(frames, i + CH), el = (Date.now() - t0) / 1000, eta = (el / done) * (frames - done);
      onProgress(0.05 + 0.9 * (done / frames), `কার্টুন ফ্রেম ${done}/${frames} (বাকি প্রায় ${Math.ceil(eta)} সেকেন্ড)`);
      await tick();
    }
    onProgress(0.97, "MP4 চূড়ান্ত হচ্ছে (অডিও যুক্ত)…");
    const path = await X.finish();
    log(`✔ MP4 তৈরি, মোট ${((Date.now() - t00) / 1000).toFixed(1)}s`);
    onProgress(1, "সম্পন্ন");
    return { path, w: info.w, h: info.h, frames, secs, warnings };
  } catch (e: any) {
    try { await X.cancel(); } catch { /* */ }
    if (e instanceof Cancelled) throw e;
    log(`✘ ফ্রেম প্রসেসিং: ${e?.message ?? e}`); throw new Error(`কার্টুন ফ্রেম/এক্সপোর্ট ব্যর্থ: ${e?.message ?? e}`);
  } finally { try { await X.cartoonReset(); } catch { /* */ } }
}
