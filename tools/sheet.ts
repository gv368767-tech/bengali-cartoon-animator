import { writeFileSync } from "node:fs";
import { ASSETS } from "../src/art/registry";
import { BACKGROUNDS } from "../src/art/backgrounds";
import { shapesToSvg } from "../src/art/svg";
import type { Pose } from "../src/art/shapes";

const pose = (action: Pose["action"], phase = 0, talk = 0): Pose => ({ action, phase, talk, blink: false });
const cell = (shapes: any[], vb: string, w: number, h: number, label: string, bg = "#fdfdf6") => {
  const { defs, body } = shapesToSvg(shapes);
  return `<div style="display:inline-block;margin:4px;text-align:center;font:12px sans-serif"><svg width="${w}" height="${h}" viewBox="${vb}" style="background:${bg};border:1px solid #ccc"><defs>${defs}</defs>${body}</svg><div>${label}</div></div>`;
};
let html = "<body style='margin:8px;background:#fff'>";
const which = process.argv[2] ?? "all";
if (which === "bg" || which === "all") for (const b of BACKGROUNDS) html += cell(b.shapes, "0 0 1280 720", 384, 216, b.name);
const sheet = (cat: string, poses: [Pose["action"], number, number][], vb: string, w: number, h: number) => {
  for (const a of ASSETS.filter((x) => x.cat === cat)) {
    html += "<div>";
    for (const [act, ph, talk] of poses) {
      if (act !== "stand" && !a.actions.includes(act as any) && !(act === "fly" && a.actions.includes("fly" as any))) continue;
      const sh = a.build(pose(act, ph, talk));
      const [x1, y1, x2, y2] = a.bounds;
      const shd = a.shadow ? [{ t: "ellipse", x: 0, y: 0, rx: a.shadow, ry: a.shadow * 0.18, fill: "#000", op: 0.22 }] : [];
      html += cell([...shd, ...sh], vb === "auto" ? `${x1 - 20} ${y1 - 20} ${x2 - x1 + 40} ${y2 - y1 + 40}` : vb, w, h, `${a.name} · ${act}`);
    }
    html += "</div>";
  }
};
if (which === "human" || which === "all") sheet("human", [["stand", 0, 0], ["walk", 1.1, 0], ["run", 1.1, 0], ["jump", 1.6, 0], ["sit", 0, 0], ["dance", 1.1, 0], ["wave", 0.6, 0.9]], "-110 -380 220 400", 110, 200);
if (which === "animal" || which === "all") sheet("animal", [["stand", 0, 0], ["walk", 1.2, 0.8], ["run", 1.2, 0]], "auto", 230, 170);
if (which === "bird" || which === "all") sheet("bird", [["fly", 0.5, 0.8], ["fly", 2.2, 0], ["stand", 0, 0], ["walk", 1, 0]], "auto", 170, 130);
if (which === "prop" || which === "all") sheet("object", [["stand", 0.8, 0], ["walk", 0.8, 0]], "auto", 200, 150);
if (which === "prop" || which === "all") sheet("nature", [["stand", 0.8, 0]], "auto", 200, 150);
writeFileSync(process.argv[3] ?? "/tmp/sheet.html", html + "</body>");
