import React, { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, StatusBar, StyleSheet, Text, TouchableOpacity, View, LayoutChangeEvent } from "react-native";
import DrawingCanvas, { type Onion } from "../components/DrawingCanvas";
import Timeline from "../components/Timeline";
import { BrushPanel, LayerPanel } from "../components/Panels";
import * as M from "../lib/model";
import { saveProject } from "../lib/storage";
import { C } from "../lib/theme";

export default function EditorScreen({ initial, onExit }: { initial: M.Project; onExit: () => void }) {
  const [project, setProject] = useState(initial);
  const [hist, setHist] = useState<M.History>(M.emptyHistory);
  const [idx, setIdx] = useState(0);
  const [layerId, setLayerId] = useState(initial.layers[initial.layers.length - 1].id);
  const [tool, setTool] = useState<M.Tool>("brush");
  const [color, setColor] = useState("#1d1d1f");
  const [size, setSize] = useState(8);
  const [onion, setOnion] = useState<Onion>({ enabled: true, prev: 1, next: 0 });
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [clip, setClip] = useState<M.Frame | null>(null);
  const [panel, setPanel] = useState<null | "layers" | "brush">(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [toast, setToast] = useState("");
  const [saved, setSaved] = useState(true);

  const projectRef = useRef(project); projectRef.current = project;
  const idxRef = useRef(idx); idxRef.current = idx;
  const panelRef = useRef(panel); panelRef.current = panel;

  const say = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(""), 1600); }, []);
  const commit = useCallback((next: M.Project) => {
    const prev = projectRef.current;
    setHist((h) => M.pushHistory(h, prev));
    projectRef.current = next; setProject(next); setSaved(false);
  }, []);

  // স্বয়ংক্রিয় সেভ
  useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => { saveProject(project).then(() => setSaved(true)).catch(() => say("সেভ ব্যর্থ!")); }, 900);
    return () => clearTimeout(t);
  }, [project, saved, say]);

  const exit = useCallback(async () => {
    try { await saveProject(projectRef.current); } catch { /* ignore */ }
    onExit();
  }, [onExit]);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (panelRef.current) setPanel(null); else exit();
      return true;
    });
    return () => sub.remove();
  }, [exit]);

  // প্লেব্যাক
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const n = projectRef.current.frames.length, i = idxRef.current;
      if (i + 1 >= n) { if (loop) setIdx(0); else setPlaying(false); } else setIdx(i + 1);
    }, 1000 / project.fps);
    return () => clearInterval(t);
  }, [playing, project.fps, loop]);

  const onStroke = (s: M.Stroke) => commit(M.addStroke(projectRef.current, idxRef.current, layerId, s));

  const restore = (p: M.Project) => {
    setProject(p); projectRef.current = p; setSaved(false);
    setIdx((i) => Math.min(i, p.frames.length - 1));
    if (!p.layers.some((l) => l.id === layerId)) setLayerId(p.layers[p.layers.length - 1].id);
  };
  const doUndo = () => { const r = M.undo(hist, project); if (r) { setHist(r.h); restore(r.p); } };
  const doRedo = () => { const r = M.redo(hist, project); if (r) { setHist(r.h); restore(r.p); } };

  const addF = () => { if (project.frames.length >= M.MAX_FRAMES) return say("সর্বোচ্চ ফ্রেম"); commit(M.addFrame(project, idx)); setIdx(idx + 1); };
  const dupF = () => { if (project.frames.length >= M.MAX_FRAMES) return say("সর্বোচ্চ ফ্রেম"); commit(M.duplicateFrame(project, idx)); setIdx(idx + 1); };
  const copyF = () => { setClip(project.frames[idx]); say("ফ্রেম কপি হয়েছে"); };
  const pasteF = () => { if (!clip) return say("আগে কপি করুন"); commit(M.pasteFrame(project, idx, clip)); setIdx(idx + 1); };
  const delF = () => { const next = M.deleteFrame(project, idx); commit(next); setIdx(Math.min(idx, next.frames.length - 1)); };
  const clearF = () => commit(M.clearFrame(project, idx));

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const fpsStep = (d: number) => commit(M.setFps(project, project.fps + d));
  const secs = (project.frames.length / project.fps).toFixed(1);

  return (
    <View style={s.root}>
      <View style={s.top}>
        <TouchableOpacity onPress={exit}><Text style={s.topBtn}>‹ ফিরুন</Text></TouchableOpacity>
        <Text style={s.title} numberOfLines={1}>{project.name}{saved ? "" : " •"}</Text>
        <TouchableOpacity onPress={doUndo} disabled={!hist.past.length}><Text style={[s.topBtn, !hist.past.length && s.off]}>↶</Text></TouchableOpacity>
        <TouchableOpacity onPress={doRedo} disabled={!hist.future.length}><Text style={[s.topBtn, !hist.future.length && s.off]}>↷</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setPanel("layers")}><Text style={s.topBtn}>লেয়ার</Text></TouchableOpacity>
      </View>

      <View style={s.stage} onLayout={onLayout}>
        {box.w > 0 && (
          <DrawingCanvas project={project} frameIdx={idx} layerId={layerId} tool={tool} color={color} size={size}
            onion={onion} playing={playing} boxW={box.w - 8} boxH={box.h - 8} onStroke={onStroke} onBlocked={say} />
        )}
        {!!toast && <View style={s.toast}><Text style={{ color: "#fff" }}>{toast}</Text></View>}
      </View>

      {/* প্লেব্যাক ও অনিয়ন স্কিন */}
      <View style={s.bar}>
        <TouchableOpacity style={s.play} onPress={() => setPlaying((p) => !p)}>
          <Text style={s.playTxt}>{playing ? "⏸ বিরতি" : "▶ চালান"}</Text>
        </TouchableOpacity>
        <Chip t={loop ? "🔁 লুপ" : "➡ একবার"} on={loop} onPress={() => setLoop(!loop)} />
        <View style={s.fps}>
          <TouchableOpacity onPress={() => fpsStep(-1)}><Text style={s.step}>−</Text></TouchableOpacity>
          <Text style={s.fpsTxt}>{project.fps} FPS</Text>
          <TouchableOpacity onPress={() => fpsStep(1)}><Text style={s.step}>＋</Text></TouchableOpacity>
        </View>
        <Text style={s.dim}>{secs}s</Text>
      </View>
      <View style={s.bar}>
        <Chip t="🧅 অনিয়ন" on={onion.enabled} onPress={() => setOnion({ ...onion, enabled: !onion.enabled })} />
        <Chip t={`আগে ${onion.prev}`} on={onion.enabled} onPress={() => setOnion({ ...onion, prev: (onion.prev + 1) % 4 })} />
        <Chip t={`পরে ${onion.next}`} on={onion.enabled} onPress={() => setOnion({ ...onion, next: (onion.next + 1) % 4 })} />
        <Text style={s.dim}>ফ্রেম {idx + 1}/{project.frames.length}</Text>
      </View>

      {/* টাইমলাইন + ফ্রেম অ্যাকশন */}
      <View style={s.timeline}>
        <Timeline frames={project.frames} idx={idx} onSelect={(i) => { setPlaying(false); setIdx(i); }} />
        <View style={s.actions}>
          <Act t="＋ নতুন" onPress={addF} /><Act t="⧉ ডুপ্লিকেট" onPress={dupF} />
          <Act t="কপি" onPress={copyF} /><Act t="পেস্ট" onPress={pasteF} />
          <Act t="সাফ" onPress={clearF} /><Act t="🗑 মুছুন" onPress={delF} danger />
        </View>
      </View>

      {/* টুল */}
      <View style={s.tools}>
        {([["brush", "🖌 ব্রাশ"], ["pencil", "✏ পেনসিল"], ["eraser", "⌫ ইরেজার"]] as const).map(([k, label]) => (
          <TouchableOpacity key={k} style={[s.tool, tool === k && s.toolOn]} onPress={() => setTool(k)}>
            <Text style={[s.toolTxt, tool === k && { color: "#111" }]}>{label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.colorBtn} onPress={() => setPanel("brush")}>
          <View style={[s.colorDot, { backgroundColor: color }]} /><Text style={s.dim}>{size}</Text>
        </TouchableOpacity>
      </View>

      {panel === "layers" && (
        <LayerPanel project={project} layerId={layerId} onClose={() => setPanel(null)}
          onSelect={setLayerId}
          onAdd={() => { const n = M.addLayer(project); commit(n); setLayerId(n.layers[n.layers.length - 1].id); }}
          onRemove={(id) => { const n = M.removeLayer(project, id); if (n === project) return say("শেষ লেয়ার মোছা যায় না"); commit(n); if (id === layerId) setLayerId(n.layers[n.layers.length - 1].id); }}
          onToggle={(id) => commit(M.toggleLayer(project, id))}
          onMove={(id, d) => commit(M.moveLayer(project, id, d))} />
      )}
      {panel === "brush" && <BrushPanel color={color} size={size} onColor={setColor} onSize={setSize} onClose={() => setPanel(null)} />}
    </View>
  );
}

const Chip = ({ t, on, onPress }: { t: string; on?: boolean; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[s.chip, on && s.chipOn]}><Text style={[s.chipTxt, on && { color: "#111" }]}>{t}</Text></TouchableOpacity>
);
const Act = ({ t, onPress, danger }: { t: string; onPress: () => void; danger?: boolean }) => (
  <TouchableOpacity onPress={onPress} style={s.act}><Text style={[s.actTxt, danger && { color: C.danger }]}>{t}</Text></TouchableOpacity>
);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: StatusBar.currentHeight ?? 24 },
  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, height: 46 },
  topBtn: { color: C.accent, fontSize: 17, fontWeight: "700", paddingHorizontal: 10 },
  off: { opacity: 0.3 },
  title: { flex: 1, color: C.text, fontSize: 16, fontWeight: "600", textAlign: "center" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0e1014" },
  toast: { position: "absolute", bottom: 12, backgroundColor: "#000c", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.panel },
  play: { backgroundColor: C.teal, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, marginRight: 8 },
  playTxt: { color: "#06201d", fontWeight: "800" },
  fps: { flexDirection: "row", alignItems: "center", backgroundColor: C.panel2, borderRadius: 12, marginLeft: 6, paddingHorizontal: 4 },
  step: { color: C.text, fontSize: 20, paddingHorizontal: 10, paddingVertical: 3 },
  fpsTxt: { color: C.text, fontWeight: "700", minWidth: 58, textAlign: "center" },
  dim: { color: C.dim, marginLeft: "auto", fontSize: 13 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14, backgroundColor: C.panel2, marginRight: 6 },
  chipOn: { backgroundColor: C.accent }, chipTxt: { color: C.text, fontSize: 13, fontWeight: "600" },
  timeline: { backgroundColor: C.panel },
  actions: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, paddingBottom: 6 },
  act: { paddingHorizontal: 8, paddingVertical: 8, backgroundColor: C.panel2, borderRadius: 10 },
  actTxt: { color: C.text, fontSize: 12.5, fontWeight: "600" },
  tools: { flexDirection: "row", alignItems: "center", padding: 8, backgroundColor: C.panel, borderTopWidth: 1, borderTopColor: C.line },
  tool: { flex: 1, paddingVertical: 12, marginRight: 6, borderRadius: 12, backgroundColor: C.panel2, alignItems: "center" },
  toolOn: { backgroundColor: C.accent }, toolTxt: { color: C.text, fontWeight: "700", fontSize: 13 },
  colorBtn: { alignItems: "center", paddingHorizontal: 8 },
  colorDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: C.text },
});
