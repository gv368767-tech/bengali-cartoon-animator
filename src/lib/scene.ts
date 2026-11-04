// খাঁটি (pure) দৃশ্য-মডেল — UI ছাড়া, তাই আলাদা টেস্ট করা যায়।
import { Action } from "../art/shapes";
import { AssetDef, getAsset, getBg } from "../art/registry";
import { HumanDef } from "../art/human";

export const STAGE_W = 1280, STAGE_H = 720;
export type Key = { t: number; x: number; y: number; s: number; r: number };
export type Act = { t: number; action: Action };
export type Look = Partial<Pick<HumanDef, "skin" | "hair" | "top" | "bottom">>;
export type CastMember = { id: string; assetId: string; name: string; look?: Look };
export type Obj = { id: string; assetId: string; castId?: string; flip: boolean; keys: Key[]; acts: Act[] };
export type Dialogue = { id: string; objId: string; t: number; dur: number; text: string };
export type Scene = { id: string; bg: string; duration: number; objects: Obj[]; dialogues: Dialogue[] };
export type Movie = {
  version: 1; kind: "movie"; id: string; name: string; speed: number; music: string | null;
  cast: CastMember[]; scenes: Scene[]; updatedAt: number;
};

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const touch = (m: Movie): Movie => ({ ...m, updatedAt: Date.now() });

export const newScene = (bg: string): Scene => ({ id: uid(), bg, duration: 6, objects: [], dialogues: [] });
export function newMovie(name: string): Movie {
  return { version: 1, kind: "movie", id: uid(), name: name.trim() || "নামহীন ভিডিও", speed: 1, music: null, cast: [], scenes: [newScene("bg_village")], updatedAt: Date.now() };
}

export function updateScene(m: Movie, sceneId: string, fn: (s: Scene) => Scene): Movie {
  return touch({ ...m, scenes: m.scenes.map((s) => (s.id === sceneId ? fn(s) : s)) });
}
export function updateObj(s: Scene, objId: string, fn: (o: Obj) => Obj): Scene {
  return { ...s, objects: s.objects.map((o) => (o.id === objId ? fn(o) : o)) };
}

// ---------- দৃশ্য ----------
export function addScene(m: Movie, after: number, bg?: string): Movie {
  const prev = m.scenes[after];
  return touch({ ...m, scenes: [...m.scenes.slice(0, after + 1), newScene(bg ?? prev?.bg ?? "bg_village"), ...m.scenes.slice(after + 1)] });
}
export function duplicateScene(m: Movie, idx: number): Movie {
  const src = m.scenes[idx];
  const idMap = new Map<string, string>();
  const objects = src.objects.map((o) => { const id = uid(); idMap.set(o.id, id); return { ...o, id }; });
  const dialogues = src.dialogues.map((d) => ({ ...d, id: uid(), objId: idMap.get(d.objId) ?? d.objId }));
  return touch({ ...m, scenes: [...m.scenes.slice(0, idx + 1), { ...src, id: uid(), objects, dialogues }, ...m.scenes.slice(idx + 1)] });
}
export function deleteScene(m: Movie, idx: number): Movie {
  if (m.scenes.length <= 1) return m;
  return touch({ ...m, scenes: m.scenes.filter((_, i) => i !== idx) });
}
export const setBg = (m: Movie, sceneId: string, bg: string) => updateScene(m, sceneId, (s) => ({ ...s, bg }));
export const setDuration = (m: Movie, sceneId: string, d: number) => updateScene(m, sceneId, (s) => ({ ...s, duration: clamp(Math.round(d), 2, 60) }));
export const movieDuration = (m: Movie) => m.scenes.reduce((a, s) => a + s.duration, 0);

// ---------- অবজেক্ট ----------
export function addObject(m: Movie, sceneId: string, assetId: string, castId?: string): { movie: Movie; objId: string } {
  const a = getAsset(assetId)!;
  let movie = m;
  let cid = castId;
  if (a.cat === "human" && !cid) {
    const n = m.cast.filter((c) => c.assetId === assetId).length + 1;
    cid = uid();
    movie = { ...movie, cast: [...movie.cast, { id: cid, assetId, name: n > 1 ? `${a.name} ${n}` : a.name }] };
  }
  const scene = movie.scenes.find((s) => s.id === sceneId)!;
  const n = scene.objects.length;
  const x = clamp(300 + (n % 6) * 150, 120, STAGE_W - 120);
  const y = a.defaultY === 600 ? 560 + (n % 3) * 40 : a.defaultY;
  const obj: Obj = { id: uid(), assetId, castId: cid, flip: false, keys: [{ t: 0, x, y, s: a.scale, r: 0 }], acts: [] };
  return { movie: updateScene(movie, sceneId, (s) => ({ ...s, objects: [...s.objects, obj] })), objId: obj.id };
}
export function removeObject(m: Movie, sceneId: string, objId: string): Movie {
  return updateScene(m, sceneId, (s) => ({ ...s, objects: s.objects.filter((o) => o.id !== objId), dialogues: s.dialogues.filter((d) => d.objId !== objId) }));
}
export const renameCast = (m: Movie, castId: string, name: string): Movie => touch({ ...m, cast: m.cast.map((c) => (c.id === castId ? { ...c, name } : c)) });
// চেহারা বদলালে সব দৃশ্যের একই চরিত্র একসাথে বদলায় (কারণ চেহারা cast-এ জমা থাকে)
export const setLook = (m: Movie, castId: string, look: Look): Movie => touch({ ...m, cast: m.cast.map((c) => (c.id === castId ? { ...c, look: { ...c.look, ...look } } : c)) });

// ---------- কিফ্রেম ----------
export type State = { x: number; y: number; s: number; r: number };
export function evalObj(o: Obj, t: number): State {
  const k = o.keys;
  if (t <= k[0].t) return { x: k[0].x, y: k[0].y, s: k[0].s, r: k[0].r };
  const last = k[k.length - 1];
  if (t >= last.t) return { x: last.x, y: last.y, s: last.s, r: last.r };
  for (let i = 0; i < k.length - 1; i++) {
    const a = k[i], b = k[i + 1];
    if (t >= a.t && t <= b.t) {
      const u = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, s: a.s + (b.s - a.s) * u, r: a.r + (b.r - a.r) * u };
    }
  }
  return { x: last.x, y: last.y, s: last.s, r: last.r };
}
export function setKey(o: Obj, t: number, patch: Partial<State>): Obj {
  const cur = evalObj(o, t);
  const nk: Key = { t: Math.max(0, Math.round(t * 100) / 100), ...cur, ...patch };
  const i = o.keys.findIndex((k) => Math.abs(k.t - nk.t) < 0.05);
  const keys = i >= 0 ? o.keys.map((k, j) => (j === i ? { ...nk, t: k.t } : k)) : [...o.keys, nk].sort((a, b) => a.t - b.t);
  return { ...o, keys };
}
export function removeKeyAt(o: Obj, t: number): Obj {
  if (o.keys.length <= 1) return o;
  const i = o.keys.findIndex((k) => Math.abs(k.t - t) < 0.12 && k.t > 0);
  return i < 0 ? o : { ...o, keys: o.keys.filter((_, j) => j !== i) };
}
export function speedAt(o: Obj, t: number): number {
  const a = evalObj(o, Math.max(0, t - 0.1)), b = evalObj(o, t + 0.1);
  return Math.hypot(b.x - a.x, b.y - a.y) / (t - Math.max(0, t - 0.1) + 0.1);
}
export function facingLeft(o: Obj, t: number): boolean {
  let dir = 0;
  for (let i = 0; i < o.keys.length - 1; i++) {
    const a = o.keys[i], b = o.keys[i + 1];
    if (a.t > t + 0.001) break;
    if (Math.abs(b.x - a.x) > 6) dir = Math.sign(b.x - a.x);
  }
  return o.flip !== (dir < 0);
}
export function setAction(o: Obj, t: number, action: Action): Obj {
  const rest = o.acts.filter((a) => Math.abs(a.t - t) >= 0.05);
  return { ...o, acts: [...rest, { t: Math.round(t * 100) / 100, action }].sort((a, b) => a.t - b.t) };
}
export function actionAt(o: Obj, a: AssetDef, t: number): Exclude<Action, "auto"> {
  let act: Action = "auto";
  for (const x of o.acts) if (x.t <= t + 1e-6) act = x.action;
  if (act !== "auto") return act === "fly" && !a.actions.includes("fly") ? a.defaultAction : (act as Exclude<Action, "auto">);
  const v = speedAt(o, t);
  if (a.defaultAction === "fly") return "fly";
  if (v > 320 && a.actions.includes("run")) return "run";
  if (v > 8 && a.actions.includes("walk")) return "walk";
  return a.defaultAction;
}
const RATE: Record<string, number> = { walk: 7, run: 12, dance: 6, jump: 8, fly: 16, wave: 5, stand: 2, sit: 2 };
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000; return h / 160; };
export function phaseAt(o: Obj, a: AssetDef, act: string, t: number, speed: number): number {
  const v = speedAt(o, t);
  const rate = a.cat === "object" && act === "walk" ? clamp(v / 22, 2, 30) : RATE[act] ?? 2;
  return t * rate * speed + hash(o.id);
}
export function talkAt(s: Scene, objId: string, t: number): number {
  for (const d of s.dialogues) if (d.objId === objId && t >= d.t && t <= d.t + d.dur) return 0.35 + 0.65 * Math.abs(Math.sin(t * 17));
  return 0;
}
export const blinkAt = (o: Obj, t: number) => ((t + hash(o.id) * 3) % 3.4) < 0.12;
export const depthScale = (y: number, horizon: number) => 0.5 + 0.5 * clamp((y - horizon) / (STAGE_H - horizon), 0, 1);

// ---------- সংলাপ ----------
export const dialogueLength = (text: string) => Math.max(1.5, Math.round(text.trim().length * 0.09 * 10) / 10);
export function addDialogue(s: Scene, objId: string, t: number, text: string): Scene {
  const dur = dialogueLength(text);
  return { ...s, duration: Math.max(s.duration, Math.min(60, Math.ceil(t + dur + 0.3))), dialogues: [...s.dialogues, { id: uid(), objId, t: Math.round(t * 100) / 100, dur, text: text.trim() }].sort((a, b) => a.t - b.t) };
}
export const removeDialogue = (s: Scene, id: string): Scene => ({ ...s, dialogues: s.dialogues.filter((d) => d.id !== id) });
export const dialogueAt = (s: Scene, t: number) => s.dialogues.find((d) => t >= d.t && t <= d.t + d.dur) ?? null;

// ---------- আঁকার ক্রম ও ক্লিক-ধরা ----------
export type Placed = { obj: Obj; asset: AssetDef; st: State; act: Exclude<Action, "auto">; air: boolean; eff: number; flip: boolean };
export function placed(s: Scene, t: number): Placed[] {
  const bg = getBg(s.bg);
  const list: Placed[] = s.objects.map((obj) => {
    const asset = getAsset(obj.assetId)!;
    const st = evalObj(obj, t), act = actionAt(obj, asset, t);
    const air = act === "fly";
    const eff = st.s * (asset.layer === "back" || air ? 1 : depthScale(st.y, bg.horizon));
    return { obj, asset, st, act, air, eff, flip: asset.side ? facingLeft(obj, t) : obj.flip };
  });
  const rank = (p: Placed) => (p.asset.layer === "back" ? 0 : p.air ? 2 : 1);
  return list.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || (rank(a.p) === 1 ? a.p.st.y - b.p.st.y : 0) || a.i - b.i).map((x) => x.p);
}
export function hitTest(s: Scene, t: number, px: number, py: number): string | null {
  const list = placed(s, t);
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    let dx = px - p.st.x, dy = py - p.st.y;
    const r = (-p.st.r * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r);
    [dx, dy] = [dx * c - dy * sn, dx * sn + dy * c];
    dx /= p.eff; dy /= p.eff;
    if (p.flip) dx = -dx;
    const [x1, y1, x2, y2] = p.asset.bounds, pad = 18 / Math.max(0.3, p.eff);
    if (dx >= x1 - pad && dx <= x2 + pad && dy >= y1 - pad && dy <= y2 + pad) return p.obj.id;
  }
  return null;
}

// ---------- আনডু/রিডু ----------
export type History<T> = { past: T[]; future: T[] };
export const emptyHistory = <T,>(): History<T> => ({ past: [], future: [] });
export const pushHistory = <T,>(h: History<T>, cur: T): History<T> => ({ past: [...h.past, cur].slice(-60), future: [] });
export function undo<T>(h: History<T>, cur: T): { h: History<T>; v: T } | null {
  if (!h.past.length) return null;
  return { v: h.past[h.past.length - 1], h: { past: h.past.slice(0, -1), future: [cur, ...h.future] } };
}
export function redo<T>(h: History<T>, cur: T): { h: History<T>; v: T } | null {
  if (!h.future.length) return null;
  return { v: h.future[0], h: { past: [...h.past, cur], future: h.future.slice(1) } };
}
export const fmtTime = (t: number) => { const s = Math.max(0, Math.floor(t)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
