// "ভিডিও থেকে কার্টুন (পরীক্ষামূলক)": ভিডিও বাছুন → দুজনের জন্য চরিত্র বাছুন → ফোনের ভেতরেই তৈরি হয়ে এডিটরে খোলে।
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { ASSETS } from "../art/registry";
import { C } from "../lib/theme";
import { Movie } from "../lib/scene";
import { saveMovie } from "../lib/storage";
import { buildVideoCartoon } from "../lib/videoCartoon";

const HUMANS = ASSETS.filter((a) => a.rig === "human" && (a.cat === "human" || a.cat === "hindu"));

export default function VideoCartoonScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (m: Movie) => void }) {
  const [video, setVideo] = useState<{ uri: string; name: string } | null>(null);
  const [a, setA] = useState("woman"), [b, setB] = useState("woman");
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [pct, setPct] = useState(0);
  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "video/*", copyToCacheDirectory: true });
    if (!r.canceled && r.assets?.[0]) setVideo({ uri: r.assets[0].uri, name: r.assets[0].name });
  };
  const go = async () => {
    if (!video) return; setBusy(true); setPct(0);
    try {
      const r = await buildVideoCartoon(video.uri, [a, b], (p, t) => { setPct(p); setMsg(t); });
      await saveMovie(r.movie);
      if (r.notes.length) Alert.alert("জানিয়ে রাখি", r.notes.join("\n"));
      onOpen(r.movie);
    } catch (e: any) { Alert.alert("তৈরি করা যায়নি", String(e?.message ?? e)); } finally { setBusy(false); }
  };
  const Row = ({ title, val, set }: { title: string; val: string; set: (s: string) => void }) => (
    <View style={{ marginTop: 14 }}>
      <Text style={s.h}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {HUMANS.map((h) => <TouchableOpacity key={h.id} onPress={() => set(h.id)} style={[s.chip, val === h.id && s.chipOn]}><Text style={{ color: C.text }}>{h.name}</Text></TouchableOpacity>)}
      </ScrollView>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, padding: 16, paddingTop: 44 }}>
      <TouchableOpacity onPress={onBack} disabled={busy}><Text style={{ color: C.accent, fontWeight: "700" }}>← ফিরে যান</Text></TouchableOpacity>
      <Text style={{ color: C.text, fontSize: 20, fontWeight: "800", marginTop: 10 }}>🎥 ভিডিও থেকে কার্টুন (পরীক্ষামূলক)</Text>
      <Text style={{ color: C.dim, marginTop: 6 }}>সবকিছু ফোনের ভেতরেই হয়। ভিডিও কোথাও পাঠানো হয় না। স্থির ক্যামেরা, পুরো শরীর দেখা যায়, দুজন পর্যন্ত — এমন ভিডিওতে সবচেয়ে ভালো কাজ করে।</Text>
      <TouchableOpacity onPress={pick} disabled={busy} style={[s.btn, { backgroundColor: C.panel2, marginTop: 14 }]}><Text style={{ color: C.text, fontWeight: "700" }}>{video ? "📹 " + video.name : "📹 ভিডিও বাছুন"}</Text></TouchableOpacity>
      <Row title="বাঁ দিকের মানুষের চরিত্র" val={a} set={setA} />
      <Row title="ডান দিকের মানুষের চরিত্র" val={b} set={setB} />
      <TouchableOpacity onPress={go} disabled={!video || busy} style={[s.btn, { marginTop: 22, opacity: video && !busy ? 1 : 0.5 }]}><Text style={{ color: "#1a1200", fontWeight: "800" }}>{busy ? "⏳ তৈরি হচ্ছে…" : "▶ কার্টুন বানান"}</Text></TouchableOpacity>
      {busy ? <View style={{ marginTop: 14 }}><ActivityIndicator color={C.accent} /><Text style={{ color: C.dim, marginTop: 8 }}>{Math.round(pct * 100)}% — {msg}</Text></View> : null}
    </View>
  );
}
const s = StyleSheet.create({
  h: { color: C.text, fontWeight: "700", marginBottom: 6 },
  btn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  chip: { backgroundColor: C.panel, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: C.line },
  chipOn: { borderColor: C.accent, backgroundColor: "#3a2f10" },
});
