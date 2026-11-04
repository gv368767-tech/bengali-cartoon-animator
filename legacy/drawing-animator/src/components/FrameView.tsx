import React from "react";
import { Group, Path, Skia, type SkPath } from "@shopify/react-native-skia";
import type { Frame, Layer, Stroke } from "../lib/model";

const cache = new WeakMap<Stroke, SkPath>();

export function buildPath(pts: number[]): SkPath {
  const p = Skia.Path.Make();
  const n = pts.length / 2;
  if (n === 0) return p;
  p.moveTo(pts[0], pts[1]);
  if (n === 1) { p.lineTo(pts[0] + 0.01, pts[1]); return p; }
  for (let i = 1; i < n - 1; i++) {
    const mx = (pts[2 * i] + pts[2 * i + 2]) / 2, my = (pts[2 * i + 1] + pts[2 * i + 3]) / 2;
    p.quadTo(pts[2 * i], pts[2 * i + 1], mx, my);
  }
  p.lineTo(pts[2 * n - 2], pts[2 * n - 1]);
  return p;
}

function pathOf(s: Stroke, live: boolean): SkPath {
  if (live) return buildPath(s.pts);
  let p = cache.get(s);
  if (!p) { p = buildPath(s.pts); cache.set(s, p); }
  return p;
}

export function strokeWidth(s: Stroke) {
  return s.tool === "pencil" ? Math.max(1, s.size * 0.45) : s.tool === "eraser" ? s.size * 1.6 : s.size;
}

function StrokeView({ s, live }: { s: Stroke; live?: boolean }) {
  const eraser = s.tool === "eraser";
  return (
    <Path path={pathOf(s, !!live)} color={eraser ? "black" : s.color} style="stroke"
      strokeWidth={strokeWidth(s)} strokeCap="round" strokeJoin="round"
      blendMode={eraser ? "clear" : "srcOver"} opacity={s.tool === "pencil" ? 0.9 : 1} />
  );
}

// প্রতিটি লেয়ার আলাদা অফস্ক্রিন স্তরে আঁকা হয়, যাতে ইরেজার শুধু ওই লেয়ারেই কাজ করে।
export default function FrameView({ frame, layers, live, liveLayerId }: {
  frame: Frame; layers: Layer[]; live?: Stroke | null; liveLayerId?: string;
}) {
  return (
    <>
      {layers.filter((l) => l.visible).map((l) => (
        <Group key={l.id} layer>
          {(frame.strokes[l.id] ?? []).map((s, i) => <StrokeView key={i} s={s} />)}
          {live && l.id === liveLayerId ? <StrokeView s={live} live /> : null}
        </Group>
      ))}
    </>
  );
}
