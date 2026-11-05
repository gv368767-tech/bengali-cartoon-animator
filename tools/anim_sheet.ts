// অ্যানিমেশন কনট্যাক্ট-শিট: npx tsx tools/anim_sheet.ts <asset> <mode: all|views> <out.html>
import { writeFileSync } from "node:fs";
import { getAsset } from "../src/art/registry";
import { ANIMS, VIEWS } from "../src/art/anim";
import { buildAsset } from "../src/lib/render";
import { shapesToSvg } from "../src/art/svg";
import type { Pose, View } from "../src/art/shapes";

const id = process.argv[2] ?? "teacher", mode = process.argv[3] ?? "all";
const a = getAsset(id)!;
const cell = (pose: Pose, label: string, w = 230, h = 270) => {
  const { defs, body } = shapesToSvg(buildAsset(a, pose));
  return `<div style="display:inline-block;margin:2px;text-align:center;font:11px sans-serif"><svg width="${w}" height="${h}" viewBox="-110 -375 280 385" style="background:#fdfdf6;border:1px solid #ccc"><defs>${defs}</defs>${body}</svg><div>${label}</div></div>`;
};
let html = "<body style='margin:6px;background:#fff'>";
if (mode === "views") {
  for (const an of ANIMS.filter((x) => ["stand", "walk", "run", "wave", "talk", "sit", "jump", "dance"].includes(x.id))) {
    html += "<div>";
    for (const v of VIEWS) html += cell({ action: an.id as any, phase: 1.1, talk: 0, blink: false, view: v.id as View }, `${an.en} · ${v.en}`);
    html += "</div>";
  }
} else {
  for (const an of ANIMS) html += cell({ action: an.id as any, phase: Number(process.argv[5] ?? 1.1), talk: 0, blink: false, view: (process.argv[4] ?? "front") as View }, `${an.en} (${an.bn})`);
}
writeFileSync(process.argv[process.argv.length - 1], html + "</body>");
