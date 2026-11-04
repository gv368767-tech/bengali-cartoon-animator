// অফলাইন সেভ/লোড — শুধু ফোনের নিজস্ব ফাইল-সিস্টেমে (ইন্টারনেট লাগে না)
import * as FileSystem from "expo-file-system";
import type { Project } from "./model";

const DIR = (FileSystem.documentDirectory ?? "") + "projects/";
export type Meta = { id: string; name: string; fps: number; frames: number; updatedAt: number };

async function ensureDir() {
  const i = await FileSystem.getInfoAsync(DIR);
  if (!i.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}

export async function saveProject(p: Project): Promise<void> {
  await ensureDir();
  await FileSystem.writeAsStringAsync(DIR + p.id + ".json", JSON.stringify(p));
  const meta: Meta = { id: p.id, name: p.name, fps: p.fps, frames: p.frames.length, updatedAt: p.updatedAt };
  await FileSystem.writeAsStringAsync(DIR + p.id + ".meta.json", JSON.stringify(meta));
}

export async function loadProject(id: string): Promise<Project> {
  const txt = await FileSystem.readAsStringAsync(DIR + id + ".json");
  const p = JSON.parse(txt) as Project;
  if (p.version !== 1 || !Array.isArray(p.frames) || !p.frames.length) throw new Error("প্রজেক্ট ফাইল নষ্ট");
  return p;
}

export async function listProjects(): Promise<Meta[]> {
  await ensureDir();
  const files = (await FileSystem.readDirectoryAsync(DIR)).filter((f) => f.endsWith(".meta.json"));
  const out: Meta[] = [];
  for (const f of files) {
    try { out.push(JSON.parse(await FileSystem.readAsStringAsync(DIR + f)) as Meta); } catch { /* নষ্ট ফাইল এড়িয়ে যান */ }
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function deleteProject(id: string): Promise<void> {
  await FileSystem.deleteAsync(DIR + id + ".json", { idempotent: true });
  await FileSystem.deleteAsync(DIR + id + ".meta.json", { idempotent: true });
}
