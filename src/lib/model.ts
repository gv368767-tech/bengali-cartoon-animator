// খাঁটি (pure) মডেল লজিক — UI ছাড়া, তাই আলাদাভাবে টেস্ট করা যায়।
export type Tool = "brush" | "pencil" | "eraser";
export type Stroke = { tool: Tool; color: string; size: number; pts: number[] }; // pts = [x0,y0,x1,y1,...]
export type Layer = { id: string; name: string; visible: boolean };
export type Frame = { id: string; strokes: Record<string, Stroke[]> };
export type Project = {
  version: 1; id: string; name: string; fps: number; width: number; height: number;
  layers: Layer[]; frames: Frame[]; updatedAt: number;
};

export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const MAX_LAYERS = 6;
export const MAX_FRAMES = 500;

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function newFrame(): Frame { return { id: uid(), strokes: {} }; }

export function newProject(name: string, fps: number): Project {
  const layer: Layer = { id: uid(), name: "লেয়ার ১", visible: true };
  return { version: 1, id: uid(), name: name.trim() || "নামহীন", fps, width: CANVAS_W, height: CANVAS_H,
    layers: [layer], frames: [newFrame()], updatedAt: Date.now() };
}

const touch = (p: Project): Project => ({ ...p, updatedAt: Date.now() });
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

export function frameHasContent(f: Frame): boolean {
  return Object.values(f.strokes).some((a) => a.length > 0);
}

function insertFrame(p: Project, at: number, f: Frame): Project {
  const frames = [...p.frames.slice(0, at), f, ...p.frames.slice(at)];
  return touch({ ...p, frames });
}

export function addFrame(p: Project, after: number): Project {
  if (p.frames.length >= MAX_FRAMES) return p;
  return insertFrame(p, clamp(after, 0, p.frames.length - 1) + 1, newFrame());
}

// strokes অ্যারে কখনো mutate করা হয় না, তাই রেফারেন্স শেয়ার করা নিরাপদ।
export const cloneFrame = (f: Frame): Frame => ({ id: uid(), strokes: { ...f.strokes } });

export function duplicateFrame(p: Project, idx: number): Project {
  if (p.frames.length >= MAX_FRAMES) return p;
  return insertFrame(p, idx + 1, cloneFrame(p.frames[idx]));
}

export function pasteFrame(p: Project, idx: number, clip: Frame): Project {
  if (p.frames.length >= MAX_FRAMES) return p;
  return insertFrame(p, idx + 1, cloneFrame(clip));
}

export function deleteFrame(p: Project, idx: number): Project {
  if (p.frames.length <= 1) return touch({ ...p, frames: [newFrame()] });
  return touch({ ...p, frames: p.frames.filter((_, i) => i !== idx) });
}

export function clearFrame(p: Project, idx: number): Project {
  const frames = p.frames.map((f, i) => (i === idx ? { ...f, strokes: {} } : f));
  return touch({ ...p, frames });
}

export function addStroke(p: Project, idx: number, layerId: string, s: Stroke): Project {
  const frames = p.frames.map((f, i) =>
    i === idx ? { ...f, strokes: { ...f.strokes, [layerId]: [...(f.strokes[layerId] ?? []), s] } } : f);
  return touch({ ...p, frames });
}

export function addLayer(p: Project): Project {
  if (p.layers.length >= MAX_LAYERS) return p;
  const l: Layer = { id: uid(), name: `লেয়ার ${p.layers.length + 1}`, visible: true };
  return touch({ ...p, layers: [...p.layers, l] });
}

export function removeLayer(p: Project, id: string): Project {
  if (p.layers.length <= 1) return p;
  const frames = p.frames.map((f) => {
    const { [id]: _drop, ...rest } = f.strokes;
    return { ...f, strokes: rest };
  });
  return touch({ ...p, layers: p.layers.filter((l) => l.id !== id), frames });
}

export function toggleLayer(p: Project, id: string): Project {
  return touch({ ...p, layers: p.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)) });
}

// dir: +1 = উপরে (অ্যারের শেষের দিকে = উপরের লেয়ার)
export function moveLayer(p: Project, id: string, dir: 1 | -1): Project {
  const i = p.layers.findIndex((l) => l.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= p.layers.length) return p;
  const layers = [...p.layers];
  [layers[i], layers[j]] = [layers[j], layers[i]];
  return touch({ ...p, layers });
}

export function setFps(p: Project, fps: number): Project {
  return touch({ ...p, fps: clamp(Math.round(fps), 1, 30) });
}

// অনিয়ন স্কিনের জন্য আগের/পরের ফ্রেমের সূচক (কাছেরটি আগে)
export function onionIndices(idx: number, total: number, prev: number, next: number) {
  const before: number[] = [], after: number[] = [];
  for (let k = 1; k <= prev; k++) if (idx - k >= 0) before.push(idx - k);
  for (let k = 1; k <= next; k++) if (idx + k < total) after.push(idx + k);
  return { before, after };
}

// ইতিহাস (Undo/Redo) — প্রতিটি Project অপরিবর্তনীয়, তাই স্ন্যাপশট সস্তা।
export type History = { past: Project[]; future: Project[] };
export const emptyHistory: History = { past: [], future: [] };
const CAP = 60;
export function pushHistory(h: History, current: Project): History {
  return { past: [...h.past, current].slice(-CAP), future: [] };
}
export function undo(h: History, current: Project): { h: History; p: Project } | null {
  if (!h.past.length) return null;
  const p = h.past[h.past.length - 1];
  return { p, h: { past: h.past.slice(0, -1), future: [current, ...h.future] } };
}
export function redo(h: History, current: Project): { h: History; p: Project } | null {
  if (!h.future.length) return null;
  const p = h.future[0];
  return { p, h: { past: [...h.past, current], future: h.future.slice(1) } };
}

export function simplifyPoint(pts: number[], x: number, y: number, minDist = 1.2): boolean {
  const n = pts.length;
  if (n >= 2) { const dx = x - pts[n - 2], dy = y - pts[n - 1]; if (dx * dx + dy * dy < minDist * minDist) return false; }
  pts.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10);
  return true;
}
