// প্রতিটি অ্যাসেট আলাদা PNG হিসেবে আঁকার জন্য HTML তৈরি (পরে playwright দিয়ে স্ক্রিনশট)
import { mkdirSync, writeFileSync } from "node:fs";
import { ASSETS } from "../src/art/registry";
import { BACKGROUNDS } from "../src/art/backgrounds";
import { shapesToSvg } from "../src/art/svg";

const out = process.argv[2] ?? "/tmp/png_pages";
mkdirSync(out, { recursive: true });
const manifest: any[] = [];
const page = (id: string, svg: string, w: number, h: number) =>
  writeFileSync(`${out}/${id}.html`, `<body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${w}" height="${h}" `)}</body>`);

for (const a of ASSETS) {
  const [x1, y1, x2, y2] = a.bounds;
  const pad = 14, bw = x2 - x1 + pad * 2, bh = y2 - y1 + pad * 2;
  const k = 480 / Math.max(bw, bh);
  const w = Math.round(bw * k), h = Math.round(bh * k);
  const { defs, body } = shapesToSvg(a.build({ action: a.defaultAction === "fly" ? "stand" : "stand", phase: 0, talk: 0, blink: false }));
  page(a.id, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x1 - pad} ${y1 - pad} ${bw} ${bh}"><defs>${defs}</defs>${body}</svg>`, w, h);
  manifest.push({ id: a.id, name: a.name, category: a.cat, file: `${a.cat}/${a.id}.png`, w, h, transparent: true, actions: a.actions });
}
for (const b of BACKGROUNDS) {
  const { defs, body } = shapesToSvg(b.shapes);
  page(b.id, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><defs>${defs}</defs>${body}</svg>`, 1280, 720);
  manifest.push({ id: b.id, name: b.name, category: "bg", file: `bg/${b.id}.png`, w: 1280, h: 720, transparent: false });
}
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 1));
console.log(manifest.length, "pages");
