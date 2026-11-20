// "ভিডিও থেকে কার্টুন (পরীক্ষামূলক)": ভিডিও বাছুন → দুজনের জন্য চরিত্র বাছুন → ফোনের ভেতরেই তৈরি হয়ে এডিটরে খোলে।
import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { ASSETS } from "../art/registry";
import { BACKGROUNDS } from "../art/backgrounds";
import { C } from "../lib/theme";
import { Movie } from "../lib/scene";
import { saveMovie } from "../lib/storage";
import * as Sharing from "expo-sharing";
import { buildVideoCartoon } from "../lib/videoCartoon";
import { cartoonizeVideo } from "../lib/videoCartoonize";
import { saveToGallery } from "../lib/exporter";

const HUMANS = ASSETS.filter((a) => a.rig === "human" && (a.cat === "human" || a.cat === "hindu"));

export default function VideoCartoonScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (m: Movie) => void }) {
  const [video, setVideo] = useState<{ uri: string; name: string } | null>(null);
  const [a, setA] = useState("woman"), [b, setB] = useState("woman");
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [pct, setPct] = useState(0);
  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "video/*", copyToCacheDirectory: true });
    if (!r.canceled && r.assets?.[0]) setVideo({ uri: r.assets[0].uri, name: r.assets[0].name });
  };
  const [bgMode, setBgMode] = useState<"orig" | "cartoon" | "library">("cartoon");
  const [libId, setLibId] = useState(BACKGROUNDS[0].id);
  const [mode, setMode] = useState<"full" | "char">("full");
  const [fps, setFps] = useState<15 | 24 | 30>(15);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const log = (l: string) => setLogs((x) => [...x.slice(-30), l]);
  const go = async () => {
    if (!video) return; setBusy(true); setPct(0); setLogs([]); setDone(null); cancelRef.current = false;
    const ctl = { cancelled: () => cancelRef.current, log };
    try {
      if (mode === "full") {
        const r = await cartoonizeVideo(video.uri, { fps, levels: 7 }, (p, t) => { setPct(p); setMsg(t); }, ctl);
        setDone(r.path);
        Alert.alert("কার্টুন ভিডিও তৈরি", `${r.w}×${r.h}, ${r.frames} ফ্রেম, ${r.secs.toFixed(1)}s\nনিচের "গ্যালারিতে সেভ" চাপুন।` + (r.warnings.includes("no_audio") ? "\n(মূল ভিডিওতে অডিও পাওয়া যায়নি)" : ""));
      } else {
        const r = await buildVideoCartoon(video.uri, [a, b], (p, t) => { setPct(p); setMsg(t); }, ctl, { mode: bgMode, libId });
        await saveMovie(r.movie);
        if (r.notes.length) Alert.alert("জানিয়ে রাখি", r.notes.join("\n"));
        onOpen(r.movie);
      }
    } catch (e: any) { log("✘ " + String(e?.message ?? e)); Alert.alert(cancelRef.current ? "বাতিল" : "তৈরি করা যায়নি", String(e?.message ?? e)); } finally { setBusy(false); }
  };
  const save = async () => { try { const n = await saveToGallery(done!); Alert.alert("সেভ হয়েছে", "গ্যালারি/ভিডিও অ্যাপে দেখুন: " + n); } catch (e: any) { Alert.alert("ত্রুটি", String(e?.message ?? e)); } };
  const share = async () => { try { if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(done!, { mimeType: "video/mp4" }); } catch (e: any) { Alert.alert("ত্রুটি", String(e?.message ?? e)); } };
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
      <View style={{ flexDirection: "row", marginTop: 14 }}>
        <TouchableOpacity disabled={busy} onPress={() => setMode("full")} style={[s.chip, mode === "full" && s.chipOn]}><Text style={{ color: C.text }}>🎨 পুরো ভিডিও কার্টুন</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy} onPress={() => setMode("char")} style={[s.chip, mode === "char" && s.chipOn]}><Text style={{ color: C.text }}>🧑‍🤝‍🧑 অ্যাপের চরিত্র দিয়ে</Text></TouchableOpacity>
      </View>
      {mode === "full" ? (
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: C.dim }}>ভিডিওর প্রতিটি ফ্রেম ২ডি কার্টুন রূপে (রেখা + সমতল রং), মূল অডিও সহ MP4। মূল ভিডিওর মাপ/ফ্রেম-হার যতটা সম্ভব মেলানো হয় (সর্বোচ্চ ১২৮০×৭২০)।</Text>
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            {([15, 24, 30] as const).map((f) => <TouchableOpacity key={f} disabled={busy} onPress={() => setFps(f)} style={[s.chip, fps === f && s.chipOn]}><Text style={{ color: C.text }}>{f} fps{f === 15 ? " (দ্রুত)" : ""}</Text></TouchableOpacity>)}
          </View>
        </View>
      ) : (<>
        <Row title="বাঁ দিকের মানুষের চরিত্র" val={a} set={setA} />
        <Row title="ডান দিকের মানুষের চরিত্র" val={b} set={setB} />
        <View style={{ marginTop: 14 }}>
          <Text style={s.h}>পটভূমি</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {([["orig", "১) মূল ভিডিওর পটভূমি"], ["cartoon", "২) মূল পটভূমি কার্টুন করে"], ["library", "৩) নতুন কার্টুন পটভূমি"]] as const).map(([k, t]) => <TouchableOpacity key={k} disabled={busy} onPress={() => setBgMode(k)} style={[s.chip, bgMode === k && s.chipOn, { marginBottom: 6 }]}><Text style={{ color: C.text }}>{t}</Text></TouchableOpacity>)}
          </View>
          {bgMode === "library" ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{BACKGROUNDS.map((g) => <TouchableOpacity key={g.id} onPress={() => setLibId(g.id)} style={[s.chip, libId === g.id && s.chipOn]}><Text style={{ color: C.text }}>{g.name}</Text></TouchableOpacity>)}</ScrollView> : <Text style={{ color: C.dim, fontSize: 12 }}>মূল পটভূমি = ভিডিও থেকে মানুষ সরিয়ে বানানো; ক্যামেরা স্থির থাকলে ভালো হয়।</Text>}
        </View>
      </>)}
      <TouchableOpacity onPress={go} disabled={!video || busy} style={[s.btn, { marginTop: 22, opacity: video && !busy ? 1 : 0.5 }]}><Text style={{ color: "#1a1200", fontWeight: "800" }}>{busy ? "⏳ তৈরি হচ্ছে…" : "▶ কার্টুন বানান"}</Text></TouchableOpacity>
      {busy ? <View style={{ marginTop: 14 }}><ActivityIndicator color={C.accent} /><Text style={{ color: C.dim, marginTop: 8 }}>{Math.round(pct * 100)}% — {msg}</Text>
        <TouchableOpacity onPress={() => { cancelRef.current = true; }} style={[s.btn, { backgroundColor: C.panel2, marginTop: 10 }]}><Text style={{ color: C.text, fontWeight: "700" }}>✖ বাতিল</Text></TouchableOpacity></View> : null}
      {done && !busy ? <View style={{ flexDirection: "row", marginTop: 14 }}>
        <TouchableOpacity onPress={save} style={[s.btn, { flex: 1, marginRight: 8 }]}><Text style={{ color: "#1a1200", fontWeight: "800" }}>💾 গ্যালারিতে সেভ</Text></TouchableOpacity>
        <TouchableOpacity onPress={share} style={[s.btn, { flex: 1, backgroundColor: C.panel2 }]}><Text style={{ color: C.text, fontWeight: "700" }}>↗ শেয়ার</Text></TouchableOpacity></View> : null}
      <ScrollView style={{ marginTop: 12, maxHeight: 170 }}>{logs.map((l, i) => <Text key={i} style={{ color: l.startsWith("✘") ? "#ff8a8a" : C.dim, fontSize: 11 }}>{l}</Text>)}</ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  h: { color: C.text, fontWeight: "700", marginBottom: 6 },
  btn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  chip: { backgroundColor: C.panel, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: C.line },
  chipOn: { borderColor: C.accent, backgroundColor: "#3a2f10" },
});
