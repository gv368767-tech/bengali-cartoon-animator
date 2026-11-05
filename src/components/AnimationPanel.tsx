// অ্যানিমেশন প্যানেল: ভিউ বাছাই + সার্চ + প্রতিটি অ্যানিমেশনের চলমান প্রিভিউ + লিপ-সিঙ্ক টেস্ট
import React, { memo, useEffect, useMemo, useState } from "react";
import { FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Canvas, Group } from "@shopify/react-native-skia";
import { Shapes } from "./StageView";
import { buildAsset } from "../lib/render";
import { ANIMS, ANIM_CATS, AnimCat, AnimDef, VIEWS, searchAnims } from "../art/anim";
import type { AssetDef } from "../art/registry";
import type { Look } from "../lib/scene";
import { rateOf } from "../lib/scene";
import { mouthAt } from "../lib/lipsync";
import { speak } from "../lib/audio";
import { C } from "../lib/theme";
import type { Mouth, View as V } from "../art/shapes";

type Act = Exclude<AnimDef["id"], never>;

export const CharPreview = memo(function CharPreview({ asset, look, action, view, phase, mouth, w, h }: {
  asset: AssetDef; look?: Look; action: Act; view: V; phase: number; mouth?: Mouth | null; w: number; h: number;
}) {
  const shapes = buildAsset(asset, { action, phase, talk: 0, blink: false, view, mouth: mouth ?? null }, look);
  const k = Math.min(w / 280, h / 385);
  return (
    <Canvas style={{ width: w, height: h }}>
      <Group transform={[{ translateX: (w - 280 * k) / 2 + 110 * k }, { translateY: (h - 385 * k) / 2 + 375 * k }, { scale: k }]}>
        <Shapes shapes={shapes} p="cp" />
      </Group>
    </Canvas>
  );
});

const LIP_ACTS = new Set(["talk", "teach", "phone", "angry"]);

export default function AnimationPanel({ name, asset, look, curAction, curView, t, onAction, onAuto, onView, onSpeakAdd, onClose }: {
  name: string; asset: AssetDef; look?: Look; curAction: Act; curView: V; t: number;
  onAction: (a: Act) => void; onAuto: () => void; onView: (v: V) => void; onSpeakAdd: (text: string) => void; onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<AnimCat | "all">("all");
  const [focus, setFocus] = useState<Act>(curAction);
  const [tick, setTick] = useState(0);
  const [lip, setLip] = useState("নমস্কার, আমি তোমার বন্ধু।");
  useEffect(() => { const id = setInterval(() => setTick((x) => x + 1), 90); return () => clearInterval(id); }, []);
  const list = useMemo(() => searchAnims(q, cat), [q, cat]);
  const colW = Math.floor((Math.min(width, 560) - 32) / 3);
  const dt = tick * 0.09;
  const phaseOf = (a: string) => dt * rateOf(a);
  const lipDur = Math.max(1.5, lip.trim().length * 0.09);
  const mouth = LIP_ACTS.has(focus) ? mouthAt(lip, dt % (lipDur + 0.6), lipDur) : null;
  const sheetH = Math.round(height * 0.56);

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }} pointerEvents="none" />
      <View style={[s.sheet, { height: sheetH }]}>
        <View style={s.head}>
          <Text style={s.title} numberOfLines={1}>🎭 {name} — অ্যানিমেশন</Text>
          <TouchableOpacity onPress={onClose}><Text style={s.close}>বন্ধ</Text></TouchableOpacity>
        </View>
        <FlatList
          data={list} keyExtractor={(a) => a.id} numColumns={3} key={colW}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <View style={{ flexDirection: "row" }}>
                <View style={s.big}><CharPreview asset={asset} look={look} action={focus} view={curView} phase={phaseOf(focus)} mouth={mouth} w={120} h={150} /></View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={s.now}>এখন ({t.toFixed(1)}s-এ): {ANIMS.find((a) => a.id === curAction)?.bn ?? curAction} · {VIEWS.find((v) => v.id === curView)?.en}</Text>
                  <TextInput value={lip} onChangeText={setLip} placeholder="লিপ-সিঙ্ক টেস্ট: বাংলায় লিখুন" placeholderTextColor={C.dim} style={s.input} multiline />
                  <View style={{ flexDirection: "row", marginTop: 4 }}>
                    <TouchableOpacity style={s.mini} onPress={() => { setFocus("talk"); speak(lip); }}><Text style={s.miniTxt}>🔊 শুনুন</Text></TouchableOpacity>
                    <TouchableOpacity style={s.mini} onPress={() => { onSpeakAdd(lip); }}><Text style={s.miniTxt}>＋ দৃশ্যে যোগ</Text></TouchableOpacity>
                    <TouchableOpacity style={s.mini} onPress={onAuto}><Text style={s.miniTxt}>↺ অটো</Text></TouchableOpacity>
                  </View>
                  {mouth && <Text style={s.dim}>ঠোঁট: {mouth.shape} ({Math.round(mouth.open * 100)}%)</Text>}
                </View>
              </View>
              <Text style={s.sub}>দেখার দিক (ভিউ) — এই সময় থেকে</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {VIEWS.map((v) => (
                  <TouchableOpacity key={v.id} onPress={() => onView(v.id)} style={[s.view, curView === v.id && s.viewOn]}>
                    <CharPreview asset={asset} look={look} action="stand" view={v.id} phase={0.3} w={54} h={66} />
                    <Text style={[s.viewTxt, curView === v.id && { color: "#111" }]}>{v.en}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TextInput value={q} onChangeText={setQ} placeholder="🔍 অ্যানিমেশন খুঁজুন (যেমন: হাঁটা, cook, ভয়)" placeholderTextColor={C.dim} style={[s.input, { marginTop: 8 }]} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {ANIM_CATS.map((c) => <TouchableOpacity key={c.id} onPress={() => setCat(c.id)} style={[s.chip, cat === c.id && { backgroundColor: C.accent }]}><Text style={{ color: cat === c.id ? "#111" : C.text, fontWeight: "700", fontSize: 13 }}>{c.bn}</Text></TouchableOpacity>)}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={<Text style={s.dim}>কিছু পাওয়া যায়নি।</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={[s.card, { width: colW - 6 }, curAction === item.id && s.cardOn]} onPress={() => { setFocus(item.id as Act); onAction(item.id as Act); }}>
              <CharPreview asset={asset} look={look} action={item.id as Act} view={curView} phase={phaseOf(item.id)} w={colW - 22} h={Math.round((colW - 22) * 1.05)} />
              <Text style={s.cardTxt} numberOfLines={1}>{item.bn}</Text><Text style={s.cardEn} numberOfLines={1}>{item.en}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  sheet: { backgroundColor: C.panel, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 12, paddingTop: 12 },
  head: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }, title: { color: C.text, fontSize: 16, fontWeight: "700", flex: 1 }, close: { color: C.accent, fontWeight: "700", fontSize: 16 },
  big: { width: 120, height: 150, backgroundColor: "#fdfdf6", borderRadius: 12, overflow: "hidden" },
  now: { color: C.accent, fontSize: 12, fontWeight: "700", marginBottom: 4 }, dim: { color: C.dim, fontSize: 12, marginTop: 4 }, sub: { color: C.dim, fontSize: 12, marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: C.panel2, color: C.text, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  mini: { backgroundColor: C.panel2, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, marginRight: 5 }, miniTxt: { color: C.text, fontSize: 12, fontWeight: "600" },
  view: { alignItems: "center", backgroundColor: "#fdfdf6", borderRadius: 10, marginRight: 8, padding: 4, borderWidth: 2, borderColor: "transparent" }, viewOn: { borderColor: C.accent, backgroundColor: C.accent },
  viewTxt: { color: "#333", fontSize: 10, fontWeight: "700", marginTop: 2 },
  chip: { backgroundColor: C.panel2, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, marginRight: 6 },
  card: { backgroundColor: "#fdfdf6", borderRadius: 12, alignItems: "center", margin: 3, padding: 4, borderWidth: 2, borderColor: "transparent" }, cardOn: { borderColor: C.accent },
  cardTxt: { color: "#222", fontWeight: "800", fontSize: 13 }, cardEn: { color: "#666", fontSize: 10 },
});
