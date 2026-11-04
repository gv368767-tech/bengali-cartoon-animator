import React, { memo, useMemo } from "react";
import { Canvas, Circle, Group, LinearGradient, Oval, Path, Rect, RoundedRect, Line, vec } from "@shopify/react-native-skia";
import type { Shape } from "../art/shapes";
import { BACKGROUNDS } from "../art/backgrounds";
import { AssetDef } from "../art/registry";
import { Movie, Scene, STAGE_H, STAGE_W } from "../lib/scene";
import { Item, buildAsset, polyD, sceneItems } from "../lib/render";

function node(s: Shape, k: string): React.ReactNode {
  switch (s.t) {
    case "rect":
      return s.r ? <RoundedRect key={k} x={s.x} y={s.y} width={s.w} height={s.h} r={s.r} color={s.fill} opacity={s.op} />
        : <Rect key={k} x={s.x} y={s.y} width={s.w} height={s.h} color={s.fill} opacity={s.op} />;
    case "circle":
      return <React.Fragment key={k}>
        {s.fill ? <Circle cx={s.x} cy={s.y} r={s.r} color={s.fill} opacity={s.op} /> : null}
        {s.stroke ? <Circle cx={s.x} cy={s.y} r={s.r} color={s.stroke} style="stroke" strokeWidth={s.sw ?? 2} opacity={s.op} /> : null}
      </React.Fragment>;
    case "ellipse":
      return <Oval key={k} x={s.x - s.rx} y={s.y - s.ry} width={s.rx * 2} height={s.ry * 2} color={s.fill} opacity={s.op} />;
    case "line":
      return <Line key={k} p1={vec(s.x1, s.y1)} p2={vec(s.x2, s.y2)} color={s.color} style="stroke" strokeWidth={s.w} strokeCap="round" opacity={s.op} />;
    case "path":
      return <React.Fragment key={k}>
        {s.fill ? <Path path={s.d} color={s.fill} opacity={s.op} /> : null}
        {s.stroke ? <Path path={s.d} color={s.stroke} style="stroke" strokeWidth={s.sw ?? 3} strokeCap="round" strokeJoin="round" opacity={s.op} /> : null}
      </React.Fragment>;
    case "poly":
      return <Path key={k} path={polyD(s.pts)} color={s.fill} opacity={s.op} />;
    case "grad":
      return <Rect key={k} x={s.x} y={s.y} width={s.w} height={s.h}><LinearGradient start={vec(s.x, s.y)} end={vec(s.x, s.y + s.h)} colors={[s.c1, s.c2]} /></Rect>;
  }
}
export const Shapes = ({ shapes, p = "s" }: { shapes: Shape[]; p?: string }) => <>{shapes.map((s, i) => node(s, p + i))}</>;

const Background = memo(({ id }: { id: string }) => {
  const bg = BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
  return <Shapes shapes={bg.shapes} p="bg" />;
});

const xf = (it: { x: number; y: number; sx: number; sy: number; rot: number }) => [
  { translateX: it.x }, { translateY: it.y }, { rotate: (it.rot * Math.PI) / 180 }, { scaleX: it.sx }, { scaleY: it.sy },
];

export function StageView({ movie, scene, t, width, selectedId }: { movie: Movie; scene: Scene; t: number; width: number; selectedId?: string | null }) {
  const scale = width / STAGE_W, height = STAGE_H * scale;
  const items: Item[] = sceneItems(movie, scene, t);
  return (
    <Canvas style={{ width, height }}>
      <Group transform={[{ scale }]}>
        <Background id={scene.bg} />
        {items.map((it) => (
          <Group key={it.id} transform={xf(it)}>
            {it.shadow > 0 ? <Oval x={-it.shadow} y={-it.shadow * 0.18} width={it.shadow * 2} height={it.shadow * 0.36} color="black" opacity={0.22} /> : null}
            <Shapes shapes={it.shapes} p={it.id} />
            {it.id === selectedId ? (() => { const [a, b, c, d] = it.asset.bounds; return <Rect x={a} y={b} width={c - a} height={d - b} color="#FFB020" style="stroke" strokeWidth={3 / Math.max(0.3, Math.abs(it.sx))} />; })() : null}
          </Group>
        ))}
      </Group>
    </Canvas>
  );
}

// লাইব্রেরির ছোট ছবি
export const AssetThumb = memo(({ asset, size = 74, look }: { asset: AssetDef; size?: number; look?: Record<string, string> }) => {
  const shapes = useMemo(() => buildAsset(asset, { action: asset.defaultAction === "fly" ? "fly" : "stand", phase: 0.4, talk: 0, blink: false }, look), [asset, look]);
  const [x1, y1, x2, y2] = asset.bounds;
  const bw = x2 - x1 + 20, bh = y2 - y1 + 20, k = Math.min(size / bw, size / bh);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Group transform={[{ translateX: size / 2 - ((x1 + x2) / 2) * k }, { translateY: size / 2 - ((y1 + y2) / 2) * k }, { scale: k }]}>
        <Shapes shapes={shapes} p="t" />
      </Group>
    </Canvas>
  );
});
export const BgThumb = memo(({ id, w = 112 }: { id: string; w?: number }) => (
  <Canvas style={{ width: w, height: (w * 9) / 16 }}><Group transform={[{ scale: w / STAGE_W }]}><Background id={id} /></Group></Canvas>
));
