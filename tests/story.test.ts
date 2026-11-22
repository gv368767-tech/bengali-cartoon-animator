import assert from "node:assert/strict";
import { planStory } from "../src/lib/storyPlan";
import { buildStoryMovie } from "../src/lib/storyBuild";
import { placed, activeDuration, dialogueAt } from "../src/lib/scene";
import { sceneItems } from "../src/lib/render";
import { getAsset, getBg } from "../src/art/registry";

const S = `একদিন রাহুল নামের একটি ছেলে গ্রামের মাঠে সাইকেল চালিয়ে ঘুরছিল। হঠাৎ মিতা নামের একটি মেয়ে দৌড়ে এল। মিতা বলল, “দাদা, মা তোমাকে ডাকছে!”
“আমি আসছি,” রাহুল বলল। তারপর দুজনে নদীর ঘাটে গিয়ে বসল। বৃদ্ধ দাদু সেখানে গান গাইছিলেন। সবাই হাততালি দিল।
এরপর তারা মন্দিরে গিয়ে ঠাকুরকে প্রণাম করল। পুরোহিত আশীর্বাদ করলেন। সন্ধ্যায় সবাই বাজারে গিয়ে ফল কিনল। ফলওয়ালা বলল, "নিন, তাজা আম!"`;
const p = planStory(S);
assert.equal(p.chars[0].name, "রাহুল"); assert.equal(p.chars[1].name, "মিতা"); assert.equal(p.chars[1].role.asset, "girl");
const says = p.scenes.flatMap((s) => s.units).filter((u) => u.kind === "say") as any[];
assert.equal(says.length, 3); assert.equal(says[0].who, p.chars[1].id, "মিতা বলল"); assert.equal(says[1].who, p.chars[0].id, "রাহুল বলল");
assert.deepEqual(p.scenes.map((s) => s.bg), ["bg_field", "bg_ghat", "bg_temple", "bg_bazaar"]);
assert.ok(p.chars.some((c) => c.role.asset === "elder") && p.chars.some((c) => c.role.asset === "priest") && p.chars.some((c) => c.role.asset === "fruit_seller"));
// ইংরেজি
const e = planStory(`A boy named Tom went to the park. He sat on a bench. "Hello!" said the girl. A dog ran in the field.`);
assert.ok(e.chars.length >= 2 && e.scenes[0].bg === "bg_park");
// খালি/অর্থহীন
assert.throws(() => planStory("   "));

(async () => {
  for (const sec of [60, 180, 300]) {
    const r = await buildStoryMovie(p, "টেস্ট", { seconds: sec, music: true, musicVol: 0.3, narrate: true, voices: true, makeVoice: async (t: string) => ({ uri: "file:///x.wav", dur: Math.max(0.8, t.length * 0.07) }), sfx: async () => ({ uri: "file:///s.wav", dur: 0.5, name: "sfx" }) });
    const dur = activeDuration(r.movie);
    assert.equal(dur, r.seconds); assert.ok(dur <= sec + 3 && dur > 20, `dur ${dur} for ${sec}`);
    assert.equal(r.movie.music, "happy"); assert.equal(r.movie.scenes.length, 4);
    for (const sc of r.movie.scenes) { assert.ok(sc.duration <= 60 && getBg(sc.bg)); assert.ok(sc.objects.length > 0); for (const o of sc.objects) assert.ok(getAsset(o.assetId));
      for (let t = 0; t < sc.duration; t += 0.7) { const it = sceneItems(r.movie, sc, t); assert.ok(it.length === sc.objects.length && it.every((i) => i.shapes.length > 0 && Number.isFinite(i.x))); } }
    // একই চরিত্র সব দৃশ্যে এক (cast একটাই)
    const castIds = new Set(r.movie.scenes.flatMap((s) => s.objects.map((o) => o.castId).filter(Boolean)));
    assert.ok(castIds.size <= r.movie.cast.length);
    console.log(`গল্প→ভিডিও ${sec}s: ${dur}s, ${r.scenes} দৃশ্য, নোট:`, r.notes);
  }
  const mute = await buildStoryMovie(p, "x", { seconds: 60, music: false, musicVol: 0, narrate: false, voices: false });
  assert.equal(mute.movie.music, null);
  // বড় গল্প ৫ মিনিটে ছাঁটা
  const long = planStory(Array(40).fill(S).join("\n"));
  const lr = await buildStoryMovie(long, "l", { seconds: 300, music: true, musicVol: 0.3, narrate: true, voices: true, makeVoice: async (t: string) => ({ uri: "f", dur: t.length * 0.07 }) });
  assert.ok(lr.seconds <= 305, "৫ মিনিটের বেশি নয়: " + lr.seconds); assert.ok(lr.notes.some((n) => n.includes("বাদ")));
  console.log("✅ Story Maker টেস্ট পাস; দীর্ঘ গল্প:", lr.seconds, "s");
})();

// ---------- পটভূমি জুম ----------
import { clampView, zoomShapes, viewKey, isDefaultView, zoomStep, panStep, DEFAULT_VIEW } from "../src/lib/bgZoom";
import { shapesToSvg } from "../src/art/svg";
{
  const v = clampView({ z: 9, x: 99999, y: -99999 }); assert.equal(v.z, 3); assert.equal(v.x, 1280); assert.equal(v.y, -720);
  assert.equal(clampView({ z: 0.2, x: 50, y: 50 }).z, 1); assert.deepEqual(clampView({ z: 1, x: 50, y: 50 }), DEFAULT_VIEW, "জুম ১ হলে সরানো যায় না");
  assert.ok(isDefaultView(DEFAULT_VIEW)); assert.equal(viewKey("bg_x", DEFAULT_VIEW), "bg_x"); assert.notEqual(viewKey("bg_x", { z: 2, x: 0, y: 0 }), "bg_x");
  assert.deepEqual(zoomStep(DEFAULT_VIEW, -0.25), DEFAULT_VIEW, "১×-এর নিচে নামে না");
  const p = panStep(zoomStep(DEFAULT_VIEW, 1), 60, 0); assert.equal(p.z, 2); assert.equal(p.x, 60);
  // সব পটভূমিতে ২× জুম: আকার বদলে ফাটে না, সব আকার থাকে, সংখ্যা সসীম
  for (const b of (await_bgs())) {
    const z = zoomShapes(b.shapes, { z: 2, x: 100, y: -50 }); assert.equal(z.length, b.shapes.length);
    const svg = shapesToSvg(z).body; assert.ok(!/NaN|undefined|Infinity/.test(svg), b.id + " জুমে NaN");
  }
  // কেন্দ্র স্থির: ২× জুমে (640,360) বিন্দু (640,360)-এই থাকে
  const dot = zoomShapes([{ t: "circle", x: 640, y: 360, r: 10, fill: "#f00" }], { z: 2, x: 0, y: 0 })[0] as any; assert.equal(dot.x, 640); assert.equal(dot.y, 360); assert.equal(dot.r, 20);
  const pth = zoomShapes([{ t: "path", d: "M 0 0 L 10 0 Q 20 20 30 0 A 5 5 0 0 1 40 0 z", fill: "#000" } as any], { z: 2, x: 0, y: 0 })[0] as any; assert.ok(pth.d.startsWith("M -640 -360"), pth.d);
  console.log("✅ পটভূমি জুম টেস্ট পাস");
}
function await_bgs() { return require("../src/art/backgrounds").BACKGROUNDS as { id: string; shapes: any[] }[]; }

// গণেশের জন্মকথা (পর্ব ১): বক্তা ঠিক বসছে কি
import { readFileSync } from "node:fs";
{
  const gp = planStory(readFileSync(__dirname + "/fixtures/ganesh1.txt", "utf8"));
  const nm = Object.fromEntries(gp.chars.map((c) => [c.id, c.name]));
  const who = gp.scenes.flatMap((s) => s.units).filter((u) => u.kind === "say").map((u: any) => nm[u.who]);
  assert.deepEqual(who, ["দুর্গা", "গণেশ", "দুর্গা", "গণেশ", "গণেশ", "শিব", "গণেশ", "দুর্গা", "শিব", "শিব"]);
  assert.deepEqual(gp.chars.map((c) => c.role.asset), ["shiva", "durga", "ganesha", "elephant"]);
  console.log("✅ গণেশ পর্ব ১ বক্তা-মিল পাস");
}

// ---------- ছবি-চরিত্র ----------
import { readFileSync as rf } from "node:fs";
import { splitPersons, transparentFraction } from "../src/lib/photoSplit";
import { photoMotion } from "../src/art/photoChar";
import { styledAsset } from "../src/lib/storyBuild";
{
  const al = rf(__dirname + "/fixtures/photo_alpha_418x235.bin"); const bx = splitPersons(al, 418, 235);
  assert.equal(bx.length, 2, "ছবিতে ২ চরিত্র"); assert.ok(bx[0].x < bx[1].x && bx[0].x + bx[0].w < bx[1].x, "আলাদা");
  assert.ok(Math.abs(bx[0].x - 28) <= 3 && Math.abs(bx[1].x - 214) <= 3, JSON.stringify(bx)); assert.ok(transparentFraction(al) > 0.4);
  assert.equal(splitPersons(new Uint8Array(100 * 100).fill(255), 100, 100).length, 1, "পুরো-ঢাকা ছবি = ১ চরিত্র");
  assert.equal(transparentFraction(new Uint8Array(100).fill(255)), 0);
  const ub = getAsset("ub_boy")!; assert.ok(ub.atlasKey === "ub_boy" && ub.actions.includes("talk"));
  for (const act of ["stand", "talk", "walk", "run", "jump", "dance", "laugh", "cry", "angry"]) for (let t = 0; t < 6; t += 0.4) { const sh = ub.build({ action: act as any, phase: t, talk: 0.5, blink: false }); assert.equal(sh.length, 1); assert.ok(sh[0].t === "img" && Number.isFinite((sh[0] as any).f)); const m = photoMotion({ action: act as any, phase: t, talk: 0, blink: false }); assert.ok(Math.abs(m.y) < 80 && Math.abs(m.r) < 6); }
  assert.equal(styledAsset("boy", "photo"), "ub_boy"); assert.equal(styledAsset("man", "pro"), "p_man"); assert.equal(styledAsset("woman", "photo"), "woman"); assert.equal(styledAsset("boy"), "boy");
  const gp2 = planStory("রাহুল নামের একটি ছেলে আর রবি নামের একজন পুরুষ কথা বলল। “কেমন আছো?” রাহুল বলল।");
  const r2 = await_build(gp2); console.log("✅ ছবি-চরিত্র টেস্ট পাস");
  function await_build(pl: any) { return buildStoryMovie(pl, "x", { seconds: 60, music: false, musicVol: 0, narrate: false, voices: false, style: "photo" }).then((r) => { const ids = r.movie.scenes.flatMap((s) => s.objects.map((o) => o.assetId)); assert.ok(ids.includes("ub_boy") && ids.includes("ub_man"), ids.join()); const sc = r.movie.scenes[0]; for (let t = 0; t < sc.duration; t += 1) assert.ok(sceneItems(r.movie, sc, t).every((i) => i.shapes.length > 0)); console.log("✅ ছবি-স্টাইলে গল্প→ভিডিও পাস", ids); }); }
}
