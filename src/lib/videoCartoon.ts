// ভিডিও → কার্টুন: ফোনের ভেতরে ভিডিও বিশ্লেষণ করে অ্যাপের নিজের চরিত্র দিয়ে একটি সাধারণ প্রজেক্ট বানায়।
// কোনো সার্ভার/ক্লাউড/জেনারেটিভ AI নেই। ভঙ্গি-শনাক্তকরণ = অফলাইন MediaPipe (নেটিভ মডিউলে)।
import * as FileSystem from "expo-file-system";
import StudioExport from "../../modules/studio-export";
import { onNativeProgress } from "./cartoonize";
import { CropResult, Pose33, Track, buildMocap, cropRequests, mergeCrops, trackIdentities } from "./mocap";
import { Movie, addClip, addObject, newMovie, renameCast, updateObj, updateScene, uid } from "./scene";
import { setVideoBgDir, videoBgId, videoBgPath } from "../art/videoBg";

export const FPS = 30;
export type Progress = (p: number, msg: string) => void;
const strip = (u: string) => u.replace("file://", "");

// নেটিভ ধাপের অগ্রগতি [from,to] পরিসরে মিলিয়ে দেখায় — তাই বার আর 2%-এ আটকে থাকে না
async function stage<T>(task: string, from: number, to: number, onProgress: Progress, label: string, fn: () => Promise<T>): Promise<T> {
  const sub = onNativeProgress((e) => { if (e.task === task) onProgress(from + (to - from) * Math.max(0, Math.min(1, e.p)), e.msg || label); });
  try { return await fn(); } finally { sub.remove(); }
}

export async function buildVideoCartoon(videoUri: string, assetIds: [string, string], onProgress: Progress): Promise<{ movie: Movie; people: number; notes: string[] }> {
  if (!StudioExport) throw new Error("এই সুবিধা শুধু ইনস্টল করা অ্যাপে (APK) চলে");
  const notes: string[] = [];
  onProgress(0.01, "ভিডিও খোলা ও মডেল লোড হচ্ছে…");
  const det = JSON.parse(await stage("pose", 0.01, 0.4, onProgress, "ভঙ্গি খোঁজা হচ্ছে…", () => StudioExport!.detectPoses(strip(videoUri), FPS, 900))) as { w: number; h: number; n: number; frames: Pose33[][] };
  onProgress(0.4, "দুজনকে আলাদা করা হচ্ছে…");
  let tracks: Track[] = trackIdentities(det.frames);
  const found = tracks.map((t) => t.filter(Boolean).length);
  if (found[0] < 10 && found[1] < 10) throw new Error("ভিডিওতে মানুষ পাওয়া যায়নি। পুরো শরীর দেখা যায় এমন ভিডিও দিন।");
  const people = found[1] >= 10 && found[0] >= 10 ? 2 : 1;
  if (people === 1) { const k = found[0] >= found[1] ? 0 : 1; tracks = [tracks[k], tracks[k]]; notes.push("একজন মানুষ পাওয়া গেছে"); }
  // ধরা না-পড়া ফ্রেম: ওই ব্যক্তির এলাকা কেটে আবার খোঁজা
  const req = cropRequests(people === 2 ? tracks : [tracks[0]]);
  if (req.length) {
    onProgress(0.5, `ফাঁক ভরা হচ্ছে (${req.length}টি ফ্রেম)…`);
    const res = JSON.parse(await stage("crop", 0.5, 0.58, onProgress, "ফাঁক ভরা হচ্ছে…", () => StudioExport!.detectCrops(strip(videoUri), FPS, JSON.stringify(req)))) as CropResult[];
    tracks = mergeCrops(people === 2 ? tracks : [tracks[0]], res); if (people === 1) tracks = [tracks[0], tracks[0]];
  }
  // আওয়াজের ওঠানামা (ঠোঁট নড়ানোর জন্য) — ভিডিওর অডিও থেকে
  let env: number[] = [];
  try {
    const a = await StudioExport.analyzeAudio(strip(videoUri), FPS);
    const mx = Math.max(0.0001, ...a.envelope); env = a.envelope.map((v) => Math.min(1, v / mx));
  } catch { notes.push("ভিডিওতে অডিও পাওয়া যায়নি; ঠোঁট নড়বে না"); }
  // খালি পটভূমি
  const code = uid().slice(0, 5), id = videoBgId(code, det.w, det.h);
  const dir = (FileSystem.documentDirectory ?? "") + "videobg/";
  const info = await FileSystem.getInfoAsync(dir); if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  setVideoBgDir(dir);
  onProgress(0.6, "ভিডিও থেকে মানুষ সরিয়ে পটভূমি বানানো হচ্ছে…");
  try { await stage("plate", 0.6, 0.85, onProgress, "পটভূমি বানানো হচ্ছে…", () => StudioExport!.buildPlate(strip(videoUri), FPS, JSON.stringify({ persons: people === 2 ? tracks : [tracks[0]] }), strip(videoBgPath(id)))); }
  catch (e: any) { notes.push("পটভূমি বানানো যায়নি: " + String(e?.message ?? e)); }
  onProgress(0.85, "অ্যাপের চরিত্রে নড়াচড়া বসানো হচ্ছে…");
  const n = det.n, dur = n / FPS;
  let m = newMovie("ভিডিও থেকে কার্টুন"); const sid = m.scenes[0].id;
  m = updateScene(m, sid, (s) => ({ ...s, bg: id, duration: Math.min(60, Math.ceil(dur)) }));
  const faces: (1 | -1)[] = [1, -1];
  for (let k = 0; k < people; k++) {
    const r = addObject(m, sid, assetIds[k]); m = r.movie;
    const cid = m.cast[m.cast.length - 1].id; m = renameCast(m, cid, k === 0 ? "বাঁ জন" : "ডান জন");
    const mc = buildMocap(tracks[k].map((p) => p ?? null), det.w, det.h, { fps: FPS, face: people === 1 ? 1 : faces[k], env });
    m = updateScene(m, sid, (s) => updateObj(s, r.objId, (o) => ({ ...o, mocap: mc })));
  }
  m = updateScene(m, sid, (s) => addClip(s, { kind: "voice", name: "ভিডিওর অডিও", uri: videoUri, t: 0, dur: Math.min(dur, 60), vol: 1 }));
  onProgress(1, "প্রস্তুত");
  return { movie: m, people, notes };
}
