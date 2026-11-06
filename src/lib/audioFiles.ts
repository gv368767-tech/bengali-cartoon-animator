// নিজের ফোন থেকে অডিও (MP3/WAV…) নেওয়া, লেখা থেকে বাংলা ভয়েস বানানো, আর আওয়াজের ওঠানামা (ঠোঁট নড়ার জন্য) হিসাব।
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import StudioExport from "../../modules/studio-export";
import { ENV_FPS, hasEnvelope, setEnvelope } from "./envelope";
import type { Movie } from "./scene";

const DIR = (FileSystem.documentDirectory ?? "") + "audio/";
const stamp = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
async function ensure() { const i = await FileSystem.getInfoAsync(DIR); if (!i.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }); }
const strip = (u: string) => u.replace("file://", "");

export type PickedAudio = { uri: string; name: string; dur: number };

/** ফোনের ফাইল-ম্যানেজার থেকে অডিও বাছা; অ্যাপের নিজস্ব ফোল্ডারে কপি হয় (তাই পরেও পাওয়া যায়) */
export async function pickAudio(): Promise<PickedAudio | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ["audio/*"], copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  await ensure();
  const ext = (a.name.split(".").pop() ?? "mp3").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp3";
  const dest = DIR + stamp() + "." + ext;
  await FileSystem.copyAsync({ from: a.uri, to: dest });
  let dur = 5;
  if (StudioExport) {
    try { const info = await StudioExport.analyzeAudio(strip(dest), ENV_FPS); dur = Math.max(0.2, info.durationMs / 1000); setEnvelope(dest, info.envelope); }
    catch (e) { await FileSystem.deleteAsync(dest, { idempotent: true }); throw e; }
  }
  return { uri: dest, name: a.name.replace(/\.[^.]+$/, ""), dur: Math.round(dur * 10) / 10 };
}

/** লেখা থেকে বাংলা ভয়েস ফাইল তৈরি (ফোনের অফলাইন ইঞ্জিন) */
export async function makeVoice(text: string, rate = 0.95, pitch = 1): Promise<{ uri: string; dur: number }> {
  if (!StudioExport) throw new Error("ভয়েস তৈরি শুধু ইনস্টল করা APK-তে কাজ করে");
  await ensure();
  const dest = DIR + "voice_" + stamp() + ".wav";
  try {
    const r = await StudioExport.synthesizeVoice(text, strip(dest), rate, pitch);
    setEnvelope(dest, r.envelope);
    return { uri: dest, dur: Math.max(0.5, Math.round(r.durationMs / 100) / 10) };
  } catch (e: any) {
    const m = String(e?.message ?? e);
    if (m.includes("tts_no_bengali")) throw new Error("এই ফোনে বাংলা ভয়েস নেই। Settings → ভাষা → টেক্সট-টু-স্পিচ থেকে বাংলা ভয়েস নামান।");
    if (m.includes("tts_init_failed")) throw new Error("ফোনের ভয়েস ইঞ্জিন চালু করা যায়নি।");
    throw new Error("ভয়েস তৈরি হয়নি: " + m);
  }
}

/** প্রজেক্ট খোলার সময়: ভয়েস ফাইলগুলোর আওয়াজের ওঠানামা আবার হিসাব (ঠোঁট নড়ার জন্য) */
export async function ensureEnvelopes(m: Movie): Promise<void> {
  if (!StudioExport) return;
  const uris = new Set<string>();
  for (const s of m.scenes) {
    for (const d of s.dialogues) if (d.voiceUri) uris.add(d.voiceUri);
    for (const c of s.clips ?? []) if (c.kind === "voice") uris.add(c.uri);
  }
  for (const u of uris) {
    if (hasEnvelope(u)) continue;
    try { const i = await StudioExport.analyzeAudio(strip(u), ENV_FPS); setEnvelope(u, i.envelope); } catch { /* ফাইল মুছে গেলে বাদ */ }
  }
}
