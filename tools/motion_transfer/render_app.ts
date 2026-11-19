// অ্যাপের নিজের কোড (mocap.ts → scene.ts → render.ts → রিগ) দিয়ে ফ্রেম আঁকে; ফাইলে SVG লেখে। (ফোনের ভেতরে Skia আঁকে, এখানে SVG — আকার একই)
// চালানো: tsx tools/motion_transfer/render_app.ts <tracks.json> <plate.jpg> <outDir>
import fs from "node:fs";
import { buildMocap } from "../../src/lib/mocap";
import { addObject, newMovie, updateObj, updateScene } from "../../src/lib/scene";
import { sceneItems } from "../../src/lib/render";
import { shapesToSvg } from "../../src/art/svg";
import { videoBgId } from "../../src/art/videoBg";

const [tp, plate, out] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(tp, "utf8")), FPS = 30, N = d.tracks[0].length;
let m = newMovie("ভিডিও থেকে কার্টুন"); const sid = m.scenes[0].id;
m = updateScene(m, sid, (s) => ({ ...s, bg: videoBgId("t1", 9, 16), duration: N / FPS }));
const faces: (1 | -1)[] = [1, -1], looks = [{ top: "#2a4d9b", bottom: "#2a4d9b" }, {}];
const prop = process.env.PROP || undefined;
for (let k = 0; k < 2; k++) {
  const r = addObject(m, sid, "woman"); m = r.movie;
  if (looks[k].top) m = { ...m, cast: m.cast.map((c) => (c.id === r.movie.cast[r.movie.cast.length - 1].id ? { ...c, look: looks[k] } : c)) };
  const mc = buildMocap(d.tracks[k], 1080, 1920, { fps: FPS, face: faces[k], env: d.env }); (mc as any).prop = prop;
  m = updateScene(m, sid, (s) => updateObj(s, r.objId, (o) => ({ ...o, mocap: mc })));
}
fs.mkdirSync(out, { recursive: true });
const img = "data:image/jpeg;base64," + fs.readFileSync(plate).toString("base64"), sc = m.scenes[0];
for (let i = 0; i < N; i++) {
  let body = "", defs = "";
  for (const it of sceneItems(m, sc, i / FPS)) {
    const sv = shapesToSvg(it.shapes); defs += sv.defs;
    body += `<ellipse cx="${it.x}" cy="${it.y + 6}" rx="${60 * Math.abs(it.sx)}" ry="${11 * Math.abs(it.sx)}" fill="#000" opacity="0.18"/><g transform="translate(${it.x} ${it.y}) scale(${it.sx} ${it.sy})">${sv.body}</g>`;
  }
  fs.writeFileSync(`${out}/${String(i).padStart(4, "0")}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#15151c"/><image href="${img}" x="437.5" y="0" width="405" height="720"/><defs>${defs}</defs>${body}</svg>`);
}
console.log("frames", N);
