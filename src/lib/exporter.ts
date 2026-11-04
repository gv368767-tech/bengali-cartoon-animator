// MP4 এক্সপোর্ট: ফ্রেমগুলো JS-এ হিসাব হয়, আঁকা + এনকোড (H.264/AAC) হয় নেটিভ Kotlin মডিউলে।
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import StudioExport from "../../modules/studio-export";
import { sceneItems } from "./render";
import { Movie, dialogueAt, movieDuration } from "./scene";
import { BACKGROUNDS } from "../art/backgrounds";
import { TRACKS } from "./audio";

export type Quality = 720 | 1080;
export const exportAvailable = () => StudioExport != null;
const FPS = 24;
const round = (_k: string, v: unknown) => (typeof v === "number" ? Math.round(v * 10) / 10 : v);

export async function exportMovie(movie: Movie, q: Quality, onProgress: (p: number, msg: string) => void, isCancelled: () => boolean): Promise<{ path: string; warnings: string[] }> {
  if (!StudioExport) throw new Error("এক্সপোর্ট শুধু ইনস্টল করা APK-তে কাজ করে (Expo Go-তে নয়)");
  const w = q === 1080 ? 1920 : 1280, h = q === 1080 ? 1080 : 720;
  const total = movieDuration(movie);
  const frames = Math.max(1, Math.round(total * FPS));

  // সংলাপের পরম সময়
  const voices: { text: string; startMs: number }[] = [];
  let off = 0;
  for (const s of movie.scenes) { for (const d of s.dialogues) voices.push({ text: d.text, startMs: Math.round((off + d.t) * 1000) }); off += s.duration; }

  let music = "";
  if (movie.music) {
    const tr = TRACKS.find((t) => t.id === movie.music);
    if (tr) { const a = Asset.fromModule(tr.src); await a.downloadAsync(); music = (a.localUri ?? a.uri).replace("file://", ""); }
  }
  const out = ((FileSystem.cacheDirectory ?? "") + `studio_${Date.now()}.mp4`).replace("file://", "");

  onProgress(0.02, "অডিও তৈরি হচ্ছে (বাংলা ভয়েস ও মিউজিক)…");
  const warn = await StudioExport.begin(JSON.stringify({ out, w, h, fps: FPS, totalMs: Math.round(total * 1000), bitrate: q === 1080 ? 8_000_000 : 4_000_000, music, musicVol: 0.3, voices }));
  const warnings = warn.split(",").filter(Boolean);

  try {
    for (const id of new Set(movie.scenes.map((s) => s.bg))) {
      const bg = BACKGROUNDS.find((b) => b.id === id)!;
      await StudioExport.setBackground(id, JSON.stringify(bg.shapes));
    }
    const starts: number[] = []; let acc = 0;
    for (const s of movie.scenes) { starts.push(acc); acc += s.duration; }

    const BATCH = 6;
    for (let i = 0; i < frames; i += BATCH) {
      if (isCancelled()) { await StudioExport.cancel(); throw new Error("বাতিল করা হয়েছে"); }
      const batch: unknown[] = [];
      for (let k = i; k < Math.min(frames, i + BATCH); k++) {
        const time = k / FPS;
        let si = movie.scenes.length - 1;
        for (let j = 0; j < starts.length; j++) if (time >= starts[j] && (j === starts.length - 1 || time < starts[j + 1])) { si = j; break; }
        const sc = movie.scenes[si], lt = Math.min(time - starts[si], sc.duration);
        const d = dialogueAt(sc, lt);
        batch.push({ bg: sc.bg, caption: d ? d.text : "", items: sceneItems(movie, sc, lt).map((it) => ({ x: it.x, y: it.y, sx: it.sx, sy: it.sy, rot: it.rot, shadow: it.shadow, shapes: it.shapes })) });
      }
      await StudioExport.drawFrames(JSON.stringify(batch, round));
      onProgress(0.05 + 0.9 * Math.min(1, (i + BATCH) / frames), `ফ্রেম ${Math.min(frames, i + BATCH)}/${frames}`);
    }
    onProgress(0.97, "MP4 ফাইল চূড়ান্ত হচ্ছে…");
    const path = await StudioExport.finish();
    onProgress(1, "সম্পন্ন");
    return { path, warnings };
  } catch (e) {
    try { await StudioExport.cancel(); } catch { /* ignore */ }
    throw e;
  }
}

export async function saveToGallery(path: string): Promise<string> {
  if (!StudioExport) throw new Error("এক্সপোর্ট মডিউল নেই");
  return StudioExport.saveToGallery(path, `BengaliCartoon_${Date.now()}.mp4`);
}
