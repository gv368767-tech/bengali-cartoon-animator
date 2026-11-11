// Windows ডেস্কটপ সংস্করণ — অ্যান্ড্রয়েডের একই আঁকা/অ্যানিমেশন/দৃশ্য-কোড, Canvas2D-তে। অফলাইন।
import { ASSETS, AssetDef, CATS, Cat, getAsset } from "../../src/art/registry";
import { BACKGROUNDS } from "../../src/art/backgrounds";
import { VIEWS, animName } from "../../src/art/anim";
import type { Shape, View } from "../../src/art/shapes";
import { buildAsset, sceneItems } from "../../src/lib/render";
import * as S from "../../src/lib/scene";
import { packProject, unpackProject } from "../../src/lib/projectFile";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = $<HTMLCanvasElement>("stage"), ctx = stage.getContext("2d")!;
let libT: any = 0;
const imgs = new Map<string, HTMLImageElement>();
const atlas = (k: string) => { let i = imgs.get(k); if (!i) { i = new Image(); i.onload = () => { draw(); clearTimeout(libT); libT = setTimeout(() => lib(), 150); }; i.src = `dist/sprites/${k}.webp`; imgs.set(k, i); } return i.complete && i.naturalWidth ? i : null; };

const P2 = new Map<string, Path2D>();
const bgCache = new Map<string, HTMLCanvasElement>();
function bgCanvas(id: string) { let c = bgCache.get(id); if (!c) { c = document.createElement("canvas"); c.width = 1280; c.height = 720; drawShapes(c.getContext("2d")!, (BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0]).shapes); bgCache.set(id, c); } return c; }
export function drawShapes(c: CanvasRenderingContext2D, shapes: Shape[]) {
  for (const s of shapes) {
    c.globalAlpha = (s as any).op ?? 1;
    switch (s.t) {
      case "rect": c.fillStyle = s.fill; if (s.r) { c.beginPath(); c.roundRect(s.x, s.y, s.w, s.h, s.r); c.fill(); } else c.fillRect(s.x, s.y, s.w, s.h); break;
      case "circle": c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.2832); if (s.fill) { c.fillStyle = s.fill; c.fill(); } if (s.stroke) { c.strokeStyle = s.stroke; c.lineWidth = s.sw ?? 2; c.stroke(); } break;
      case "ellipse": c.fillStyle = s.fill; c.beginPath(); c.ellipse(s.x, s.y, s.rx, s.ry, 0, 0, 6.2832); c.fill(); break;
      case "line": c.strokeStyle = s.color; c.lineWidth = s.w; c.lineCap = "round"; c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke(); break;
      case "path": { let p = P2.get(s.d); if (!p) { p = new Path2D(s.d); P2.set(s.d, p); } if (s.fill) { c.fillStyle = s.fill; c.fill(p); } if (s.stroke) { c.strokeStyle = s.stroke; c.lineWidth = s.sw ?? 3; c.lineCap = "round"; c.lineJoin = "round"; c.stroke(p); } break; }
      case "poly": c.fillStyle = s.fill; c.beginPath(); for (let i = 0; i < s.pts.length; i += 2) i ? c.lineTo(s.pts[i], s.pts[i + 1]) : c.moveTo(s.pts[i], s.pts[i + 1]); c.closePath(); c.fill(); break;
      case "grad": { const g = c.createLinearGradient(0, s.y, 0, s.y + s.h); g.addColorStop(0, s.c1); g.addColorStop(1, s.c2); c.fillStyle = g; c.fillRect(s.x, s.y, s.w, s.h); break; }
      case "img": { const im = atlas(s.k); if (!im) break; c.save(); c.translate(s.e, s.f); c.rotate((s.r * Math.PI) / 180); c.scale(s.s, s.s); c.beginPath(); c.rect(s.x, s.y, s.w, s.h); c.clip(); c.drawImage(im, s.u, s.v, s.pw, s.ph, s.x, s.y, s.w, s.h); c.restore(); break; }
    }
  }
  c.globalAlpha = 1;
}

let movie = S.newMovie("আমার ভিডিও"), sceneIdx = 0, t = 0, playing = false, selId: string | null = null, cat: Cat = "style2";
const scene = () => movie.scenes[Math.min(sceneIdx, movie.scenes.length - 1)];
const msg = (m: string) => { $("msg").textContent = m; };

function renderAt(c: CanvasRenderingContext2D, sc: S.Scene, lt: number, sel?: string | null) {
  c.clearRect(0, 0, 1280, 720);
  c.drawImage(bgCanvas(sc.bg), 0, 0);
  for (const it of sceneItems(movie, sc, lt)) {
    c.save(); c.translate(it.x, it.y); c.rotate((it.rot * Math.PI) / 180); c.scale(it.sx, it.sy);
    if (it.shadow > 0) { c.globalAlpha = 0.22; c.fillStyle = "#000"; c.beginPath(); c.ellipse(0, 0, it.shadow, it.shadow * 0.18, 0, 0, 6.2832); c.fill(); c.globalAlpha = 1; }
    drawShapes(c, it.shapes);
    if (sel && it.id === sel) { const [a, b, d, e] = it.asset.bounds; c.strokeStyle = "#FFB020"; c.lineWidth = 3 / Math.max(0.3, Math.abs(it.sx)); c.strokeRect(a, b, d - a, e - b); }
    c.restore();
  }
  const dlg = sc.dialogues.find((d) => lt >= d.t && lt <= d.t + d.dur);
  if (dlg) { c.fillStyle = "#000a"; c.fillRect(40, 640, 1200, 60); c.fillStyle = "#fff"; c.font = "28px 'Nirmala UI',sans-serif"; c.textAlign = "center"; c.fillText(dlg.text, 640, 680, 1150); c.textAlign = "left"; }
}
function draw() { renderAt(ctx, scene(), t, playing ? null : selId); $("tt").textContent = `${t.toFixed(1)} / ${scene().duration.toFixed(1)}`; ($("tl") as HTMLInputElement).value = String(Math.round((t / scene().duration) * 1000)); }

function thumb(a: AssetDef): HTMLCanvasElement {
  const cv = document.createElement("canvas"); cv.width = cv.height = 84; const c = cv.getContext("2d")!;
  const [x1, y1, x2, y2] = a.bounds, k = Math.min(78 / (x2 - x1 + 20), 78 / (y2 - y1 + 20));
  c.translate(42 - ((x1 + x2) / 2) * k, 42 - ((y1 + y2) / 2) * k); c.scale(k, k);
  drawShapes(c, buildAsset(a, { action: a.defaultAction === "fly" ? "fly" : "stand", phase: 0.4, talk: 0, blink: false })); return cv;
}
function lib() {
  $("tabs").innerHTML = ""; CATS.forEach((c) => { const b = document.createElement("button"); b.textContent = c.name; if (c.id === cat) b.className = "on"; b.onclick = () => { cat = c.id; lib(); }; $("tabs").appendChild(b); });
  const g = $("grid"); g.innerHTML = "";
  if (cat === "bg") { BACKGROUNDS.forEach((b) => { const d = document.createElement("div"); d.className = "c"; d.textContent = b.name; d.onclick = () => { movie = S.setBg(movie, scene().id, b.id); sync(); }; g.appendChild(d); }); return; }
  ASSETS.filter((a) => a.cat === cat).forEach((a) => { const d = document.createElement("div"); d.className = "c"; d.appendChild(thumb(a)); d.appendChild(document.createElement("br")); d.append(a.name);
    d.onclick = () => { const r = S.addObject(movie, scene().id, a.id); movie = r.movie; selId = r.objId; sync(); msg(`${a.name} যোগ হয়েছে`); }; g.appendChild(d); });
}
function insp() {
  const o = scene().objects.find((x) => x.id === selId), el = $("sel");
  if (!o) { el.textContent = "একটি চরিত্র যোগ করে স্টেজে ক্লিক করুন"; return; }
  const a = getAsset(o.assetId)!, st = S.evalObj(o, t); el.innerHTML = "";
  const row = (lab: string, n: HTMLElement) => { const l = document.createElement("label"); l.textContent = lab; l.appendChild(n); el.appendChild(l); };
  el.append(`${a.name}`);
  const act = document.createElement("select"); a.actions.forEach((x) => { const op = document.createElement("option"); op.value = x; op.textContent = animName(x); act.appendChild(op); });
  act.value = S.actionAt(o, a, t); act.onchange = () => { upd((q) => S.setAction(q, t, act.value as any)); }; row("অ্যানিমেশন (এই সময় থেকে)", act);
  if (a.rig) { const v = document.createElement("select"); VIEWS.forEach((x) => { const op = document.createElement("option"); op.value = x.id; op.textContent = x.bn; v.appendChild(op); }); v.value = S.viewAt(o, t); v.onchange = () => upd((q) => S.setView(q, t, v.value as View)); row("ভিউ", v); }
  const sc = document.createElement("input"); sc.type = "range"; sc.min = "0.3"; sc.max = "2.5"; sc.step = "0.05"; sc.value = String(st.s); sc.oninput = () => upd((q) => S.setKey(q, t, { s: +sc.value }), false); row("আকার", sc);
  const fl = document.createElement("button"); fl.textContent = "↔ উল্টানো"; fl.onclick = () => upd((q) => ({ ...q, flip: !q.flip })); el.appendChild(fl);
  const tx = document.createElement("input"); tx.placeholder = "সংলাপ লিখুন…"; row("সংলাপ (ঠোঁট নড়বে)", tx);
  const ad = document.createElement("button"); ad.textContent = "💬 সংলাপ যোগ"; ad.onclick = () => { if (tx.value.trim()) { movie = S.updateScene(movie, scene().id, (s) => S.addDialogue(s, o.id, t, tx.value)); sync(); } }; el.appendChild(ad);
  const rm = document.createElement("button"); rm.textContent = "🗑 মুছুন"; rm.onclick = () => { movie = S.removeObject(movie, scene().id, o.id); selId = null; sync(); }; el.appendChild(rm);
  const hint = document.createElement("small"); hint.textContent = "স্টেজে টেনে সরান: সময়-রেখার বর্তমান সময়ে কিফ্রেম তৈরি হয়, তাই চরিত্র হেঁটে যাবে।"; el.appendChild(hint);
}
function upd(fn: (o: S.Obj) => S.Obj, redraw = true) { movie = S.updateScene(movie, scene().id, (s) => S.updateObj(s, selId!, fn)); if (redraw) sync(); else draw(); }
function sync() {
  $("scenes").innerHTML = ""; movie.scenes.forEach((s, i) => { const b = document.createElement("button"); b.textContent = String(i + 1); if (i === sceneIdx) b.className = "on"; b.onclick = () => { sceneIdx = i; t = 0; selId = null; sync(); }; $("scenes").appendChild(b); });
  ($("bg") as HTMLSelectElement).value = scene().bg; ($("dur") as HTMLInputElement).value = String(scene().duration); insp(); draw();
}
// স্টেজে ক্লিক/টানা
let drag: { id: string; dx: number; dy: number } | null = null;
const pt = (e: MouseEvent) => { const r = stage.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 1280, y: ((e.clientY - r.top) / r.height) * 720 }; };
stage.onmousedown = (e) => {
  if (playing) return; const p = pt(e); const items = sceneItems(movie, scene(), t); let hit: (typeof items)[number] | null = null;
  for (const it of items) { const [a, b, c, d] = it.asset.bounds; const lx = (p.x - it.x) / it.sx, ly = (p.y - it.y) / it.sy; if (lx >= a && lx <= c && ly >= b && ly <= d) hit = it; }
  selId = hit ? hit.id : null; drag = hit ? { id: hit.id, dx: p.x - hit.x, dy: p.y - hit.y } : null; insp(); draw();
};
window.onmousemove = (e) => { if (!drag) return; const p = pt(e); movie = S.updateScene(movie, scene().id, (s) => S.updateObj(s, drag!.id, (o) => S.setKey(o, t, { x: p.x - drag!.dx, y: p.y - drag!.dy }))); draw(); };
window.onmouseup = () => { drag = null; };
window.onkeydown = (e) => { if ((e.key === "Delete") && selId && document.activeElement?.tagName !== "INPUT") { movie = S.removeObject(movie, scene().id, selId); selId = null; sync(); } };
// প্লেব্যাক
let last = 0;
function tick(ts: number) { if (!playing) return; const dt = (ts - last) / 1000; last = ts; t += dt; if (t >= scene().duration) { if (sceneIdx < movie.scenes.length - 1) { sceneIdx++; t = 0; sync(); } else { playing = false; $("play").textContent = "▶"; t = 0; } } draw(); requestAnimationFrame(tick); }
$("play").onclick = () => { playing = !playing; $("play").textContent = playing ? "⏸" : "▶"; if (playing) { last = performance.now(); requestAnimationFrame(tick); } else draw(); };
$("tl").oninput = () => { t = (+($("tl") as HTMLInputElement).value / 1000) * scene().duration; draw(); insp(); };
$("addsc").onclick = () => { movie = S.addScene(movie, sceneIdx); sceneIdx++; t = 0; sync(); };
$("bg").onchange = () => { movie = S.setBg(movie, scene().id, ($("bg") as HTMLSelectElement).value); draw(); };
$("dur").onchange = () => { movie = S.setDuration(movie, scene().id, Math.max(2, Math.min(60, +($("dur") as HTMLInputElement).value))); sync(); };
$("new").onclick = () => { movie = S.newMovie("আমার ভিডিও"); sceneIdx = 0; t = 0; selId = null; sync(); };
const NAT = (window as any).native as { save(n: string, f: unknown, d: ArrayBuffer): Promise<string | null>; open(f: unknown): Promise<string | null> } | undefined;
$("save").onclick = async () => { const d = new TextEncoder().encode(packProject(movie)); const p = NAT ? await NAT.save(`${movie.name}.bcsproj`, [{ name: "Bengali Cartoon Studio প্রজেক্ট", extensions: ["bcsproj"] }], d.buffer) : null; msg(p ? "সেভ হয়েছে" : "সেভ বাতিল"); };
$("open").onclick = async () => { try { const txt = NAT ? await NAT.open([{ name: "প্রজেক্ট", extensions: ["bcsproj", "json"] }]) : null; if (!txt) return; movie = unpackProject(txt); sceneIdx = 0; t = 0; selId = null; sync(); msg("প্রজেক্ট খোলা হয়েছে"); } catch (e) { msg("ফাইল খোলা যায়নি: " + (e as Error).message); } };
// ভিডিও এক্সপোর্ট (অফলাইন, ছবি থেকে WebM/MP4; সংলাপ ক্যাপশন হিসেবে ভিডিওতে থাকে)
$("exp").onclick = async () => {
  const cv = document.createElement("canvas"); cv.width = 1280; cv.height = 720; const c = cv.getContext("2d")!;
  const types = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9", "video/webm"]; const mt = types.find((x) => MediaRecorder.isTypeSupported(x)) ?? "video/webm";
  const rec = new MediaRecorder(cv.captureStream(24), { mimeType: mt, videoBitsPerSecond: 6_000_000 }); const chunks: BlobPart[] = []; rec.ondataavailable = (e) => chunks.push(e.data);
  const done = new Promise<void>((r) => (rec.onstop = () => r())); rec.start();
  const scenes = S.activeScenes(movie), total = scenes.reduce((a, s) => a + s.duration, 0); msg("এক্সপোর্ট চলছে…");
  let gt = 0; const t0 = performance.now();
  await new Promise<void>((res) => { const step = () => { gt = (performance.now() - t0) / 1000; if (gt >= total) return res(); let acc = 0, si = 0; for (let i = 0; i < scenes.length; i++) { if (gt < acc + scenes[i].duration) { si = i; break; } acc += scenes[i].duration; si = i; } renderAt(c, scenes[si], Math.min(gt - acc, scenes[si].duration)); msg(`এক্সপোর্ট ${Math.round((gt / total) * 100)}%`); requestAnimationFrame(step); }; step(); });
  rec.stop(); await done; const blob = new Blob(chunks, { type: mt }), buf = await blob.arrayBuffer(); const ext = mt.startsWith("video/mp4") ? "mp4" : "webm";
  const p = NAT ? await NAT.save(`${movie.name}.${ext}`, [{ name: "ভিডিও", extensions: [ext] }], buf) : null; msg(p ? `ভিডিও সেভ হয়েছে (${ext})` : "এক্সপোর্ট বাতিল");
};
BACKGROUNDS.forEach((b) => { const o = document.createElement("option"); o.value = b.id; o.textContent = b.name; $("bg").appendChild(o); });
(window as any).__studio = { get movie() { return movie; }, S, ASSETS, draw, sync, addAsset: (id: string) => { const r = S.addObject(movie, scene().id, id); movie = r.movie; selId = r.objId; sync(); }, setT: (v: number) => { t = v; draw(); } };
lib(); sync();
