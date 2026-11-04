import assert from "node:assert/strict";
import * as M from "../src/lib/model";

let p = M.newProject("টেস্ট", 12);
const L = p.layers[0].id;
assert.equal(p.frames.length, 1);

// stroke যোগ
const s: M.Stroke = { tool: "brush", color: "#000", size: 8, pts: [0, 0, 10, 10] };
p = M.addStroke(p, 0, L, s);
assert.equal(p.frames[0].strokes[L].length, 1);
assert.ok(M.frameHasContent(p.frames[0]));

// ফ্রেম যোগ / ডুপ্লিকেট / পেস্ট
p = M.addFrame(p, 0);
assert.equal(p.frames.length, 2);
assert.ok(!M.frameHasContent(p.frames[1]));
p = M.duplicateFrame(p, 0);
assert.equal(p.frames.length, 3);
assert.ok(M.frameHasContent(p.frames[1]));
assert.notEqual(p.frames[0].id, p.frames[1].id);
p = M.pasteFrame(p, 2, p.frames[0]);
assert.equal(p.frames.length, 4);
assert.ok(M.frameHasContent(p.frames[3]));

// ডুপ্লিকেটে আঁকলে অরিজিনাল অপরিবর্তিত
const before = p.frames[0].strokes[L].length;
p = M.addStroke(p, 1, L, s);
assert.equal(p.frames[0].strokes[L].length, before);
assert.equal(p.frames[1].strokes[L].length, before + 1);

// ডিলিট
p = M.deleteFrame(p, 3);
assert.equal(p.frames.length, 3);
let single = M.newProject("x", 12);
single = M.addStroke(single, 0, single.layers[0].id, s);
single = M.deleteFrame(single, 0);
assert.equal(single.frames.length, 1);
assert.ok(!M.frameHasContent(single.frames[0]));

// লেয়ার
p = M.addLayer(p);
assert.equal(p.layers.length, 2);
const L2 = p.layers[1].id;
p = M.addStroke(p, 0, L2, s);
p = M.moveLayer(p, L2, -1);
assert.equal(p.layers[0].id, L2);
p = M.toggleLayer(p, L2);
assert.equal(p.layers[0].visible, false);
p = M.removeLayer(p, L2);
assert.equal(p.layers.length, 1);
assert.equal(p.frames[0].strokes[L2], undefined);
assert.equal(M.removeLayer(p, p.layers[0].id).layers.length, 1); // শেষ লেয়ার মোছা যায় না
for (let i = 0; i < 10; i++) p = M.addLayer(p);
assert.equal(p.layers.length, M.MAX_LAYERS);

// FPS
assert.equal(M.setFps(p, 100).fps, 30);
assert.equal(M.setFps(p, 0).fps, 1);

// অনিয়ন
assert.deepEqual(M.onionIndices(0, 5, 2, 1), { before: [], after: [1] });
assert.deepEqual(M.onionIndices(3, 5, 2, 2), { before: [2, 1], after: [4] });

// undo/redo
let h = M.emptyHistory;
const a = M.newProject("a", 12);
const b = M.addFrame(a, 0);
h = M.pushHistory(h, a);
const u = M.undo(h, b)!;
assert.equal(u.p.frames.length, 1);
const r = M.redo(u.h, u.p)!;
assert.equal(r.p.frames.length, 2);
assert.equal(M.undo(M.emptyHistory, a), null);

// পয়েন্ট ফিল্টার
const pts: number[] = [];
assert.ok(M.simplifyPoint(pts, 5, 5));
assert.ok(!M.simplifyPoint(pts, 5.2, 5.2));
assert.ok(M.simplifyPoint(pts, 9, 9));
assert.deepEqual(pts, [5, 5, 9, 9]);

console.log("✅ সব মডেল টেস্ট পাস");
