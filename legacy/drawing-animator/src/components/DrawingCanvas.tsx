import React, { useMemo, useRef, useState } from "react";
import { PanResponder, View } from "react-native";
import { Canvas, ColorMatrix, Group, Paint, Rect } from "@shopify/react-native-skia";
import FrameView from "./FrameView";
import { onionIndices, simplifyPoint, type Project, type Stroke, type Tool } from "../lib/model";

export type Onion = { enabled: boolean; prev: number; next: number };
const tint = (r: number, g: number, b: number) =>
  [0, 0, 0, 0, r / 255, 0, 0, 0, 0, g / 255, 0, 0, 0, 0, b / 255, 0, 0, 0, 1, 0];
const PREV_TINT = tint(255, 90, 90);   // আগের ফ্রেম = লালচে
const NEXT_TINT = tint(31, 182, 166);  // পরের ফ্রেম = সবুজাভ
const PREV_OP = [0.4, 0.22, 0.12];
const NEXT_OP = [0.4, 0.22, 0.12];

type Props = {
  project: Project; frameIdx: number; layerId: string;
  tool: Tool; color: string; size: number; onion: Onion; playing: boolean;
  boxW: number; boxH: number;
  onStroke: (s: Stroke) => void; onBlocked: (msg: string) => void;
};

export default function DrawingCanvas(p: Props) {
  const scale = Math.max(0.05, Math.min(p.boxW / p.project.width, p.boxH / p.project.height));
  const W = p.project.width * scale, H = p.project.height * scale;

  // PanResponder একবারই তৈরি হয়; সর্বশেষ props পড়তে ref ব্যবহার
  const latest = useRef({ ...p, scale });
  latest.current = { ...p, scale };
  const pts = useRef<number[]>([]);
  const [live, setLive] = useState<Stroke | null>(null);

  const pan = useMemo(() => {
    const mk = (): Stroke => {
      const L = latest.current;
      return { tool: L.tool, color: L.color, size: L.size, pts: [...pts.current] };
    };
    const at = (e: any) => {
      const L = latest.current;
      return [e.nativeEvent.locationX / L.scale, e.nativeEvent.locationY / L.scale] as const;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const L = latest.current;
        if (L.playing) return;
        const layer = L.project.layers.find((l) => l.id === L.layerId);
        if (!layer || !layer.visible) { L.onBlocked("এই লেয়ারটি লুকানো — আগে দেখান"); pts.current = []; return; }
        pts.current = [];
        const [x, y] = at(e);
        simplifyPoint(pts.current, x, y);
        setLive(mk());
      },
      onPanResponderMove: (e) => {
        if (!pts.current.length) return;
        const [x, y] = at(e);
        if (simplifyPoint(pts.current, x, y)) setLive(mk());
      },
      onPanResponderRelease: () => {
        if (pts.current.length) latest.current.onStroke(mk());
        pts.current = []; setLive(null);
      },
      onPanResponderTerminate: () => { pts.current = []; setLive(null); },
    });
  }, []);

  const frame = p.project.frames[p.frameIdx];
  const { before, after } = p.onion.enabled && !p.playing
    ? onionIndices(p.frameIdx, p.project.frames.length, p.onion.prev, p.onion.next)
    : { before: [] as number[], after: [] as number[] };

  return (
    <View style={{ width: W, height: H }}>
      <Canvas style={{ width: W, height: H }}>
        <Group transform={[{ scale }]}>
          <Rect x={0} y={0} width={p.project.width} height={p.project.height} color="white" />
          {after.map((fi, k) => (
            <Group key={"n" + fi} layer={<Paint opacity={NEXT_OP[k] ?? 0.1}><ColorMatrix matrix={NEXT_TINT} /></Paint>}>
              <FrameView frame={p.project.frames[fi]} layers={p.project.layers} />
            </Group>
          ))}
          {before.map((fi, k) => (
            <Group key={"p" + fi} layer={<Paint opacity={PREV_OP[k] ?? 0.1}><ColorMatrix matrix={PREV_TINT} /></Paint>}>
              <FrameView frame={p.project.frames[fi]} layers={p.project.layers} />
            </Group>
          ))}
          <FrameView frame={frame} layers={p.project.layers} live={live} liveLayerId={p.layerId} />
        </Group>
      </Canvas>
      {/* স্পর্শ ধরার স্বচ্ছ স্তর */}
      <View style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} {...pan.panHandlers} />
    </View>
  );
}
