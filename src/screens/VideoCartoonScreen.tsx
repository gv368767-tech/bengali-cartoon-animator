// "ভিডিও থেকে কার্টুন (পরীক্ষামূলক)": ভিডিও বাছুন → দুজনের জন্য চরিত্র বাছুন → ফোনের ভেতরেই তৈরি হয়ে এডিটরে খোলে।
import React, { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { ASSETS } from "../art/registry";
import { C } from "../lib/theme";
import { Movie } from "../lib/scene";
import { saveMovie } from "../lib/storage";
import { buildVideoCartoon } from "../lib/videoCartoon";
import { BG_MODES, BgMode, CartoonResult, cancelCartoon, cartoonizeVideo } from "../lib/cartoonize";
import { saveToGallery } from "../lib/exporter";
import * as Sharing from "expo-sharing";
import { ResizeMode, Video } from "expo-av";

const HUMANS = ASSETS.filter((a) => a.rig === "human" && (a.cat === "human" || a.cat === "hindu"));

export default function VideoCartoonScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (m: Movie) => void }) {
  const [video, setVideo] = useState<{ uri: string; name: string } | null>(null);
  const [a, setA] = useState("woman"), [b, setB] = useState("woman");
  const [mode, setMode] = useState<"full" | "dance">("full");
  const [bg, setBg] = useState<BgMode>(0), [test5, setTest5] = useState(false);
  const [res, setRes] = useState<CartoonResult | null>(null), [err, setErr] = useState("");
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [pct, setPct] = useState(0);
  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: "video/*", copyToCacheDirectory: true });
    if (!r.canceled && r.assets?.[0]) setVideo({ uri: r.assets[0].uri, name: r.assets[0].name });
  };
  const goFull = async () => {
    if (!video) return; setBusy(true); setPct(0); setRes(null); setErr(""); setMsg("শুরু হচ্ছে…");
    try { setRes(await cartoonizeVideo(video.uri, { bg, maxFrames: test5 ? 150 : 0 }, (p, t) => { setPct(p); setMsg(t); })); }
    catch (e: any) { setErr(String(e?.message ?? e)); } finally { setBusy(false); }
  };
  const save = async () => { try { const n = await saveToGallery(res!.path); Alert.alert("সেভ হয়েছে", "ফোনের গ্যালারি/ভিডিও অ্যাপে দেখুন:\n" + n); } catch (e: any) { Alert.alert("সেভ হয়নি", String(e?.message ?? e)); } };
  const share = async () => { try { if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(res!.path.startsWith("file") ? res!.path : "file://" + res!.path, { mimeType: "video/mp4" }); else Alert.alert("শেয়ার সম্ভব নয়"); } catch (e: any) { Alert.alert("শেয়ার হয়নি", String(e?.message ?? e)); } };
  const go = async () => {
    if (!video) return; setBusy(true); setPct(0);
    try {
      const r = await buildVideoCartoon(video.uri, [a, b], (p, t) => { setPct(p); setMsg(t); });
      await saveMovie(r.movie);
      if (r.notes.length) Alert.alert("জানিয়ে রাখি", r.notes.join("\n"));
      onOpen(r.movie);
    } catch (e: any) { setErr(String(e?.message ?? e)); } finally { setBusy(false); }
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
      <Text style={{ color: C.text, fontSize: 20, fontWeight: "800", marginTop: 10 }}>🎥 ভিডিও থেকে কার্টুন</Text>
      <View style={{ flexDirection: "row", marginTop: 10 }}>
        <TouchableOpacity disabled={busy} onPress={() => setMode("full")} style={[s.chip, mode === "full" && s.chipOn]}><Text style={{ color: C.text }}>🎨 পুরো ভিডিও কার্টুন</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy} onPress={() => setMode("dance")} style={[s.chip, mode === "dance" && s.chipOn]}><Text style={{ color: C.text }}>💃 চরিত্র দিয়ে নাচ</Text></TouchableOpacity>
      </View>
      <Text style={{ color: C.dim, marginTop: 6 }}>সবকিছু ফোনের ভেতরেই হয়। ভিডিও কোথাও পাঠানো হয় না।{mode === "dance" ? " স্থির ক্যামেরা, পুরো শরীর দেখা যায়, দুজন পর্যন্ত — এমন ভিডিওতে সবচেয়ে ভালো।" : " প্রতিটি ফ্রেম কার্টুন-শৈলীতে বদলে মূল অডিওসহ নতুন MP4 হয়।"}</Text>
      <TouchableOpacity onPress={pick} disabled={busy} style={[s.btn, { backgroundColor: C.panel2, marginTop: 14 }]}><Text style={{ color: C.text, fontWeight: "700" }}>{video ? "📹 " + video.name : "📹 ভিডিও বাছুন"}</Text></TouchableOpacity>
      {mode === "dance" ? (<>
        <Row title="বাঁ দিকের মানুষের চরিত্র" val={a} set={setA} />
        <Row title="ডান দিকের মানুষের চরিত্র" val={b} set={setB} />
      </>) : (<>
        <Text style={[s.h, { marginTop: 14 }]}>পটভূমি</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {BG_MODES.map((m) => <TouchableOpacity key={m.id} disabled={busy} onPress={() => setBg(m.id)} style={[s.chip, bg === m.id && s.chipOn]}><Text style={{ color: C.text }}>{m.name}</Text></TouchableOpacity>)}
        </ScrollView>
        <Text style={{ color: C.dim, marginTop: 4, fontSize: 12 }}>{BG_MODES.find((m) => m.id === bg)?.hint}</Text>
        <TouchableOpacity disabled={busy} onPress={() => setTest5((v) => !v)} style={{ marginTop: 10 }}><Text style={{ color: C.text }}>{test5 ? "☑" : "☐"} শুধু প্রথম ৫ সেকেন্ড (পরীক্ষার জন্য)</Text></TouchableOpacity>
      </>)}
      <TouchableOpacity onPress={mode === "full" ? goFull : go} disabled={!video || busy} style={[s.btn, { marginTop: 18, opacity: video && !busy ? 1 : 0.5 }]}><Text style={{ color: "#1a1200", fontWeight: "800" }}>{busy ? "⏳ তৈরি হচ্ছে…" : "▶ কার্টুন বানান"}</Text></TouchableOpacity>
      {busy ? <View style={{ marginTop: 14 }}>
        <View style={{ height: 8, backgroundColor: C.panel2, borderRadius: 4, overflow: "hidden" }}><View style={{ height: 8, width: `${Math.round(pct * 100)}%`, backgroundColor: C.accent }} /></View>
        <Text style={{ color: C.dim, marginTop: 8 }}>{Math.round(pct * 100)}% — {msg}</Text>
        <TouchableOpacity onPress={() => cancelCartoon()} style={[s.btn, { backgroundColor: "#5a1f1f", marginTop: 10 }]}><Text style={{ color: C.text, fontWeight: "700" }}>✖ বাতিল</Text></TouchableOpacity>
      </View> : null}
      {err ? <View style={{ marginTop: 14, padding: 12, borderRadius: 10, backgroundColor: "#3b1616" }}><Text style={{ color: "#ffb4b4", fontWeight: "700" }}>ত্রুটি</Text><Text style={{ color: C.text, marginTop: 4 }} selectable>{err}</Text></View> : null}
      {res ? <ScrollView style={{ marginTop: 14 }}>
        <Video source={{ uri: res.path.startsWith("file") ? res.path : "file://" + res.path }} style={{ height: 280, backgroundColor: "#000", borderRadius: 10 }} useNativeControls resizeMode={ResizeMode.CONTAIN} />
        <Text style={{ color: C.text, marginTop: 8 }}>✅ {res.w}x{res.h}, {res.fps} fps, {res.frames} ফ্রেম, {(res.bytes / 1048576).toFixed(1)} MB, {(res.ms / 1000).toFixed(0)} সেকেন্ডে{res.audio ? ", মূল অডিওসহ" : ", অডিও ছাড়া"}</Text>
        {res.warnings.map((w, i) => <Text key={i} style={{ color: "#ffd479", marginTop: 4 }}>⚠ {w}</Text>)}
        {bg !== 0 && !res.bgApplied ? <Text style={{ color: "#ffd479", marginTop: 4 }}>⚠ পটভূমি আলাদা করা যায়নি — পুরো ছবি কার্টুন হয়েছে</Text> : null}
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          <TouchableOpacity onPress={save} style={[s.btn, { flex: 1, marginRight: 8 }]}><Text style={{ color: "#1a1200", fontWeight: "800" }}>💾 ফোনে সেভ</Text></TouchableOpacity>
          <TouchableOpacity onPress={share} style={[s.btn, { flex: 1, backgroundColor: C.panel2 }]}><Text style={{ color: C.text, fontWeight: "700" }}>📤 শেয়ার</Text></TouchableOpacity>
        </View>
      </ScrollView> : null}
    </View>
  );
}
const s = StyleSheet.create({
  h: { color: C.text, fontWeight: "700", marginBottom: 6 },
  btn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  chip: { backgroundColor: C.panel, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: C.line },
  chipOn: { borderColor: C.accent, backgroundColor: "#3a2f10" },
});
