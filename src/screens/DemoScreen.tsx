// অ্যানিমেশন ডেমো: একটি ক্যারেক্টার বেছে সব অ্যানিমেশন Play / Pause / Stop করে দেখুন, সার্চ করুন।
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Canvas, Group } from "@shopify/react-native-skia";
import { ASSETS, getAsset } from "../art/registry";
import { ANIMS, ANIM_CATS, AnimCat, VIEWS, searchAnims } from "../art/anim";
import { AssetThumb, Shapes } from "../components/StageView";
import { buildAsset } from "../lib/render";
import { rateOf } from "../lib/scene";
import { mouthAt } from "../lib/lipsync";
import { speak, stopSpeech } from "../lib/audio";
import { C } from "../lib/theme";
import { L, Shape, View as V } from "../art/shapes";

const LIP_ACTS = new Set(["talk", "teach", "phone", "angry"]);
const HUMAN_IDS = ASSETS.filter((a) => a.cat === "human").map((a) => a.id);
const SEG = 4; // "সব চালান"-এ প্রতিটি অ্যানিমেশন ৪ সেকেন্ড

export default function DemoScreen({ onBack }: { onBack: () => void }) {
  const { width } = useWindowDimensions();
  const W = Math.min(width, 560) - 24, H = Math.round(W * 0.82);
  const [who, setWho] = useState(HUMAN_IDS[0]);
  const [view, setView] = useState<V>("front");
  const [anim, setAnim] = useState<string>("walk");
  const [playing, setPlaying] = useState(true);
  const [all, setAll] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [t, setT] = useState(0);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<AnimCat | "all">("all");
  const [lip, setLip] = useState("নমস্কার, আমি তোমার বন্ধু। আজ আমরা গল্প করব।");
  const R = useRef({ playing, speed });
  R.current = { playing, speed };

  useEffect(() => {
    let raf = 0, last = Date.now();
    const tick = () => {
      const now = Date.now(), dt = (now - last) / 1000; last = now;
      if (R.current.playing) setT((x) => x + dt * R.current.speed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); stopSpeech(); };
  }, []);

  const curAnim = all ? ANIMS[Math.floor(t / SEG) % ANIMS.length].id : anim;
  const asset = getAsset(who)!;
  const lipDur = Math.max(1.5, lip.trim().length * 0.09);
  const mouth = LIP_ACTS.has(curAnim) ? mouthAt(lip, t % (lipDur + 0.6), lipDur) : null;
  const phase = t * rateOf(curAnim);
  const blink = (t % 3.4) < 0.12;

  const shapes = useMemo(() => buildAsset(asset, { action: curAnim as any, phase, talk: 0, blink, view, mouth }), [asset, curAnim, phase, blink, view, mouth]);
  const ground: Shape[] = useMemo(() => {
    const g: Shape[] = [L(-300, 0, 400, 0, 4, "#9aa38f")];
    const moving = curAnim === "walk" || curAnim === "run" || curAnim === "carry";
    const off = moving ? -((phase * 22) % 70) : 0;
    for (let i = -6; i < 8; i++) g.push(L(i * 70 + off, 14, i * 70 + off + 34, 14, 3, "#b9c0ae"));
    return g;
  }, [curAnim, phase]);
  const k = Math.min(W / 280, H / 385);

  const list = useMemo(() => searchAnims(q, cat), [q, cat]);
  const info = ANIMS.find((a) => a.id === curAnim);

  const stop = () => { setPlaying(false); setT(0); setAll(false); stopSpeech(); };
  const pick = (id: string) => { setAll(false); setAnim(id); setT(0); setPlaying(true); };

  return (
    <View style={s.root}>
      <View style={s.top}><TouchableOpacity onPress={() => { stopSpeech(); onBack(); }}><Text style={s.back}>← ফিরুন</Text></TouchableOpacity><Text style={s.title}>🎭 অ্যানিমেশন ডেমো</Text></View>
      <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginVertical: 6 }}>
          {HUMAN_IDS.map((id) => (
            <TouchableOpacity key={id} onPress={() => setWho(id)} style={[s.who, who === id && s.whoOn]}><AssetThumb asset={getAsset(id)!} size={54} /><Text style={s.whoTxt}>{getAsset(id)!.name}</Text></TouchableOpacity>))}
        </ScrollView>

        <View style={[s.stage, { width: W, height: H }]}>
          <Canvas style={{ width: W, height: H }}>
            <Group transform={[{ translateX: (W - 280 * k) / 2 + 110 * k }, { translateY: H - 24 * k }, { scale: k }]}>
              <Shapes shapes={ground} p="g" />
              <Shapes shapes={shapes} p="c" />
            </Group>
          </Canvas>
          <View style={s.badge}><Text style={s.badgeTxt}>{info?.bn} · {info?.en}{all ? `  (${(Math.floor(t / SEG) % ANIMS.length) + 1}/${ANIMS.length})` : ""}</Text></View>
        </View>

        <View style={[s.row, { width: W }]}>
          <TouchableOpacity style={[s.tb, playing && s.tbOn]} onPress={() => setPlaying(true)}><Text style={s.tbTxt}>▶ Play</Text></TouchableOpacity>
          <TouchableOpacity style={[s.tb, !playing && t > 0 && s.tbOn]} onPress={() => setPlaying(false)}><Text style={s.tbTxt}>⏸ Pause</Text></TouchableOpacity>
          <TouchableOpacity style={s.tb} onPress={stop}><Text style={s.tbTxt}>⏹ Stop</Text></TouchableOpacity>
          <TouchableOpacity style={[s.tb, all && s.tbOn]} onPress={() => { setAll(!all); setT(0); setPlaying(true); }}><Text style={s.tbTxt}>🔁 সব {ANIMS.length}টি</Text></TouchableOpacity>
        </View>
        <View style={[s.row, { width: W }]}>
          <Text style={s.dim}>গতি </Text>
          {[0.5, 1, 1.5, 2].map((v) => <TouchableOpacity key={v} onPress={() => setSpeed(v)} style={[s.chip, speed === v && s.chipOn]}><Text style={[s.chipTxt, speed === v && { color: "#111" }]}>{v}×</Text></TouchableOpacity>)}
          <Text style={[s.dim, { marginLeft: "auto" }]}>{t.toFixed(1)}s</Text>
        </View>

        <Text style={[s.sub, { width: W }]}>ভিউ</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: W, flexGrow: 0 }}>
          {VIEWS.map((v) => <TouchableOpacity key={v.id} onPress={() => setView(v.id)} style={[s.chip, view === v.id && s.chipOn]}><Text style={[s.chipTxt, view === v.id && { color: "#111" }]}>{v.en}</Text></TouchableOpacity>)}
        </ScrollView>

        <Text style={[s.sub, { width: W }]}>লিপ-সিঙ্ক (কথা বলা/পড়ানো/ফোন/রাগে ঠোঁট এই লেখা অনুযায়ী নড়ে)</Text>
        <View style={{ width: W, flexDirection: "row" }}>
          <TextInput value={lip} onChangeText={setLip} multiline placeholder="বাংলায় লিখুন" placeholderTextColor={C.dim} style={[s.input, { flex: 1 }]} />
          <TouchableOpacity style={[s.tb, { marginLeft: 6, alignSelf: "center" }]} onPress={() => { pick("talk"); speak(lip); }}><Text style={s.tbTxt}>🔊 বলুন</Text></TouchableOpacity>
        </View>
        <Text style={[s.dim, { width: W, marginTop: 4 }]}>ঠোঁটের আকৃতি এখন: {mouth ? `${mouth.shape} (${Math.round(mouth.open * 100)}%)` : LIP_ACTS.has(curAnim) ? "বিরতি" : "—"}</Text>

        <TextInput value={q} onChangeText={setQ} placeholder="🔍 অ্যানিমেশন খুঁজুন (হাঁটা, cook, ভয়…)" placeholderTextColor={C.dim} style={[s.input, { width: W, marginTop: 12 }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: W, flexGrow: 0, marginTop: 6 }}>
          {ANIM_CATS.map((c) => <TouchableOpacity key={c.id} onPress={() => setCat(c.id)} style={[s.chip, cat === c.id && s.chipOn]}><Text style={[s.chipTxt, cat === c.id && { color: "#111" }]}>{c.bn}</Text></TouchableOpacity>)}
        </ScrollView>
        <View style={[s.wrap, { width: W }]}>
          {list.map((a) => (
            <TouchableOpacity key={a.id} onPress={() => pick(a.id)} style={[s.an, !all && anim === a.id && s.anOn]}><Text style={[s.anTxt, !all && anim === a.id && { color: "#111" }]}>{a.bn}</Text><Text style={[s.anEn, !all && anim === a.id && { color: "#333" }]}>{a.en}</Text></TouchableOpacity>))}
          {!list.length && <Text style={s.dim}>কিছু পাওয়া যায়নি।</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 40 }, top: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 6 },
  back: { color: C.accent, fontWeight: "700", marginRight: 12 }, title: { color: C.text, fontSize: 17, fontWeight: "700" },
  who: { alignItems: "center", backgroundColor: C.panel, borderRadius: 12, padding: 4, marginHorizontal: 3, borderWidth: 2, borderColor: "transparent" }, whoOn: { borderColor: C.accent }, whoTxt: { color: C.text, fontSize: 11 },
  stage: { backgroundColor: "#fdfdf6", borderRadius: 14, overflow: "hidden" },
  badge: { position: "absolute", top: 8, left: 8, backgroundColor: "#000a", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }, badgeTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 8, flexWrap: "wrap" },
  tb: { backgroundColor: C.panel2, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, marginRight: 6, marginBottom: 4 }, tbOn: { backgroundColor: C.teal }, tbTxt: { color: C.text, fontWeight: "700", fontSize: 13 },
  chip: { backgroundColor: C.panel2, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, marginRight: 6 }, chipOn: { backgroundColor: C.accent }, chipTxt: { color: C.text, fontSize: 13, fontWeight: "600" },
  dim: { color: C.dim, fontSize: 12 }, sub: { color: C.dim, fontSize: 12, marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: C.panel2, color: C.text, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 15 },
  wrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  an: { backgroundColor: C.panel, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginRight: 6, marginBottom: 6 }, anOn: { backgroundColor: C.accent }, anTxt: { color: C.text, fontWeight: "700", fontSize: 14 }, anEn: { color: C.dim, fontSize: 10 },
});
