// MP4 এক্সপোর্ট: ফ্রেমগুলো JS-এ হিসাব হয়, আঁকা + এনকোড (H.264/AAC) হয় নেটিভ Kotlin মডিউলে।
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import StudioExport from "../../modules/studio-export";
import { sceneItems } from "./render";
import { Movie, activeScenes, dialogueAt, fadeAlpha, sceneStarts } from "./scene";
import { R } from "../art/shapes";
import { BACKGROUNDS } from "../art/backgrounds";
import { TRACKS } from "./audio";
import { ATLAS } from "../art/sprites/images";
import { atlasKeysOf, spriteDef } from "../art/sprite";
import { getAsset } from "../art/registry";

export type Quality = 720 | 1080;
export const exportAvailable = () => StudioExport != null;
const FPS = 24;
const round = (_k: string, v: unknown) => (typeof v === "number" ? Math.round(v * 10) / 10 : v);

export async function exportMovie(movie: Movie, q: Quality, onProgress: (p: number, msg: string) => void, isCancelled: () => boolean): Promise<{ path: string; warnings: string[] }> {
  if (!StudioExport) throw new Error("এক্সপোর্ট শুধু ইনস্টল করা APK-তে কাজ করে (Expo Go-তে নয়)");
  const w = q === 1080 ? 1920 : 1280, h = q === 1080 ? 1080 : 720;
  // শুধু বাছা দৃশ্য, ক্রম অনুযায়ী (Scene Merge)
  const scenes = activeScenes(movie), plan = sceneStarts(movie);
  const total = scenes.reduce((a, sc) => a + sc.duration, 0);
  const frames = Math.max(1, Math.round(total * FPS));
  const strip = (u: string) => u.replace("file://", "");

  // সংলাপের পরম সময়
  // সংলাপ (তৈরি ভয়েস ফাইল থাকলে সেটা) ও সাউন্ড ইফেক্ট/ভয়েসওভার ক্লিপ — সবই ভিডিওর পরম সময়ে
  const voices: { text: string; startMs: number; file: string }[] = [];
  const clips: { path: string; startMs: number; vol: number; durMs: number }[] = [];
  for (const { scene: sc, start } of plan) {
    for (const d of sc.dialogues) voices.push({ text: d.text, startMs: Math.round((start + d.t) * 1000), file: d.voiceUri ? strip(d.voiceUri) : "" });
    for (const c of sc.clips ?? []) clips.push({ path: strip(c.uri), startMs: Math.round((start + c.t) * 1000), vol: c.vol, durMs: Math.round(Math.min(c.dur, sc.duration - c.t) * 1000) });
  }

  let music = "", musicVol = 0.3;
  if (movie.musicClip) { music = strip(movie.musicClip.uri); musicVol = movie.musicVol ?? 0.5; }
  else if (movie.music) {
    const tr = TRACKS.find((t) => t.id === movie.music);
    if (tr) { const a = Asset.fromModule(tr.src); await a.downloadAsync(); music = (a.localUri ?? a.uri).replace("file://", ""); }
  }
  const out = ((FileSystem.cacheDirectory ?? "") + `studio_${Date.now()}.mp4`).replace("file://", "");

  onProgress(0.02, "অডিও তৈরি হচ্ছে (বাংলা ভয়েস ও মিউজিক)…");
  const warn = await StudioExport.begin(JSON.stringify({ out, w, h, fps: FPS, totalMs: Math.round(total * 1000), bitrate: q === 1080 ? 8_000_000 : 4_000_000, music, musicVol, voices, clips }));
  const warnings = warn.split(",").filter(Boolean);

  try {
    // ছবি-অংশের চরিত্র: ব্যবহৃত অ্যাটলাসের ফাইল-পথ নেটিভে পাঠানো
    const used = new Set<string>();
    for (const sc of scenes) for (const o of sc.objects) { const a = getAsset(o.assetId); if (a?.rig === "sprite") atlasKeysOf(a.id.replace(/^n_/, "")).forEach((k) => used.add(k)); }
    const paths: Record<string, string> = {};
    for (const k of used) { const a = Asset.fromModule(ATLAS[k]); await a.downloadAsync(); paths[k] = (a.localUri ?? a.uri).replace("file://", ""); }
    if (used.size) await StudioExport.setAtlases(JSON.stringify(paths));
    for (const id of new Set(scenes.map((s) => s.bg))) {
      const bg = BACKGROUNDS.find((b) => b.id === id)!;
      await StudioExport.setBackground(id, JSON.stringify(bg.shapes));
    }
    const starts = plan.map((p) => p.start);

    const BATCH = 6;
    for (let i = 0; i < frames; i += BATCH) {
      if (isCancelled()) { await StudioExport.cancel(); throw new Error("বাতিল করা হয়েছে"); }
      const batch: unknown[] = [];
      for (let k = i; k < Math.min(frames, i + BATCH); k++) {
        const time = k / FPS;
        let si = scenes.length - 1;
        for (let j = 0; j < starts.length; j++) if (time >= starts[j] && (j === starts.length - 1 || time < starts[j + 1])) { si = j; break; }
        const sc = scenes[si], lt = Math.min(time - starts[si], sc.duration);
        const d = dialogueAt(sc, lt);
        const items = sceneItems(movie, sc, lt).map((it) => ({ x: it.x, y: it.y, sx: it.sx, sy: it.sy, rot: it.rot, shadow: it.shadow, shapes: it.shapes }));
        const fa = fadeAlpha(movie, si, lt); // দৃশ্য-জোড়ায় ফেড: কালো পর্দা
        if (fa > 0.01) items.push({ x: 0, y: 0, sx: 1, sy: 1, rot: 0, shadow: false, shapes: [R(0, 0, 1280, 720, "#000000", 0, fa)] });
        batch.push({ bg: sc.bg, caption: d ? d.text : "", items });
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
