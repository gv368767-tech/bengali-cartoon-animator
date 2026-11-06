import { Audio } from "expo-av";
import * as Speech from "expo-speech";

export const TRACKS = [
  { id: "happy", name: "হাসিখুশি", src: require("../../assets/music/happy.wav") },
  { id: "calm", name: "শান্ত", src: require("../../assets/music/calm.wav") },
  { id: "adventure", name: "অ্যাডভেঞ্চার", src: require("../../assets/music/adventure.wav") },
];

let sound: Audio.Sound | null = null;
let current: string | null = null;

// id = বিল্ট-ইন ট্র্যাকের নাম, অথবা নিজের ফোনের ফাইলের uri (file://… বা /…)
const isUri = (x: string) => x.startsWith("file:") || x.startsWith("/") || x.startsWith("content:");
export async function playMusic(id: string | null, volume = 0.35): Promise<void> {
  if (!id) return stopMusic();
  if (sound && current === id) { await sound.setVolumeAsync(volume); await sound.playAsync(); return; }
  await stopMusic();
  const src = isUri(id) ? { uri: id } : TRACKS.find((t) => t.id === id)?.src;
  if (!src) return;
  const { sound: s } = await Audio.Sound.createAsync(src, { shouldPlay: true, isLooping: true, volume });
  sound = s; current = id;
}

// সাউন্ড ইফেক্ট / ভয়েসওভার / তৈরি-করা সংলাপ — একবার বাজে
const live = new Set<Audio.Sound>();
export async function playClip(uri: string, volume = 1): Promise<void> {
  try {
    const { sound: s } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true, volume: Math.max(0, Math.min(1, volume)) });
    live.add(s);
    s.setOnPlaybackStatusUpdate((st) => { if (st.isLoaded && st.didJustFinish) { live.delete(s); s.unloadAsync().catch(() => {}); } });
  } catch { /* ফাইল না পেলে চুপচাপ বাদ */ }
}
export async function stopClips(): Promise<void> {
  const all = [...live]; live.clear();
  for (const s of all) { try { await s.stopAsync(); await s.unloadAsync(); } catch { /* ignore */ } }
}
export async function pauseMusic(): Promise<void> { try { await sound?.pauseAsync(); } catch { /* ignore */ } }
export async function stopMusic(): Promise<void> {
  try { await sound?.stopAsync(); await sound?.unloadAsync(); } catch { /* ignore */ }
  sound = null; current = null;
}
export function speak(text: string) { try { Speech.stop(); Speech.speak(text, { language: "bn-BD", rate: 0.95 }); } catch { /* ignore */ } }
export function stopSpeech() { try { Speech.stop(); } catch { /* ignore */ } }
