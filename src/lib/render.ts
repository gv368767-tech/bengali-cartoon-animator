// স্ক্রিন-রেন্ডার ও MP4-এক্সপোর্ট — দুটোই এই একই ফাংশন থেকে আঁকার তালিকা নেয়, তাই ফল হুবহু এক।
import { Pose, Shape } from "../art/shapes";
import { HUMANS, humanShapes } from "../art/human";
import { AssetDef } from "../art/registry";
import { Look, Movie, Scene, blinkAt, mouthOf, phaseAt, placed, talkAt, viewAt } from "./scene";
import { mocapPose, mocapMouth, sampleMocap } from "./mocap";

export type Item = { id: string; asset: AssetDef; x: number; y: number; sx: number; sy: number; rot: number; shadow: number; shapes: Shape[] };

export function buildAsset(a: AssetDef, pose: Pose, look?: Look): Shape[] {
  if (a.rig === "human" && look && Object.keys(look).length) return humanShapes({ ...HUMANS[a.id], ...look }, pose);
  return a.build(pose);
}

export function sceneItems(movie: Movie, scene: Scene, t: number): Item[] {
  return placed(scene, t).map((p) => {
    const cm = p.obj.castId ? movie.cast.find((c) => c.id === p.obj.castId) : undefined;
    if (p.obj.mocap) { // ভিডিও থেকে নেওয়া নড়াচড়া: রিগের কোণ সরাসরি, অবস্থান/মাপ ভিডিওর হিসাবে (শরীরের সব অংশ একসঙ্গে সরে)
      const m = p.obj.mocap, q = mocapPose(m, t, m.prop), s = sampleMocap(m, t);
      const mp: Pose = { action: "stand", phase: t * 3, talk: 0, blink: blinkAt(p.obj, t), view: "side", mc: q.mc, mouth: mocapMouth(q.mouthLevel, t) };
      return { id: p.obj.id, asset: p.asset, x: s.x, y: s.y, sx: m.face * m.scale, sy: m.scale, rot: 0, shadow: p.asset.shadow, shapes: buildAsset(p.asset, mp, cm?.look) };
    }
    const pose: Pose = { action: p.act, phase: phaseAt(p.obj, p.asset, p.act, t, movie.speed), talk: talkAt(scene, p.obj.id, t), blink: blinkAt(p.obj, t), view: viewAt(p.obj, t), mouth: mouthOf(scene, p.obj.id, t) };
    return { id: p.obj.id, asset: p.asset, x: p.st.x, y: p.st.y, sx: p.flip ? -p.eff : p.eff, sy: p.eff, rot: p.st.r, shadow: p.asset.shadow, shapes: buildAsset(p.asset, pose, cm?.look) };
  });
}

// ---- Skia-র জন্য সহায়ক ----
export const polyD = (pts: number[]) => { let d = ""; for (let i = 0; i < pts.length; i += 2) d += `${i ? "L" : "M"}${pts[i]} ${pts[i + 1]} `; return d + "Z"; };
