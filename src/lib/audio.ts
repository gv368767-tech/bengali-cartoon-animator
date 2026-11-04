import { Audio } from "expo-av";
import * as Speech from "expo-speech";

export const TRACKS = [
  { id: "happy", name: "হাসিখুশি", src: require("../../assets/music/happy.wav") },
  { id: "calm", name: "শান্ত", src: require("../../assets/music/calm.wav") },
  { id: "adventure", name: "অ্যাডভেঞ্চার", src: require("../../assets/music/adventure.wav") },
];

let sound: Audio.Sound | null = null;
let current: string | null = null;

export async function playMusic(id: string | null, volume = 0.35): Promise<void> {
  if (!id) return stopMusic();
  if (sound && current === id) { await sound.setVolumeAsync(volume); await sound.playAsync(); return; }
  await stopMusic();
  const tr = TRACKS.find((t) => t.id === id);
  if (!tr) return;
  const { sound: s } = await Audio.Sound.createAsync(tr.src, { shouldPlay: true, isLooping: true, volume });
  sound = s; current = id;
}
export async function pauseMusic(): Promise<void> { try { await sound?.pauseAsync(); } catch { /* ignore */ } }
export async function stopMusic(): Promise<void> {
  try { await sound?.stopAsync(); await sound?.unloadAsync(); } catch { /* ignore */ }
  sound = null; current = null;
}
export function speak(text: string) { try { Speech.stop(); Speech.speak(text, { language: "bn-BD", rate: 0.95 }); } catch { /* ignore */ } }
export function stopSpeech() { try { Speech.stop(); } catch { /* ignore */ } }
