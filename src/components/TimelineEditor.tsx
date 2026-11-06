import React, { useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ACTION_BN, C } from "../lib/theme";
import {
  Movie, Obj, Scene, fmtTime, moveScene, removeActAt, removeClip, removeDialogue, removeKeyAtIndex, removeViewAt, retimeAct, retimeKey, retimeView,
  setDuration, setSceneFlags, updateClip, updateDialogue, updateObj, updateScene,
} from "../lib/scene";

type Lane = "scene" | "clip" | "dlg" | "act" | "view" | "key";
type Pick = { lane: Lane; id: string } | null;
const COL: Record<Lane, string> = { scene: "#ffb020", clip: "#4fd1c5", dlg: "#7aa7ff", act: "#b07cff", view: "#ff7ab8", key: "#ffd84a" };
const NAME: Record<Lane, string> = { scene: "দৃশ্য", clip: "অডিও", dlg: "সংলাপ", act: "অ্যানিমেশন", view: "দিক (ভিউ)", key: "নড়াচড়ার চাবি" };

/** টাইমলাইন এডিটর: দৃশ্য, অডিও, সংলাপ ও অ্যানিমেশনের সময় আলাদাভাবে নিয়ন্ত্রণ */
export default function TimelineEditor({ movie, si, selId, commit, onScene, onClose }: {
  movie: Movie; si: number; selId: string | null; commit: (fn: (m: Movie) => Movie) => void; onScene: (i: number) => void; onClose: () => void;
}) {
  const [pick, setPick] = useState<Pick>(null);
  const scene: Scene = movie.scenes[Math.min(si, movie.scenes.length - 1)];
  const D = scene.duration;
  const obj: Obj | undefined = scene.objects.find((o) => o.id === selId);
  const total = movie.scenes.filter((x) => !x.skip).reduce((a, x) => a + x.duration, 0);
  const upd = (fn: (s: Scene) => Scene) => commit((m) => updateScene(m, scene.id, fn));
  const updO = (fn: (o: Obj) => Obj) => obj && upd((s) => updateObj(s, obj.id, fn));

  type Blk = { lane: Lane; id: string; t: number; len: number; label: string };
  const lanes: { lane: Lane; blocks: Blk[] }[] = [
    { lane: "clip", blocks: (scene.clips ?? []).map((c) => ({ lane: "clip", id: c.id, t: c.t, len: c.dur, label: (c.kind === "sfx" ? "🔔 " : "🎙 ") + c.name })) },
    { lane: "dlg", blocks: scene.dialogues.map((d) => ({ lane: "dlg", id: d.id, t: d.t, len: d.dur, label: d.text })) },
  ];
  if (obj) {
    lanes.push({ lane: "act", blocks: obj.acts.map((a, i) => ({ lane: "act", id: String(i), t: a.t, len: 0.5, label: ACTION_BN[a.action as keyof typeof ACTION_BN] ?? String(a.action) })) });
    lanes.push({ lane: "view", blocks: (obj.views ?? []).map((a, i) => ({ lane: "view", id: String(i), t: a.t, len: 0.5, label: String(a.view) })) });
    lanes.push({ lane: "key", blocks: obj.keys.map((k, i) => ({ lane: "key", id: String(i), t: k.t, len: 0.3, label: "●" })) });
  }

  const cur = pick ? lanes.find((l) => l.lane === pick.lane)?.blocks.find((b) => b.id === pick.id) : undefined;
  const shift = (d: number) => {
    if (!pick || !cur) return;
    const nt = Math.max(0, Math.min(D, Math.round((cur.t + d) * 10) / 10));
    if (pick.lane === "clip") upd((s) => updateClip(s, pick.id, { t: nt }));
    else if (pick.lane === "dlg") upd((s) => updateDialogue(s, pick.id, { t: nt }));
    else if (pick.lane === "act") { updO((o) => retimeAct(o, +pick.id, nt)); setPick(null); }
    else if (pick.lane === "view") { updO((o) => retimeView(o, +pick.id, nt)); setPick(null); }
    else if (pick.lane === "key") { updO((o) => retimeKey(o, +pick.id, nt)); setPick(null); }
  };
  const del = () => {
    if (!pick) return;
    if (pick.lane === "clip") upd((s) => removeClip(s, pick.id));
    else if (pick.lane === "dlg") upd((s) => removeDialogue(s, pick.id));
    else if (pick.lane === "act") updO((o) => removeActAt(o, +pick.id));
    else if (pick.lane === "view") updO((o) => removeViewAt(o, +pick.id));
    else if (pick.lane === "key") updO((o) => removeKeyAtIndex(o, +pick.id));
    setPick(null);
  };
  const clip = pick?.lane === "clip" ? (scene.clips ?? []).find((c) => c.id === pick.id) : undefined;
  const dlg = pick?.lane === "dlg" ? scene.dialogues.find((d) => d.id === pick.id) : undefined;
  const B = ({ l, f, on }: { l: string; f: () => void; on?: boolean }) => <TouchableOpacity onPress={f} style={[s.b, on && { backgroundColor: C.accent }]}><Text style={{ color: on ? "#111" : C.text, fontWeight: "700", fontSize: 13 }}>{l}</Text></TouchableOpacity>;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.top}>
          <Text style={s.title}>⏱ টাইমলাইন এডিটর</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: C.accent, fontWeight: "700", fontSize: 15 }}>✔ শেষ</Text></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
          <Text style={s.h}>১. দৃশ্যের ক্রম ও সময় (মোট {fmtTime(total)})</Text>
          <View style={{ flexDirection: "row", height: 46, borderRadius: 8, overflow: "hidden", backgroundColor: C.panel2 }}>
            {movie.scenes.map((sc, i) => (
              <TouchableOpacity key={sc.id} onPress={() => { onScene(i); setPick(null); }} style={{ flex: sc.duration, borderRightWidth: 1, borderColor: C.bg, justifyContent: "center", alignItems: "center", backgroundColor: i === si ? COL.scene : sc.skip ? "#333" : "#7a5a1a", opacity: sc.skip ? 0.5 : 1 }}>
                <Text style={{ color: i === si ? "#111" : C.text, fontSize: 12, fontWeight: "700" }}>{i + 1}</Text><Text style={{ color: i === si ? "#111" : C.dim, fontSize: 10 }}>{sc.duration}s</Text>
              </TouchableOpacity>))}
          </View>
          <View style={s.wrap}>
            <B l="◀ আগে সরান" f={() => { commit((m) => moveScene(m, si, -1)); onScene(Math.max(0, si - 1)); }} />
            <B l="পরে সরান ▶" f={() => { commit((m) => moveScene(m, si, 1)); onScene(Math.min(movie.scenes.length - 1, si + 1)); }} />
            <B l="⏱ −1s" f={() => commit((m) => setDuration(m, scene.id, scene.duration - 1))} />
            <B l="⏱ ＋1s" f={() => commit((m) => setDuration(m, scene.id, scene.duration + 1))} />
            <B l={scene.skip ? "☐ ভিডিওতে নেই" : "☑ ভিডিওতে আছে"} on={!scene.skip} f={() => commit((m) => setSceneFlags(m, scene.id, { skip: !scene.skip }))} />
            <B l="ফেড" on={!!scene.fade} f={() => commit((m) => setSceneFlags(m, scene.id, { fade: !scene.fade }))} />
          </View>

          <Text style={s.h}>২. দৃশ্য {si + 1}-এর ট্র্যাক ({D} সেকেন্ড)</Text>
          <View style={s.ruler}>{Array.from({ length: Math.floor(D) + 1 }, (_, i) => <Text key={i} style={[s.tick, { left: `${(i / D) * 100}%` }]}>{i}</Text>)}</View>
          {lanes.map(({ lane, blocks }) => (
            <View key={lane} style={{ marginBottom: 8 }}>
              <Text style={{ color: COL[lane], fontSize: 12, fontWeight: "700" }}>{NAME[lane]}{lane !== "clip" && lane !== "dlg" && obj ? " (নির্বাচিত বস্তুর)" : ""} · {blocks.length}টি</Text>
              <View style={s.lane}>
                {blocks.map((b) => {
                  const on = pick?.lane === b.lane && pick.id === b.id;
                  return (
                    <TouchableOpacity key={b.lane + b.id} onPress={() => setPick({ lane: b.lane, id: b.id })}
                      style={[s.blk, { left: `${Math.min(98, (b.t / D) * 100)}%`, width: `${Math.max(3, Math.min(100 - (b.t / D) * 100, (b.len / D) * 100))}%`, backgroundColor: COL[lane], borderWidth: on ? 2 : 0 }]}>
                      <Text numberOfLines={1} style={{ color: "#111", fontSize: 10, fontWeight: "700" }}>{b.label}</Text>
                    </TouchableOpacity>);
                })}
              </View>
            </View>))}
          {!obj && <Text style={s.hint}>অ্যানিমেশন, দিক ও চাবির ট্র্যাক দেখতে স্টেজে একটি চরিত্র বা বস্তু বেছে আবার ⏱ চাপুন।</Text>}

          {pick && cur ? (
            <View style={s.detail}>
              <Text style={{ color: COL[pick.lane], fontWeight: "700" }}>{NAME[pick.lane]} · {cur.label.slice(0, 40)}</Text>
              <Text style={{ color: C.dim, marginBottom: 6 }}>শুরু {cur.t.toFixed(1)}s{(pick.lane === "clip" || pick.lane === "dlg") ? ` · দৈর্ঘ্য ${cur.len.toFixed(1)}s` : ""}</Text>
              <View style={s.wrap}>
                <B l="◀◀ −1s" f={() => shift(-1)} /><B l="◀ −0.1s" f={() => shift(-0.1)} /><B l="+0.1s ▶" f={() => shift(0.1)} /><B l="+1s ▶▶" f={() => shift(1)} />
              </View>
              {clip && <View style={s.wrap}>
                <B l="🔉 −" f={() => upd((x) => updateClip(x, clip.id, { vol: Math.max(0.1, clip.vol - 0.1) }))} /><B l={`আওয়াজ ${Math.round(clip.vol * 100)}%`} f={() => {}} /><B l="🔊 ＋" f={() => upd((x) => updateClip(x, clip.id, { vol: Math.min(1, clip.vol + 0.1) }))} />
              </View>}
              {dlg && <View style={s.wrap}>
                <B l="দৈর্ঘ্য −0.5s" f={() => upd((x) => updateDialogue(x, dlg.id, { dur: Math.max(0.5, dlg.dur - 0.5) }))} /><B l="দৈর্ঘ্য ＋0.5s" f={() => upd((x) => updateDialogue(x, dlg.id, { dur: dlg.dur + 0.5 }))} />
              </View>}
              <B l="🗑 মুছুন" f={del} />
            </View>
          ) : <Text style={s.hint}>কোনো ব্লকে চাপ দিলে তার সময় সরানো ও মোছার বোতাম আসবে।</Text>}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 40, paddingBottom: 10, paddingHorizontal: 14, backgroundColor: C.panel },
  title: { color: C.text, fontSize: 17, fontWeight: "700" },
  h: { color: C.text, fontWeight: "700", fontSize: 14, marginTop: 14, marginBottom: 6 },
  wrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  b: { backgroundColor: C.panel2, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, marginRight: 6, marginBottom: 6 },
  ruler: { height: 14, marginBottom: 2 }, tick: { position: "absolute", color: C.dim, fontSize: 9 },
  lane: { height: 30, backgroundColor: C.panel2, borderRadius: 6, marginTop: 3, overflow: "hidden" },
  blk: { position: "absolute", top: 3, bottom: 3, borderRadius: 5, justifyContent: "center", paddingHorizontal: 3, borderColor: "#fff" },
  hint: { color: C.dim, fontSize: 12, marginTop: 8 },
  detail: { backgroundColor: C.panel, borderRadius: 12, padding: 10, marginTop: 10 },
});
