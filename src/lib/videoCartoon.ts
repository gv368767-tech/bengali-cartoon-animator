// ভিডিও → কার্টুন: ফোনের ভেতরে ভিডিও বিশ্লেষণ করে অ্যাপের নিজের চরিত্র দিয়ে একটি সাধারণ প্রজেক্ট বানায়।
// কোনো সার্ভার/ক্লাউড/জেনারেটিভ AI নেই। ভঙ্গি-শনাক্তকরণ = অফলাইন MediaPipe (নেটিভ মডিউলে)।
import * as FileSystem from "expo-file-system";
import StudioExport from "../../modules/studio-export";
import { CropResult, Pose33, Track, buildMocap, cropRequests, mergeCrops, trackIdentities } from "./mocap";
import { Movie, addClip, addObject, newMovie, renameCast, updateObj, updateScene, uid } from "./scene";
import { setVideoBgDir, videoBgId, videoBgPath } from "../art/videoBg";

export const FPS = 15;                       // ফোনে দ্রুত ও নিরাপদ; নড়াচড়া মসৃণ করা হয় (mocap সময়-ইন্টারপোলেশন করে)
export const MAX_SECONDS = 40;
export type Progress = (p: number, msg: string) => void;
export type Control = { cancelled: () => boolean; log: (line: string) => void };
const strip = (u: string) => u.replace("file://", "");
export class Cancelled extends Error { constructor() { super("বাতিল করা হয়েছে"); } }
const tick = () => new Promise<void>((r) => setTimeout(r, 0));   // UI-কে শ্বাস নিতে দেওয়া

export async function buildVideoCartoon(videoUri: string, assetIds: [string, string], onProgress: Progress, ctl?: Partial<Control>): Promise<{ movie: Movie; people: number; notes: string[] }> {
  if (!StudioExport) throw new Error("এই সুবিধা শুধু ইনস্টল করা অ্যাপে (APK) চলে");
  const X = StudioExport;
  const log = ctl?.log ?? (() => {}); const stop = () => { if (ctl?.cancelled?.()) throw new Cancelled(); };
  const notes: string[] = [];
  const stage = async <T,>(name: string, f: () => Promise<T>): Promise<T> => {
    const t0 = Date.now(); log(`▶ ${name}`);
    try { const r = await f(); log(`✔ ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`); return r; }
    catch (e: any) { if (e instanceof Cancelled) throw e; log(`✘ ${name}: ${String(e?.message ?? e)}`); throw new Error(`ধাপ "${name}" ব্যর্থ: ${String(e?.message ?? e)}`); }
  };
  // ১) ভিডিও খোলা + মডেল লোড (এখানেই ভিডিও/ডিকোডার/মডেলের সমস্যা ধরা পড়ে)
  onProgress(0.01, "ভিডিও খোলা ও মডেল লোড হচ্ছে…");
  const info = await stage("ভিডিও ও মডেল চালু", async () => JSON.parse(await X.detectOpen(strip(videoUri), FPS, MAX_SECONDS * FPS)) as { w: number; h: number; n: number; durMs: number; frameMs: number; modelMs: number; openMs: number });
  log(`ভিডিও ${info.w}×${info.h}, ${(info.durMs / 1000).toFixed(1)}s, ফ্রেম-ডিকোড ${info.frameMs}ms, মডেল-লোড ${info.modelMs}ms`);
  if (info.durMs / 1000 > MAX_SECONDS) notes.push(`ভিডিও ${MAX_SECONDS} সেকেন্ডের বেশি; প্রথম ${MAX_SECONDS} সেকেন্ড নেওয়া হয়েছে`);
  // ২) ফ্রেম-ধরে শনাক্তকরণ — খণ্ডে খণ্ডে, প্রতি খণ্ডের পর আসল অগ্রগতি
  const frames: Pose33[][] = [];
  try {
    const CH = 12, t0 = Date.now();
    for (let i = 0; i < info.n; i += CH) {
      stop();
      const r = JSON.parse(await X.detectNext(i, CH)) as { frames: Pose33[][]; ms: number };
      for (const f of r.frames) frames.push(f);
      const done = frames.length, el = (Date.now() - t0) / 1000, eta = done > 0 ? (el / done) * (info.n - done) : 0;
      onProgress(0.03 + 0.42 * (done / info.n), `মানুষ খোঁজা: ${done}/${info.n} ফ্রেম (বাকি প্রায় ${Math.ceil(eta)} সেকেন্ড)`);
      await tick();
    }
    log(`✔ শনাক্তকরণ ${frames.length} ফ্রেম, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  } catch (e: any) {
    if (e instanceof Cancelled) throw e;
    log(`✘ শনাক্তকরণ: ${String(e?.message ?? e)}`); throw new Error(`ফ্রেম প্রসেসিং ব্যর্থ (${frames.length}/${info.n} ফ্রেমের পর): ${String(e?.message ?? e)}`);
  } finally { try { await X.detectClose(); } catch { /* বন্ধ করতে না পারলেও এগোই */ } }
  const det = { w: info.w, h: info.h, n: frames.length, frames };
  onProgress(0.47, "দুজনকে আলাদা করা হচ্ছে…"); await tick();
  let tracks: Track[] = trackIdentities(det.frames);
  const found = tracks.map((t) => t.filter(Boolean).length);
  log(`ট্র্যাক: বাঁ ${found[0]}, ডান ${found[1]} ফ্রেমে মানুষ`);
  if (found[0] < 5 && found[1] < 5) throw new Error("ভিডিওতে মানুষ পাওয়া যায়নি। পুরো শরীর দেখা যায় এমন ভিডিও দিন।");
  const people = found[1] >= 5 && found[0] >= 5 ? 2 : 1;
  if (people === 1) { const k = found[0] >= found[1] ? 0 : 1; tracks = [tracks[k], tracks[k]]; notes.push("একজন মানুষ পাওয়া গেছে"); }
  // ধরা না-পড়া ফ্রেম: ওই ব্যক্তির এলাকা কেটে আবার খোঁজা (খণ্ডে)
  const req = cropRequests(people === 2 ? tracks : [tracks[0]]);
  if (req.length) {
    const res: CropResult[] = [];
    try {
      for (let i = 0; i < req.length; i += 10) {
        stop(); onProgress(0.5 + 0.1 * (i / req.length), `ফাঁক ভরা হচ্ছে (${Math.min(i + 10, req.length)}/${req.length})…`);
        res.push(...(JSON.parse(await X.detectCrops(strip(videoUri), FPS, JSON.stringify(req.slice(i, i + 10)))) as CropResult[])); await tick();
      }
    } catch (e: any) { if (e instanceof Cancelled) throw e; log(`⚠ ফাঁক ভরা আংশিক: ${String(e?.message ?? e)}`); notes.push("কিছু ফ্রেমের ফাঁক ভরা যায়নি"); }
    tracks = mergeCrops(people === 2 ? tracks : [tracks[0]], res); if (people === 1) tracks = [tracks[0], tracks[0]];
  }
  // আওয়াজের ওঠানামা (ঠোঁট নড়ানোর জন্য) — ভিডিওর অডিও থেকে
  let env: number[] = [];
  try {
    const a = await X.analyzeAudio(strip(videoUri), FPS);
    const mx = Math.max(0.0001, ...a.envelope); env = a.envelope.map((v) => Math.min(1, v / mx));
  } catch { notes.push("ভিডিওতে অডিও পাওয়া যায়নি; ঠোঁট নড়বে না"); }
  // খালি পটভূমি — ধাপে ধাপে, অগ্রগতি সহ
  const code = uid().slice(0, 5), id = videoBgId(code, det.w, det.h);
  const dir = (FileSystem.documentDirectory ?? "") + "videobg/";
  const dinfo = await FileSystem.getInfoAsync(dir); if (!dinfo.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  setVideoBgDir(dir);
  try {
    stop(); onProgress(0.64, "পটভূমি বানানো শুরু…");
    const pb = JSON.parse(await X.plateBegin(strip(videoUri), FPS, JSON.stringify({ persons: people === 2 ? tracks : [tracks[0]] }))) as { steps: number };
    let done = 0;
    while (done < pb.steps) { stop(); done = await X.plateStep(3); onProgress(0.65 + 0.2 * (done / pb.steps), `পটভূমি: ${done}/${pb.steps} নমুনা-ফ্রেম`); await tick(); }
    onProgress(0.86, "পটভূমির ফাঁক ভরা হচ্ছে…"); await tick();
    await X.plateFinish(strip(videoBgPath(id)));
    log("✔ পটভূমি তৈরি");
  } catch (e: any) { try { await X.plateClose(); } catch { /* */ } if (e instanceof Cancelled) throw e; log(`⚠ পটভূমি: ${String(e?.message ?? e)}`); notes.push("পটভূমি বানানো যায়নি: " + String(e?.message ?? e)); }
  onProgress(0.9, "অ্যাপের চরিত্রে নড়াচড়া বসানো হচ্ছে…");
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
