// "টুকাই ও মিনি — হারানো সাইকেল": অ্যাপের নিজের ছেলে/মেয়ে/সাইকেল/গাছ, ব্যাকগ্রাউন্ড, অ্যানিমেশন, সংলাপ, মিউজিক ও ইফেক্ট দিয়ে তৈরি ৫ দৃশ্যের গল্প।
import { Movie, addClip, addDialogue, addObject, dialogueLength, newMovie, renameCast, setAction, setKey, setView, updateDialogue, updateScene, updateObj, addScene, uid } from "./scene";
import { sfxFile, SFX, SfxId } from "./sfx";
import { makeVoice } from "./audioFiles";
import type { Action, View } from "../art/shapes";

type Who = "tukai" | "mini";
type Line = { who: Who; text: string };
export const LINES: Record<string, Line> = {
  s1: { who: "tukai", text: "আজ আমি সাইকেল নিয়ে মাঠে ঘুরতে যাব!" },
  s2: { who: "tukai", text: "আরে! আমার সাইকেল কোথায় গেল?" },
  s3a: { who: "mini", text: "টুকাই, তুমি এভাবে মন খারাপ করে দাঁড়িয়ে আছ কেন?" },
  s3b: { who: "tukai", text: "আমার সাইকেলটা খুঁজে পাচ্ছি না!" },
  s3c: { who: "mini", text: "চলো, দুজনে মিলে খুঁজি।" },
  s4a: { who: "mini", text: "ওই দেখো! তোমার সাইকেল!" },
  s4b: { who: "tukai", text: "আরে! এখানে এল কীভাবে?" },
  s5a: { who: "mini", text: "পরের বার সাইকেল ভালো করে রেখে যাবে!" },
  s5b: { who: "tukai", text: "ঠিক আছে! আজ থেকে সাবধানে রাখব।" },
  s5c: { who: "tukai", text: "বন্ধুরা, তোমরাও নিজেদের জিনিস সাবধানে রাখবে। আবার দেখা হবে!" },
};
const PITCH: Record<Who, number> = { tukai: 1.05, mini: 1.4 };

export type StoryResult = { movie: Movie; voices: number; note: string };

export async function buildStory(): Promise<StoryResult> {
  // ১) বাংলা ভয়েস ফাইল (ফোনের ইঞ্জিন) — না হলে এক্সপোর্টের সময় ফোনের ভয়েসই বলবে
  const voice: Record<string, { uri: string; dur: number }> = {};
  let note = "";
  for (const k of Object.keys(LINES)) {
    try { voice[k] = await makeVoice(LINES[k].text, 0.95, PITCH[LINES[k].who]); }
    catch (e: any) { note = String(e?.message ?? e); break; }
  }
  const sfx: Record<string, string> = {};
  for (const k of Object.keys(SFX)) sfx[k] = await sfxFile(k as SfxId);

  // ২) চরিত্র (সব দৃশ্যে একই টুকাই ও মিনি)
  let m = newMovie("টুকাই ও মিনি — হারানো সাইকেল");
  m = { ...m, music: "happy" };
  let cast = { tukai: "", mini: "" };
  { const r = addObject(m, m.scenes[0].id, "boy"); m = r.movie; cast.tukai = m.cast[0].id; m = renameCast(m, cast.tukai, "টুকাই"); m = updateScene(m, m.scenes[0].id, (s) => ({ ...s, objects: [] })); }
  { const r = addObject(m, m.scenes[0].id, "girl"); m = r.movie; cast.mini = m.cast[1].id; m = renameCast(m, cast.mini, "মিনি"); m = updateScene(m, m.scenes[0].id, (s) => ({ ...s, objects: [] })); }

  // ছোট সহায়ক
  const dur = (k: string) => (voice[k] ? voice[k].dur : dialogueLength(LINES[k].text));
  type B = { m: Movie; sid: string };
  const newSc = (bg: string, first: boolean): B => {
    if (first) { m = updateScene(m, m.scenes[0].id, (s) => ({ ...s, bg, duration: 6 })); return { m, sid: m.scenes[0].id }; }
    m = addScene(m, m.scenes.length - 1, bg); return { m, sid: m.scenes[m.scenes.length - 1].id };
  };
  const put = (sid: string, assetId: string, x: number, y: number, castId?: string, s?: number) => {
    const r = addObject(m, sid, assetId, castId); m = r.movie;
    m = updateScene(m, sid, (sc) => updateObj(sc, r.objId, (o) => ({ ...o, keys: [{ ...o.keys[0], x, y, ...(s ? { s } : {}) }] })));
    return r.objId;
  };
  const ed = (sid: string, id: string, fn: (o: any) => any) => { m = updateScene(m, sid, (sc) => updateObj(sc, id, fn)); };
  const mv = (sid: string, id: string, t: number, x: number, y?: number) => ed(sid, id, (o) => setKey(o, t, y == null ? { x } : { x, y }));
  const act = (sid: string, id: string, t: number, a: Action) => ed(sid, id, (o) => setAction(o, t, a));
  const view = (sid: string, id: string, t: number, v: View) => ed(sid, id, (o) => setView(o, t, v));
  const say = (sid: string, id: string, t: number, k: string) => {
    const did = uid();
    m = updateScene(m, sid, (sc) => addDialogue(sc, id, t, LINES[k].text, did));
    m = updateScene(m, sid, (sc) => updateDialogue(sc, did, { dur: dur(k), voiceUri: voice[k]?.uri }));
    return t + dur(k);
  };
  const fx = (sid: string, t: number, k: SfxId, vol = 0.9) => { m = updateScene(m, sid, (sc) => addClip(sc, { kind: "sfx", name: SFX[k].name, uri: sfx[k], t, dur: SFX[k].dur, vol })); };
  const finish = (sid: string, end: number, fade = false) => { m = updateScene(m, sid, (sc) => ({ ...sc, duration: Math.min(60, Math.ceil(end + 0.6)), fade })); };
  const GAP = 0.5;

  // ---------- দৃশ্য ১: সকালের গ্রাম ----------
  {
    const { sid } = newSc("bg_village", true);
    put(sid, "tree", 1130, 600);
    const bike = put(sid, "bicycle", 260, 610);
    const t = put(sid, "boy", 120, 600, cast.tukai);
    view(sid, t, 0, "side"); act(sid, t, 0, "walk");
    mv(sid, t, 4, 560); mv(sid, bike, 0, 260); mv(sid, bike, 4, 700);
    act(sid, t, 4, "cheer"); view(sid, t, 4, "q_front");
    fx(sid, 0.8, "bell"); fx(sid, 2.4, "bell");
    const e = say(sid, t, 4.4, "s1"); fx(sid, 4.3, "pop", 0.6);
    finish(sid, e + GAP);
  }
  // ---------- দৃশ্য ২: সাইকেল হারিয়ে গেল ----------
  {
    const { sid } = newSc("bg_village", false);
    put(sid, "tree", 1000, 600);
    const bike = put(sid, "bicycle", 820, 610);
    const t = put(sid, "boy", 620, 600, cast.tukai);
    view(sid, t, 0, "side"); act(sid, t, 0, "stand");
    act(sid, t, 0.8, "walk"); mv(sid, t, 0.8, 620); mv(sid, t, 3.6, -150);       // একটু দূরে যায়
    mv(sid, bike, 3.6, 820); mv(sid, bike, 3.7, 2400);                              // সাইকেল উধাও
    act(sid, t, 3.7, "stand"); mv(sid, t, 4.4, -150);
    act(sid, t, 4.4, "walk"); mv(sid, t, 7.4, 600);                                  // ফিরে আসে
    act(sid, t, 7.4, "scared"); view(sid, t, 7.4, "front"); fx(sid, 7.5, "surprise");
    let e = say(sid, t, 8.3, "s2");
    act(sid, t, 8.3, "scared"); act(sid, t, e + 0.2, "think");
    view(sid, t, e + 0.2, "q_front"); view(sid, t, e + 1.2, "q_back"); view(sid, t, e + 2.2, "side"); view(sid, t, e + 3.2, "front");
    finish(sid, e + 3.8);
  }
  // ---------- দৃশ্য ৩: মিনির আগমন ----------
  {
    const { sid } = newSc("bg_road", false);
    put(sid, "tree", 1150, 600);
    const t = put(sid, "boy", 760, 600, cast.tukai);
    act(sid, t, 0, "think"); view(sid, t, 0, "front");
    const mi = put(sid, "girl", -120, 600, cast.mini);
    view(sid, mi, 0, "side"); act(sid, mi, 0, "walk"); mv(sid, mi, 4, 440);
    act(sid, mi, 4, "stand"); view(sid, mi, 4, "q_front");
    let e = say(sid, mi, 4.4, "s3a");
    act(sid, t, e + GAP, "shrug"); e = say(sid, t, e + GAP, "s3b");
    act(sid, mi, e + GAP, "point"); e = say(sid, mi, e + GAP, "s3c");
    finish(sid, e + GAP);
  }
  // ---------- দৃশ্য ৪: সাইকেল খোঁজা ----------
  {
    const { sid } = newSc("bg_road", false);
    put(sid, "tree", 930, 600);
    put(sid, "bicycle", 1030, 612);
    const t = put(sid, "boy", 120, 600, cast.tukai);
    const mi = put(sid, "girl", -120, 600, cast.mini);
    view(sid, t, 0, "side"); view(sid, mi, 0, "side"); act(sid, t, 0, "walk"); act(sid, mi, 0, "walk");
    mv(sid, t, 4, 520); mv(sid, mi, 4, 760);
    act(sid, mi, 4, "stand"); view(sid, mi, 4, "q_back"); act(sid, t, 4, "think"); view(sid, t, 4, "q_front");
    act(sid, mi, 5.2, "point"); view(sid, mi, 5.2, "q_front");
    let e = say(sid, mi, 5.4, "s4a"); fx(sid, 5.3, "pop", 0.7);
    act(sid, t, e + GAP, "scared"); fx(sid, e + GAP, "surprise"); view(sid, t, e + GAP, "front");
    e = say(sid, t, e + GAP + 0.3, "s4b");
    finish(sid, e + GAP);
  }
  // ---------- দৃশ্য ৫: মজার সমাপ্তি ----------
  {
    const { sid } = newSc("bg_field", false);
    put(sid, "tree", 1160, 600);
    put(sid, "bicycle", 900, 612);
    const t = put(sid, "boy", 220, 600, cast.tukai);
    const mi = put(sid, "girl", 480, 600, cast.mini);
    view(sid, t, 0, "side"); act(sid, t, 0, "run"); mv(sid, t, 2.2, 790);
    act(sid, t, 2.2, "stand"); view(sid, t, 2.2, "q_front");
    act(sid, mi, 2.4, "laugh"); view(sid, mi, 2.4, "q_front"); fx(sid, 2.4, "laugh");
    let e = say(sid, mi, 3.6, "s5a");
    e = say(sid, t, e + GAP, "s5b");
    act(sid, t, e + GAP, "laugh"); act(sid, mi, e + GAP, "laugh"); view(sid, t, e + GAP, "front"); view(sid, mi, e + GAP, "front"); fx(sid, e + GAP, "laugh"); fx(sid, e + GAP + 1.2, "ding", 0.7);
    const w = e + GAP + 2.4;
    act(sid, t, w, "wave"); act(sid, mi, w, "wave");
    e = say(sid, t, w + 0.2, "s5c");
    finish(sid, e + 0.5, true);
  }
  return { movie: { ...m, updatedAt: Date.now() }, voices: Object.keys(voice).length, note };
}
