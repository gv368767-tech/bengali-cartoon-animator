// স্ক্রিন-রেন্ডার ও MP4-এক্সপোর্ট — দুটোই এই একই ফাংশন থেকে আঁকার তালিকা নেয়, তাই ফল হুবহু এক।
import { Pose, Shape } from "../art/shapes";
import { HUMANS, humanShapes } from "../art/human";
import { AssetDef } from "../art/registry";
import { Look, Movie, Scene, blinkAt, mouthOf, phaseAt, placed, talkAt, viewAt } from "./scene";

export type Item = { id: string; asset: AssetDef; x: number; y: number; sx: number; sy: number; rot: number; shadow: number; shapes: Shape[] };

export function buildAsset(a: AssetDef, pose: Pose, look?: Look): Shape[] {
  if (a.cat === "human" && look && Object.keys(look).length) return humanShapes({ ...HUMANS[a.id], ...look }, pose);
  return a.build(pose);
}

export function sceneItems(movie: Movie, scene: Scene, t: number): Item[] {
  return placed(scene, t).map((p) => {
    const cm = p.obj.castId ? movie.cast.find((c) => c.id === p.obj.castId) : undefined;
    const pose: Pose = { action: p.act, phase: phaseAt(p.obj, p.asset, p.act, t, movie.speed), talk: talkAt(scene, p.obj.id, t), blink: blinkAt(p.obj, t), view: viewAt(p.obj, t), mouth: mouthOf(scene, p.obj.id, t) };
    return { id: p.obj.id, asset: p.asset, x: p.st.x, y: p.st.y, sx: p.flip ? -p.eff : p.eff, sy: p.eff, rot: p.st.r, shadow: p.asset.shadow, shapes: buildAsset(p.asset, pose, cm?.look) };
  });
}

// ---- Skia-র জন্য সহায়ক ----
export const polyD = (pts: number[]) => { let d = ""; for (let i = 0; i < pts.length; i += 2) d += `${i ? "L" : "M"}${pts[i]} ${pts[i + 1]} `; return d + "Z"; };
