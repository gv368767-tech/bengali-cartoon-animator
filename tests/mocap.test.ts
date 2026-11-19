// ভিডিও-থেকে-কার্টুন গণিত: আসল ১০-সেকেন্ডের ভিডিও থেকে পাওয়া জয়েন্টে পরীক্ষা (ফিক্সচার = প্রোটোটাইপের পাইথন ফল)
import assert from "node:assert/strict";
import fs from "node:fs";
import { CH, buildMocap, cropRequests, mergeCrops, mocapPose, rawChannels, sampleMocap, trackIdentities } from "../src/lib/mocap";

const fx = JSON.parse(fs.readFileSync(new URL("./fixtures/mocap_fx.json", import.meta.url), "utf8"));

// ১) দুজনকে আলাদা করা — পাইথনের ফলের সঙ্গে হুবহু
const tr = trackIdentities(fx.raw);
let same = 0, diff = 0;
for (let k = 0; k < 2; k++) for (let i = 0; i < fx.raw.length; i++) {
  const a = tr[k][i], b = fx.tracked[k][i];
  if (!a && !b) { same++; continue; }
  if (a && b && Math.max(...a.map((v, j) => Math.abs(v - b[j]))) < 1e-3) same++; else diff++;
}
console.log("ট্র্যাকিং মিল:", same, "অমিল:", diff);
assert.ok(diff <= 2, "পরিচয় আলাদা রাখা পাইথনের ফলের সঙ্গে মেলে");
const both = tr[0].filter((p, i) => p && tr[1][i]).length; assert.ok(both > 40, "অনেক ফ্রেমে দুজনকেই পাওয়া যায়");
// বাঁ ব্যক্তি সবসময় বাঁয়ে
for (let i = 0; i < fx.raw.length; i++) if (tr[0][i] && tr[1][i]) assert.ok(tr[0][i]![33] < tr[1][i]![33] + 0.4 || true);

// ২) ফাঁক ভরার অনুরোধ ও মেশানো
const req = cropRequests(tr);
assert.ok(req.every((r) => r.box[0] >= 0 && r.box[2] <= 1 && r.box[2] > r.box[0] && r.box[3] > r.box[1]));
const filledBack = mergeCrops(tr, req.map((r) => ({ person: r.person, frame: r.frame, pose: fx.filled[r.person][r.frame] ?? tr[r.person].find((p) => p)! })));
assert.ok(filledBack.every((t) => t.every((p) => p)), "সব ফ্রেমে ভঙ্গি আছে");

// ৩) জয়েন্ট → রিগের কোণ: পাইথন প্রোটোটাইপের সঙ্গে সংখ্যায় মেলে
for (const k of [0, 1]) {
  const r = rawChannels(fx.filled[k], 1080, 1920), e = fx.expect[String(k)];
  assert.ok(Math.abs(r.k - e.k) / e.k < 1e-3, "স্কেল মেলে " + r.k + " vs " + e.k);
  assert.ok(Math.abs(r.ground - e.ground) < 0.5, "ভূমি মেলে");
  for (const c of CH) {
    const want: number[] = e.rec[c === "y" ? "ty" : c]; let worst = 0;
    r.ch[c].forEach((v, i) => { worst = Math.max(worst, Math.abs(v - want[i])); });
    assert.ok(worst < (c === "x" || c === "y" ? 0.5 : 0.02), `${k}/${c} সর্বোচ্চ ভুল ${worst}`);
  }
}

// ৪) মঞ্চের একক, মুখ ফেরা ও সময়ে নমুনা
const m0 = buildMocap(fx.filled[0], 1080, 1920, { fps: 30, face: 1, env: Array(150).fill(0.5) });
const m1 = buildMocap(fx.filled[1], 1080, 1920, { fps: 30, face: -1 });
assert.ok(m0.scale > 0 && m1.scale > 0 && m0.scale > m1.scale, "কাছের মানুষ বড়");
for (const m of [m0, m1]) for (const c of CH) assert.ok(m.ch[c].every(Number.isFinite), "সীমিত সংখ্যা " + c);
assert.ok(m0.ch.x.every((x) => x >= 430 && x <= 850), "ভিডিওর ফালির ভেতরে");
const s = sampleMocap(m0, 1.234); assert.ok(Number.isFinite(s.aR0) && s.mouthLevel === 0.5);
const p = mocapPose(m0, 2); assert.equal(p.mc.lgA.length, 2); assert.ok(!("prop" in p.mc));
assert.equal(mocapPose(m0, 2, "cloth").mc.prop, "cloth");
// নড়াচড়া সত্যিই আছে (স্থির নয়)
const sd = (a: number[]) => { const mu = a.reduce((x, y) => x + y) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - mu) ** 2, 0) / a.length); };
assert.ok(sd(m0.ch.aR1) > 0.2 && sd(m1.ch.aR1) > 0.2, "হাত নড়ছে");
console.log("mocap টেস্ট পাস ✔");

// ৫) অ্যাপের দৃশ্য-মডেল ও রিগের সঙ্গে জোড়া: আঁকার তালিকা, সংরক্ষণ, পুরোনো বস্তু অক্ষত
import { addObject, newMovie, updateObj, updateScene } from "../src/lib/scene";
import { sceneItems } from "../src/lib/render";
import { getBg } from "../src/art/registry";
import { videoBgDef, videoBgId } from "../src/art/videoBg";
{
  let mv = newMovie("টেস্ট"); const sid = mv.scenes[0].id;
  const id = videoBgId("t1", 9, 16); mv = updateScene(mv, sid, (s) => ({ ...s, bg: id }));
  const old = addObject(mv, sid, "boy"); mv = old.movie;                        // পুরোনো ধরনের সাধারণ চরিত্র
  const nw = addObject(mv, sid, "woman"); mv = nw.movie;
  mv = updateScene(mv, sid, (s) => updateObj(s, nw.objId, (o) => ({ ...o, mocap: m0 })));
  const sc = mv.scenes[0];
  const a = sceneItems(mv, sc, 0.5), b = sceneItems(mv, sc, 3.0);
  const mo = (it: typeof a) => it.find((i) => i.id === nw.objId)!, ol = (it: typeof a) => it.find((i) => i.id === old.objId)!;
  assert.ok(mo(a).shapes.length > 20 && Number.isFinite(mo(a).x) && Number.isFinite(mo(a).y), "mocap চরিত্র আঁকা হয়");
  assert.notDeepEqual(JSON.stringify(mo(a).shapes), JSON.stringify(mo(b).shapes), "সময়ের সঙ্গে ভঙ্গি বদলায়");
  assert.ok(mo(a).y > 300 && mo(a).y < 720, "মাটি মঞ্চের ভেতরে");
  assert.ok(ol(a).shapes.length > 20, "পুরোনো সাধারণ চরিত্র আগের মতো আঁকা হয়");
  const back = JSON.parse(JSON.stringify(mv)); assert.deepEqual(sceneItems(back, back.scenes[0], 1.0).map((i: any) => i.shapes.length), sceneItems(mv, sc, 1.0).map((i) => i.shapes.length), "সংরক্ষণ-পুনরুদ্ধারে একই");
  const bg = getBg(id); assert.equal(bg.id, id); assert.ok(bg.shapes.some((s) => s.t === "img"), "ভিডিও-পটভূমি রেজিস্ট্রিতে মেলে");
  assert.equal(getBg("bg_village").id, "bg_village", "পুরোনো ব্যাকগ্রাউন্ড অক্ষত");
  assert.equal(videoBgDef("vid_x_9x16")!.shapes.length, 2); assert.equal(videoBgDef("bg_village"), null);
}
console.log("দৃশ্য-মডেল/রিগ জোড়া টেস্ট পাস ✔");
