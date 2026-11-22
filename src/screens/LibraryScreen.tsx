import React, { useEffect, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Canvas, Group } from "@shopify/react-native-skia";
import { ASSETS, CATS, Cat, getAsset } from "../art/registry";
import { BACKGROUNDS } from "../art/backgrounds";
import { AssetThumb, BgThumb, Shapes } from "../components/StageView";
import { buildAsset } from "../lib/render";
import { ACTION_BN, C } from "../lib/theme";
import type { Action } from "../art/shapes";
import * as DocumentPicker from "expo-document-picker";
import { Alert } from "react-native";
import { deleteUserChar, importCharacterImage } from "../lib/userChars";

function Preview({ id, action }: { id: string; action: Exclude<Action, "auto"> }) {
  const a = getAsset(id)!;
  const [ph, setPh] = useState(0);
  useEffect(() => { let r = 0, t0 = Date.now(); const f = () => { setPh((Date.now() - t0) / 1000 * 1.2); r = requestAnimationFrame(f); }; r = requestAnimationFrame(f); return () => cancelAnimationFrame(r); }, []);
  const [x1, y1, x2, y2] = a.bounds, w = x2 - x1, h = y2 - y1, k = Math.min(260 / w, 220 / h) * 0.85;
  const shapes = buildAsset(a, { action, phase: ph, talk: action === "stand" ? 0 : 0, blink: false });
  return (
    <Canvas style={{ width: 300, height: 260 }}>
      <Group transform={[{ translateX: 150 - ((x1 + x2) / 2) * k }, { translateY: 130 - ((y1 + y2) / 2) * k }, { scale: k }]}><Shapes shapes={shapes} p="pv" /></Group>
    </Canvas>
  );
}

export default function LibraryScreen({ onBack }: { onBack: () => void }) {
  const [cat, setCat] = useState<Cat>("human");
  const [sel, setSel] = useState<string | null>(null);
  const [act, setAct] = useState<Exclude<Action, "auto">>("stand");
  const [q, setQ] = useState("");
  const [, force] = useState(0);
  const addPhoto = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true }); if (r.canceled || !r.assets?.[0]) return;
      const a = r.assets[0]; const res = await importCharacterImage(a.uri, (a.name ?? "আমার চরিত্র").replace(/\.[^.]+$/, ""));
      setCat("photo"); force((n) => n + 1); Alert.alert("চরিত্র যোগ হয়েছে", `${res.added.length}টি চরিত্র লাইব্রেরির "আমার ছবির চরিত্র" ট্যাবে যোগ হয়েছে।${res.notes.length ? "\n" + res.notes.join("\n") : ""}`);
    } catch (e: any) { Alert.alert("যোগ করা যায়নি", String(e?.message ?? e)); }
  };
  const a = sel ? getAsset(sel) : null;
  const qq = q.trim().toLowerCase();
  // খোঁজ: নাম মিললে সব ধরনের মধ্যে থেকে দেখায়; না থাকলে নির্বাচিত ধরনের তালিকা
  const list = ASSETS.filter((x) => (qq ? x.name.toLowerCase().includes(qq) || x.id.includes(qq) : x.cat === cat));
  const bgList = BACKGROUNDS.filter((b) => !qq || b.name.toLowerCase().includes(qq) || b.id.includes(qq));
  const showBg = qq ? bgList.length > 0 && list.length === 0 : cat === "bg";
  return (
    <View style={s.root}>
      <View style={s.top}><TouchableOpacity onPress={onBack}><Text style={s.back}>← ফিরুন</Text></TouchableOpacity><Text style={s.t}>অ্যাসেট লাইব্রেরি</Text></View>
      <TouchableOpacity onPress={addPhoto} style={{ backgroundColor: C.accent, margin: 10, marginBottom: 0, padding: 12, borderRadius: 10, alignItems: "center" }}><Text style={{ color: "#111", fontWeight: "800" }}>➕ নিজের ছবি থেকে চরিত্র যোগ করুন (স্বচ্ছ PNG)</Text></TouchableOpacity>
      <TextInput value={q} onChangeText={setQ} placeholder="🔎 খুঁজুন (যেমন: মন্দির, নদী, গাড়ি)" placeholderTextColor={C.dim} style={s.search} />
      <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false}>
        {CATS.map((c) => <TouchableOpacity key={c.id} onPress={() => { setCat(c.id); setSel(null); }} style={[s.tab, cat === c.id && { backgroundColor: C.accent }]}><Text style={{ color: cat === c.id ? "#111" : C.text, fontWeight: "700" }}>{c.name}</Text></TouchableOpacity>)}
      </ScrollView>
      {a && (
        <View style={{ alignItems: "center" }}>
          <Preview id={a.id} action={act} /><Text style={s.t}>{a.name}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
            {a.actions.map((x) => <TouchableOpacity key={x} onPress={() => setAct(x as Exclude<Action, "auto">)} style={[s.tab, act === x && { backgroundColor: C.teal }]}><Text style={{ color: C.text }}>{ACTION_BN[x] ?? x}</Text></TouchableOpacity>)}
          </View>
        </View>
      )}
      <FlatList key={cat + (showBg ? "b" : "a")} numColumns={showBg ? 2 : 3} data={showBg ? (bgList as any[]) : (list as any[])} keyExtractor={(x) => x.id} contentContainerStyle={{ padding: 8 }}
        renderItem={({ item }) => showBg
          ? <View style={s.cell}><BgThumb id={item.id} w={150} /><Text style={s.n}>{item.name}</Text></View>
          : <TouchableOpacity style={[s.cell, sel === item.id && { borderColor: C.accent, borderWidth: 2 }]} onPress={() => { setSel(item.id); setAct(item.defaultAction); }}><AssetThumb asset={item} size={84} /><Text style={s.n}>{item.name}</Text></TouchableOpacity>} />
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 40 }, top: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingBottom: 8 },
  back: { color: C.accent, fontWeight: "700", marginRight: 12 }, t: { color: C.text, fontSize: 17, fontWeight: "700" },
  search: { backgroundColor: C.panel2, color: C.text, marginHorizontal: 12, marginBottom: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: C.panel2, margin: 4 },
  cell: { flex: 1, alignItems: "center", backgroundColor: C.panel, borderRadius: 12, margin: 4, padding: 8 }, n: { color: C.text, marginTop: 4, fontSize: 12 },
});
