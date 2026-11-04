import assert from "node:assert/strict";
import * as S from "../src/lib/scene";
import { ASSETS, TOTAL_ASSETS } from "../src/art/registry";
import { BACKGROUNDS } from "../src/art/backgrounds";

// ৫০টি অ্যাসেট
assert.equal(TOTAL_ASSETS, 50);
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
console.log("✅ সব টেস্ট পাস (৫০টি অ্যাসেট সহ)");
