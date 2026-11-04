// অফলাইন সেভ/লোড — ফোনের নিজস্ব ফাইল-সিস্টেমে (ইন্টারনেট লাগে না)
import * as FileSystem from "expo-file-system";
import type { Movie } from "./scene";

const DIR = (FileSystem.documentDirectory ?? "") + "movies/";
export type Meta = { id: string; name: string; scenes: number; updatedAt: number };

async function ensureDir() {
  const i = await FileSystem.getInfoAsync(DIR);
  if (!i.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}
export async function saveMovie(m: Movie): Promise<void> {
  await ensureDir();
  await FileSystem.writeAsStringAsync(DIR + m.id + ".json", JSON.stringify(m));
  const meta: Meta = { id: m.id, name: m.name, scenes: m.scenes.length, updatedAt: m.updatedAt };
  await FileSystem.writeAsStringAsync(DIR + m.id + ".meta.json", JSON.stringify(meta));
}
export async function loadMovie(id: string): Promise<Movie> {
  const m = JSON.parse(await FileSystem.readAsStringAsync(DIR + id + ".json")) as Movie;
  if (m.kind !== "movie" || !Array.isArray(m.scenes) || !m.scenes.length) throw new Error("প্রজেক্ট ফাইল নষ্ট");
  return m;
}
export async function listMovies(): Promise<Meta[]> {
  await ensureDir();
  const files = (await FileSystem.readDirectoryAsync(DIR)).filter((f) => f.endsWith(".meta.json"));
  const out: Meta[] = [];
  for (const f of files) { try { out.push(JSON.parse(await FileSystem.readAsStringAsync(DIR + f)) as Meta); } catch { /* নষ্ট ফাইল বাদ */ } }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function deleteMovie(id: string): Promise<void> {
  await FileSystem.deleteAsync(DIR + id + ".json", { idempotent: true });
  await FileSystem.deleteAsync(DIR + id + ".meta.json", { idempotent: true });
}
