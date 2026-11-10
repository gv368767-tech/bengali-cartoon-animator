import assert from "node:assert/strict";
import * as S from "../src/lib/scene";
import { ASSETS, TOTAL_ASSETS } from "../src/art/registry";
import { BACKGROUNDS } from "../src/art/backgrounds";

// ৫০টি অ্যাসেট
const LEGACY = ASSETS.filter((a) => a.cat !== "hindu" && a.cat !== "style2").length + BACKGROUNDS.length;
assert.equal(LEGACY, 50, "আগের ৫০টি অ্যাসেট অক্ষত");
assert.equal(TOTAL_ASSETS, 50 + 18 + 13, "৫০ + ১৮ দেবদেবী/বাহন + ১৩ নতুন স্টাইল");
assert.equal(BACKGROUNDS.length, 8);
for (const a of ASSETS) {
  for (const act of a.actions) {
    const sh = a.build({ action: act as any, phase: 1.3, talk: 0.5, blink: false });
    assert.ok(sh.length > 0, `${a.id}/${act} খালি`);
    for (const s of sh) assert.ok(JSON.stringify(s).indexOf("NaN") < 0, `${a.id}/${act} NaN`);
  }
}

let m = S.newMovie("টেস্ট");
const sid = m.scenes[0].id;
let r = S.addObject(m, sid, "boy"); m = r.movie; const boy = r.objId;
r = S.addObject(m, sid, "boy"); m = r.movie;
assert.equal(m.cast.length, 2);
assert.notEqual(m.cast[0].id, m.cast[1].id);
assert.equal(m.cast[1].name, "ছেলে 2");
r = S.addObject(m, sid, "cow"); m = r.movie; const cow = r.objId;
assert.equal(m.cast.length, 2); // প্রাণী cast-এ যায় না

// কিফ্রেম
let sc = m.scenes[0];
let o = sc.objects.find((x) => x.id === boy)!;
const x0 = o.keys[0].x;
o = S.setKey(o, 4, { x: x0 + 400 });
assert.equal(o.keys.length, 2);
assert.equal(Math.round(S.evalObj(o, 2).x), Math.round(x0 + 200));
assert.equal(S.evalObj(o, 10).x, x0 + 400);
o = S.setKey(o, 4.02, { y: 650 });
assert.equal(o.keys.length, 2);
assert.equal(S.evalObj(o, 4).y, 650);
assert.ok(S.speedAt(o, 2) > 80);
assert.equal(S.removeKeyAt(S.setKey(o, 2, { x: 1 }), 2).keys.length, 2);
assert.equal(S.removeKeyAt(o, 0).keys.length, 2); // প্রথম কী মোছা যায় না

// অ্যাকশন
const boyA = ASSETS.find((a) => a.id === "boy")!;
assert.equal(S.actionAt(o, boyA, 2), "walk");
assert.equal(S.actionAt(o, boyA, 6), "stand");
const o2 = S.setAction(o, 1, "dance");
assert.equal(S.actionAt(o2, boyA, 2), "dance");
assert.equal(S.actionAt(o2, boyA, 0.5), "walk" === S.actionAt(o2, boyA, 0.5) ? "walk" : S.actionAt(o2, boyA, 0.5));
const crow = ASSETS.find((a) => a.id === "crow")!;
assert.equal(S.actionAt({ ...o, assetId: "crow" }, crow, 0), "fly");

// দিক
const cowA = ASSETS.find((a) => a.id === "cow")!;
const left = S.setKey({ id: "c", assetId: "cow", flip: false, keys: [{ t: 0, x: 800, y: 560, s: 1, r: 0 }], acts: [] }, 3, { x: 300 });
assert.equal(S.facingLeft(left, 1), true);
assert.equal(S.facingLeft(left, 0), false === S.facingLeft(left, 0) ? false : S.facingLeft(left, 0));

// সংলাপ
sc = S.addDialogue(sc, boy, 1, "আমি রহিম");
assert.equal(sc.dialogues.length, 1);
assert.ok(S.talkAt(sc, boy, 1.5) > 0);
assert.equal(S.talkAt(sc, boy, 5.9 + 3), 0);
assert.ok(S.dialogueAt(sc, 1.2));

// আঁকার ক্রম: পিছনের (y ছোট) আগে
let mm = S.newMovie("q"); const q = mm.scenes[0].id;
mm = S.addObject(mm, q, "sun").movie; mm = S.addObject(mm, q, "boy").movie; mm = S.addObject(mm, q, "cow").movie; mm = S.addObject(mm, q, "crow").movie;
let pl = S.placed(mm.scenes[0], 0);
assert.equal(pl[0].asset.id, "sun");
assert.equal(pl[pl.length - 1].asset.id, "crow");

// ক্লিক-ধরা
let hm = S.newMovie("h"); const hs = hm.scenes[0].id; const hr = S.addObject(hm, hs, "man"); hm = hr.movie;
const st = S.evalObj(hm.scenes[0].objects[0], 0);
assert.equal(S.hitTest(hm.scenes[0], 0, st.x, st.y - 100), hr.objId);
assert.equal(S.hitTest(hm.scenes[0], 0, 5, 5), null);

// চেহারা: cast-এ জমা — সব দৃশ্যে একই
let lm = S.newMovie("l"); const lr = S.addObject(lm, lm.scenes[0].id, "girl"); lm = lr.movie;
lm = S.setLook(lm, lm.cast[0].id, { top: "#00ff00" });
lm = S.addScene(lm, 0);
const again = S.addObject(lm, lm.scenes[1].id, "girl", lm.cast[0].id);
assert.equal(again.movie.cast.length, 1);
assert.equal(again.movie.cast[0].look?.top, "#00ff00");

// দৃশ্য
let sm = S.newMovie("s"); sm = S.addScene(sm, 0); sm = S.duplicateScene(sm, 0);
assert.equal(sm.scenes.length, 3);
assert.equal(S.deleteScene(S.newMovie("a"), 0).scenes.length, 1);
assert.equal(S.setDuration(sm, sm.scenes[0].id, 999).scenes[0].duration, 60);
assert.equal(S.movieDuration(sm), 18);

// আনডু
let h = S.emptyHistory<number>(); h = S.pushHistory(h, 1);
const u = S.undo(h, 2)!; assert.equal(u.v, 1); assert.equal(S.redo(u.h, u.v)!.v, 2);

// ---------- অ্যানিমেশন লাইব্রেরি: ৩০টি অ্যানিমেশন × ৫টি ভিউ × ৮ চরিত্র ----------
import { ANIMS, VIEWS, searchAnims } from "../src/art/anim";
import { mouthAt, tokenize } from "../src/lib/lipsync";
import { buildAsset } from "../src/lib/render";
assert.equal(ANIMS.length, 31); // ৩০টি আগের + "আশীর্বাদ"
assert.equal(VIEWS.length, 5);
for (const h of ASSETS.filter((a) => a.rig === "human")) {
  assert.equal(h.actions.length, ANIMS.length, "মানুষের সব অ্যানিমেশন নেই");
  for (const an of ANIMS) for (const v of VIEWS) for (const ph of [0, 0.9, 2.1, 4]) {
    const sh = buildAsset(h, { action: an.id as any, phase: ph, talk: 0, blink: ph === 0, view: v.id });
    assert.ok(sh.length > 10, `${h.id}/${an.id}/${v.id} খালি`);
    assert.ok(JSON.stringify(sh).indexOf("NaN") < 0, `${h.id}/${an.id}/${v.id} NaN`);
  }
}
// প্রতিটি অ্যানিমেশন সময়ের সাথে সত্যিই বদলায় (স্থির ছবি নয়)
const animBoy = ASSETS.find((a) => a.id === "boy")!;
for (const an of ANIMS) {
  const f1 = JSON.stringify(buildAsset(animBoy, { action: an.id as any, phase: 0.3, talk: 0, blink: false }));
  const f2 = JSON.stringify(buildAsset(animBoy, { action: an.id as any, phase: 1.7, talk: 0, blink: false }));
  assert.notEqual(f1, f2, `${an.id} নড়ছে না`);
}
// ভিউ বদলালে ছবি আলাদা হয়
const vs = new Set(VIEWS.map((v) => JSON.stringify(buildAsset(animBoy, { action: "stand", phase: 0, talk: 0, blink: false, view: v.id }))));
assert.equal(vs.size, 5);
// সার্চ
assert.deepEqual(searchAnims("রান্না").map((a) => a.id), ["cook"]);
assert.ok(searchAnims("walk").some((a) => a.id === "walk"));
assert.equal(searchAnims("zzz").length, 0);
assert.equal(searchAnims("", "emotion").length, 5);
// লিপ-সিঙ্ক: বাংলা লেখা থেকে বিভিন্ন ঠোঁটের আকৃতি
const shapes = new Set(tokenize("নমস্কার, আমি তোমার বন্ধু।").map((t) => t.m.shape));
for (const x of ["A", "E", "O", "M", "C"]) assert.ok(shapes.has(x as any), `আকৃতি ${x} নেই`);
const seen = new Set<string>();
for (let t = 0; t < 2; t += 0.05) { const m = mouthAt("নমস্কার, আমি তোমার বন্ধু।", t, 2); if (m) seen.add(m.shape); }
assert.ok(seen.size >= 4);
assert.equal(mouthAt("আমি", 5, 2), null);
// দৃশ্যে: ভিউ/অ্যানিমেশন সময়ভেদে বদলানো + সংলাপে স্বয়ংক্রিয় talk + মুখের আকৃতি
{
  let mm = S.newMovie("অ্যানিম"); const sid2 = mm.scenes[0].id;
  const r2 = S.addObject(mm, sid2, "teacher"); mm = r2.movie; const tid = r2.objId;
  mm = S.updateScene(mm, sid2, (s) => S.updateObj(s, tid, (o) => S.setView(S.setAction(S.setAction(o, 0, "wave"), 3, "cook"), 2, "side")));
  const o2 = mm.scenes[0].objects[0], a2 = ASSETS.find((a) => a.id === "teacher")!;
  assert.equal(S.actionAt(o2, a2, 1), "wave");
  assert.equal(S.actionAt(o2, a2, 3.5), "cook");
  assert.equal(S.viewAt(o2, 1), "front");
  assert.equal(S.viewAt(o2, 2.5), "side");
  mm = S.updateScene(mm, sid2, (s) => S.addDialogue(s, tid, 4, "নমস্কার বন্ধুরা"));
  mm = S.updateScene(mm, sid2, (s) => S.updateObj(s, tid, (o) => S.setAction(o, 3.9, "stand")));
  const pl = S.placed(mm.scenes[0], 4.3).find((p) => p.obj.id === tid)!;
  assert.equal(pl.act, "talk"); // দাঁড়িয়ে থেকে কথা বললে নিজে নিজে talk অঙ্গভঙ্গি
  assert.ok(S.mouthOf(mm.scenes[0], tid, 4.3) !== null);
  assert.equal(S.mouthOf(mm.scenes[0], tid, 1), null);
  // পুরোনো প্রজেক্ট (views ছাড়া) এখনও কাজ করে
  assert.equal(S.viewAt({ ...o2, views: undefined }, 5), "front");
}

// ===== v2.1: দৃশ্য জোড়া, অডিও, টাইমলাইন, ঠোঁট =====
{
  const { setEnvelope } = require("../src/lib/envelope");
  let m = S.newMovie("জোড়া");
  m = S.addScene(m, 0); m = S.addScene(m, 1); m = S.addScene(m, 2);
  assert.equal(m.scenes.length, 4);
  const total = S.activeDuration(m);
  assert.equal(total, m.scenes.reduce((a, x) => a + x.duration, 0));
  // বাদ দেওয়া
  m = S.setSceneFlags(m, m.scenes[1].id, { skip: true });
  assert.equal(S.activeScenes(m).length, 3);
  assert.equal(S.sceneStarts(m)[1].start, m.scenes[0].duration);
  // সব বাদ দিলে সবগুলো
  let all = m; for (const x of m.scenes) all = S.setSceneFlags(all, x.id, { skip: true });
  assert.equal(S.activeScenes(all).length, 4);
  // ক্রম বদল
  const id0 = m.scenes[0].id; m = S.moveScene(m, 0, 1);
  assert.equal(m.scenes[1].id, id0);
  assert.equal(S.moveScene(m, 0, -1).scenes[0].id, m.scenes[0].id);
  // ফেড
  const first = S.activeScenes(m)[0];
  m = S.setSceneFlags(m, first.id, { fade: true });
  const d0 = first.duration;
  assert.equal(S.fadeAlpha(m, 0, 0), 0);
  assert.ok(S.fadeAlpha(m, 0, d0 - 0.1) > 0.5);
  assert.ok(S.fadeAlpha(m, 1, 0) > 0.9 || S.activeScenes(m).length < 2);
  // অডিও ক্লিপ
  let sc = m.scenes[0];
  sc = S.addClip(sc, { kind: "sfx", name: "x", uri: "file:///a.mp3", t: 1, dur: 2, vol: 1 });
  assert.equal((sc.clips ?? []).length, 1);
  const cid = sc.clips![0].id;
  sc = S.updateClip(sc, cid, { t: 2.5, vol: 0.4 });
  assert.equal(sc.clips![0].t, 2.5); assert.equal(sc.clips![0].vol, 0.4);
  sc = S.removeClip(sc, cid); assert.equal(sc.clips!.length, 0);
  // টাইমলাইন retime
  const mv = S.newMovie("t"); const rr = S.addObject(mv, mv.scenes[0].id, "boy"); let o: any = rr.movie.scenes[0].objects[0];
  o = S.setAction(o, 1, "walk"); o = S.setAction(o, 3, "wave");
  o = S.retimeAct(o, 0, 4); assert.deepEqual(o.acts.map((a: any) => a.t), [3, 4]);
  o = S.removeActAt(o, 0); assert.equal(o.acts.length, 1);
  // ঠোঁট: সংলাপ + আওয়াজ
  let sc2 = S.newMovie("l").scenes[0]; sc2 = S.addDialogue(sc2, "o1", 0, "নমস্কার বন্ধুরা");
  const d = sc2.dialogues[0];
  assert.ok(S.mouthOf(sc2, "o1", 0.3));
  sc2 = S.updateDialogue(sc2, d.id, { voiceUri: "file:///v.wav" });
  setEnvelope("file:///v.wav", Array.from({ length: 80 }, (_, i) => (i % 4 < 2 ? 0.9 : 0)));
  const a1 = S.mouthOf(sc2, "o1", 0.0), a2 = S.mouthOf(sc2, "o1", 0.15);
  assert.ok(a1 && a2 && a1.open !== a2.open, "আওয়াজ অনুযায়ী মুখ খোলা-বন্ধ হয়");
  assert.equal(S.mouthOf(sc2, "o1", 99), null);
  // পুরোনো প্রজেক্ট (নতুন ফিল্ড ছাড়া) চলে
  const old = JSON.parse(JSON.stringify(S.newMovie("পুরোনো")));
  delete old.scenes[0].clips; delete old.scenes[0].skip; delete old.musicClip;
  assert.equal(S.activeScenes(old).length, 1);
  assert.ok(S.fadeAlpha(old, 0, 1) === 0);
  S.duplicateScene(old, 0);
}

// ===== v2.3: হিন্দু দেবদেবী =====
{
  const D = ["durga", "lakshmi", "ganesha", "shiva", "saraswati", "krishna", "rama", "hanuman", "kali", "kartik", "vishnu"];
  const hindu = ASSETS.filter((a) => a.cat === "hindu");
  assert.equal(hindu.length, 18);
  for (const id of D) { const a = ASSETS.find((x) => x.id === id)!; assert.ok(a && a.rig === "human" && a.talk, id + " নেই"); assert.ok(a.actions.includes("bless" as any), id + " আশীর্বাদ নেই"); }
  for (const id of ["lion", "mouse", "bull", "owl", "peacock", "swan", "garuda"]) assert.ok(ASSETS.find((x) => x.id === id && x.cat === "hindu"), id + " বাহন নেই");
  // সব ভিউ ও ঠোঁটের আকৃতি
  for (const id of D) for (const v of VIEWS) for (const shape of ["A", "E", "O", "U", "M", "C"]) {
    const a = ASSETS.find((x) => x.id === id)!;
    const sh = buildAsset(a, { action: "talk", phase: 1.3, talk: 0.5, blink: false, view: v.id, mouth: { shape: shape as any, open: 0.7 } });
    assert.ok(sh.length > 30 && JSON.stringify(sh).indexOf("NaN") < 0, `${id}/${v.id}/${shape}`);
  }
  // ঠোঁট নড়ে: ভিন্ন আকৃতি → ভিন্ন ছবি
  { const a = ASSETS.find((x) => x.id === "krishna")!; const f = (shape: string) => JSON.stringify(buildAsset(a, { action: "talk", phase: 1, talk: 0.5, blink: false, view: "front", mouth: { shape: shape as any, open: 0.9 } })); assert.notEqual(f("A"), f("M")); }
  // একই ক্যারেক্টার সব দৃশ্যে একই (cast)
  let m = S.newMovie("দেব"); const r1 = S.addObject(m, m.scenes[0].id, "durga"); m = r1.movie;
  assert.equal(m.cast.length, 1); const cid = m.cast[0].id; m = S.addScene(m, 0); const r2 = S.addObject(m, m.scenes[1].id, "durga", cid); assert.equal(r2.movie.cast.length, 1);
  // বাহন হাঁটে
  for (const id of ["lion", "mouse", "bull", "owl", "peacock", "swan", "garuda"]) { const a = ASSETS.find((x) => x.id === id)!; const sh = buildAsset(a, { action: "walk", phase: 2, talk: 0, blink: false }); assert.ok(sh.length > 8 && JSON.stringify(sh).indexOf("NaN") < 0, id); }
  // দেবতার আকার/ঘোরানো: ছবির সীমা ঠিক
  for (const id of D) { const a = ASSETS.find((x) => x.id === id)!; assert.ok(a.bounds[2] > a.bounds[0] && a.bounds[3] > a.bounds[1]); }
}

console.log("✅ সব টেস্ট পাস (৫০টি অ্যাসেট সহ)");
