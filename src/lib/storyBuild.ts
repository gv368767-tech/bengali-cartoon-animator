// পরিকল্পনা (StoryPlan) → সম্পূর্ণ Movie: চরিত্র, দৃশ্য, পটভূমি, ভঙ্গি, সংলাপ, ভয়েস, মিউজিক, সাউন্ড-ইফেক্ট।
import { Movie, addClip, addDialogue, addObject, addScene, dialogueLength, newMovie, renameCast, setAction, setKey, setLook, setView, updateDialogue, updateObj, updateScene, uid } from "./scene";
import { getAsset } from "../art/registry";
import type { Action } from "../art/shapes";
import type { Char, Ride, StoryPlan, Unit } from "./storyPlan";

export type VoiceFn = (text: string, rate: number, pitch: number, variant: number) => Promise<{ uri: string; dur: number }>;
export type SfxFn = (id: string) => Promise<{ uri: string; dur: number; name: string } | null>;
export type BuildOpts = { seconds: number; music: boolean; musicVol: number; narrate: boolean; voices: boolean; makeVoice?: VoiceFn; sfx?: SfxFn; progress?: (p: number, msg: string) => void; cancelled?: () => boolean };
export type BuildResult = { movie: Movie; seconds: number; notes: string[]; scenes: number; voiced: number };

// বেশি পিচ-বদল কণ্ঠ বিকৃত করে, তাই কম রেঞ্জ; আলাদা স্বর মূলত আলাদা ইনস্টল-করা কণ্ঠ (variant) থেকে আসে
const PITCH: Record<string, number> = { boy: 1.08, girl: 1.18, kid: 1.3, man: 0.92, woman: 1.08, elder: 0.86, elderF: 1.0, deity: 0.9, animal: 1.0 };
const VARIANT: Record<string, number> = { boy: 0, man: 0, elder: 0, deity: 0, animal: 0, girl: 1, woman: 1, kid: 1, elderF: 1 };
export const MAX_SECONDS = 300;

const RIDE_ASSET = (r: Ride, role: string): string => {
  const girl = role === "girl" || role === "woman" || role === "kid" || role === "elderF";
  switch (r) {
    case "cycle": return girl ? "ride_cycle_girl" : "ride_cycle_boy";
    case "scooty": return girl ? "ride_scooty_girl" : "ride_scooty_boy";
    case "bike": return role === "man" || role === "elder" ? "ride_bike_man" : "ride_bike_boy";
    case "car": return "car_driver"; case "bus": return "bus_driver"; case "auto": return "auto"; case "truck": return "truck";
  }
};
const slots = (n: number): number[] => (n <= 1 ? [640] : Array.from({ length: n }, (_, i) => Math.round(250 + (i * 780) / (n - 1))));
const okAct = (asset: string, a: Action | undefined): Action => { const d = getAsset(asset); if (!a || !d) return "stand"; return d.actions.includes(a) ? a : d.actions.includes("talk") && a === "sing" ? "talk" : "stand"; };

export async function buildStoryMovie(plan: StoryPlan, name: string, o: BuildOpts): Promise<BuildResult> {
  const notes = [...plan.notes]; const stop = () => { if (o.cancelled?.()) throw new Error("বাতিল করা হয়েছে"); };
  const prog = o.progress ?? (() => {});
  const target = Math.max(30, Math.min(MAX_SECONDS, o.seconds));
  // ১) ভয়েস — সংলাপ (চরিত্রের স্বরে) ও বর্ণনা (এক বর্ণনাকারী)
  const units = plan.scenes.flatMap((s) => s.units);
  const chById = new Map(plan.chars.map((c) => [c.id, c]));
  const voice = new Map<Unit, { uri: string; dur: number }>();
  let voiced = 0, vErr = "";
  if (o.voices && o.makeVoice) {
    for (let i = 0; i < units.length; i++) {
      stop(); const u = units[i]; if (u.kind === "narr" && !o.narrate) continue;
      prog(0.05 + 0.5 * (i / units.length), `ভয়েস তৈরি: ${i + 1}/${units.length}`);
      try {
        const vk = u.kind === "say" ? chById.get(u.who)?.role.voice ?? "boy" : "";
        voice.set(u, await o.makeVoice(u.text.replace(/[“”"‘’«»]/g, "").replace(/\s*[-–—]\s*/g, ", "), u.kind === "say" ? 0.92 : 0.88, vk ? PITCH[vk] : 1.0, vk ? VARIANT[vk] : 0)); voiced++;
      } catch (e: any) { vErr = String(e?.message ?? e); break; }
    }
    if (vErr) notes.push("ভয়েস তৈরি হয়নি, তাই ভিডিও নিঃশব্দ সংলাপসহ (ডায়ালগ বাবল)। কারণ: " + vErr);
  }
  const natural = (u: Unit): number => { const v = voice.get(u); return u.kind === "say" ? (v ? v.dur + 0.5 : dialogueLength(u.text) + 0.3) : Math.max(2.4, v ? v.dur + 0.5 : u.text.length * 0.06 + 1.2); };
  // ২) সময়ের হিসাব: লক্ষ্য-সময়ের চেয়ে ছোট হলে প্রতিটি দৃশ্য টেনে বাড়ানো, বড় হলে শেষের অংশ বাদ
  const OVER = 1.5;   // প্রতি দৃশ্যের শুরু/শেষের বিরতি
  let T = units.reduce((a, u) => a + natural(u), 0) + plan.scenes.length * OVER;
  let scenes = plan.scenes.map((s) => ({ ...s, units: [...s.units] }));
  if (T > target) {
    let acc = 0, kept = 0; const out: typeof scenes = [];
    outer: for (const sc of scenes) {
      const ks: Unit[] = []; acc += OVER;
      for (const u of sc.units) { const d = natural(u); if (acc + d > target && kept) break outer; acc += d; kept++; ks.push(u); }
      out.push({ ...sc, units: ks });
    }
    const cut = units.length - kept; scenes = out.filter((s) => s.units.length);
    notes.push(`গল্পটি প্রায় ${Math.round(T)} সেকেন্ডের, লক্ষ্য ${Math.round(target)} সেকেন্ড — শেষের ${cut}টি বাক্য বাদ গেছে।`);
    T = acc;
  }
  const k = Math.min(2.6, Math.max(1, (target - scenes.length * OVER) / Math.max(1, T - scenes.length * OVER)));
  // ৩) চরিত্র
  let m = newMovie(name); m = { ...m, music: o.music ? plan.mood : null, musicVol: o.music ? o.musicVol : undefined };
  const castOf = new Map<string, string>();
  for (const c of plan.chars) { const a = getAsset(c.role.asset); if (a?.rig === "human") { const id = uid(); m = { ...m, cast: [...m.cast, { id, assetId: c.role.asset, name: c.name }] }; if (c.role.look) m = setLook(m, id, c.role.look as any); castOf.set(c.id, id); } }
  // ৪) দৃশ্য
  let total = 0; let sIdx = 0;
  for (const sc of scenes) {
    stop(); prog(0.58 + 0.38 * (sIdx / scenes.length), `দৃশ্য ${sIdx + 1}/${scenes.length} সাজানো হচ্ছে`);
    let sid: string;
    if (sIdx === 0) { sid = m.scenes[0].id; m = updateScene(m, sid, (s) => ({ ...s, bg: sc.bg })); } else { m = addScene(m, m.scenes.length - 1, sc.bg); sid = m.scenes[m.scenes.length - 1].id; }
    sIdx++;
    const inScene: string[] = []; const rides = new Map<string, Ride>();
    for (const u of sc.units) { const ids = u.kind === "say" ? [u.who] : u.chars; for (const id of ids) if (!inScene.includes(id)) inScene.push(id); if (u.kind === "narr" && u.ride) for (const id of u.chars.slice(0, 1)) if (!rides.has(id)) rides.set(id, u.ride); }
    const xs = slots(inScene.length); const obj = new Map<string, string>(); const asset = new Map<string, string>(); const pos = new Map<string, number>();
    inScene.forEach((id, i) => {
      const c = chById.get(id) as Char; const rd = rides.get(id); const aid = rd ? RIDE_ASSET(rd, c.role.key) : c.role.asset; const a = getAsset(aid)!;
      const r = addObject(m, sid, aid, a.rig === "human" ? castOf.get(id) : undefined); m = r.movie; obj.set(id, r.objId); asset.set(id, aid); pos.set(id, rd ? Math.max(180, xs[i] - 300) : xs[i]);
      m = updateScene(m, sid, (s) => updateObj(s, r.objId, (ob) => ({ ...ob, flip: xs[i] > 640 && inScene.length > 1, keys: [{ ...ob.keys[0], x: rd ? Math.max(180, xs[i] - 300) : xs[i], y: 600 }] })));
      if (a.rig) m = updateScene(m, sid, (s) => updateObj(s, r.objId, (ob) => setView(ob, 0, "q_front")));
    });
    const ed = (id: string, fn: (ob: any) => any) => { m = updateScene(m, sid, (s) => updateObj(s, obj.get(id)!, fn)); };
    const idle = (t: number) => { for (const id of inScene) ed(id, (ob) => setAction(ob, t, "stand")); };
    let t = 0.4;
    for (const u of sc.units) {
      stop();
      if (u.kind === "say") {
        const v = voice.get(u); const dur = v ? v.dur : dialogueLength(u.text); const did = uid();
        for (const id of inScene) ed(id, (ob) => setAction(setView(ob, t, "q_front"), t, "stand"));
        m = updateScene(m, sid, (s) => addDialogue(s, obj.get(u.who)!, t, u.text, did));
        m = updateScene(m, sid, (s) => updateDialogue(s, did, { dur, voiceUri: v?.uri }));
        if (u.sfx && o.sfx) { const f = await o.sfx(u.sfx); if (f) m = updateScene(m, sid, (s) => addClip(s, { kind: "sfx", name: f.name, uri: f.uri, t, dur: f.dur, vol: 0.8 })); }
        t += dur + 0.5 * k; continue;
      }
      const v = voice.get(u); const dur = Math.max(natural(u), 2.4) * k;
      if (v) m = updateScene(m, sid, (s) => addClip(s, { kind: "voice", name: "বর্ণনা", uri: v.uri, t: t + 0.1, dur: v.dur, vol: 1 }));
      if (u.sfx && o.sfx) { const f = await o.sfx(u.sfx); if (f) m = updateScene(m, sid, (s) => addClip(s, { kind: "sfx", name: f.name, uri: f.uri, t, dur: f.dur, vol: 0.7 })); }
      const group = u.chars.filter((id) => obj.has(id));
      for (const id of inScene) if (!group.includes(id)) ed(id, (ob) => setAction(ob, t, "stand"));
      group.forEach((id, gi) => {
        const aid = asset.get(id)!; const x0 = pos.get(id) ?? 640; const riding = rides.has(id);
        let act: Action | undefined = u.action; if (u.action === "holdhand" && group.length < 2) act = "stand";
        if (riding || u.walk) {
          const dir = (gi % 2 === 0 ? 1 : -1) * (x0 > 800 ? -1 : 1); const x1 = Math.max(160, Math.min(1120, riding ? x0 + 560 : x0 + dir * 320)); const te = t + dur * 0.9;
          ed(id, (ob) => setKey(setAction(setView(setKey(ob, t, { x: x0, y: 600 }), t, "side"), t, okAct(aid, riding ? "walk" : u.action === "run" ? "run" : act === "holdhand" ? "holdhand" : "walk")), te, { x: x1, y: 600 }));
          pos.set(id, x1);
          ed(id, (ob) => setAction(setView(ob, te + 0.05, "q_front"), te + 0.05, "stand"));
        } else ed(id, (ob) => setAction(setView(ob, t, "q_front"), t, okAct(aid, act)));
      });
      t += dur;
    }
    idle(t);
    const end = Math.min(58, Math.ceil(t + 0.6)); total += end;
    m = updateScene(m, sid, (s) => ({ ...s, duration: end, fade: sIdx < scenes.length }));
  }
  prog(1, "প্রস্তুত");
  if (total < target * 0.8) notes.push(`গল্প ছোট হওয়ায় ভিডিও ${total} সেকেন্ডের হয়েছে (লক্ষ্য ${Math.round(target)})। আরও বাক্য, সংলাপ বা ঘটনা লিখলে লম্বা হবে।`);
  return { movie: m, seconds: total, notes, scenes: scenes.length, voiced };
}
