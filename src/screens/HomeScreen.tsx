import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Meta, deleteMovie, listMovies, loadMovie } from "../lib/storage";
import { Movie, newMovie } from "../lib/scene";
import { buildStory } from "../lib/story";
import { saveMovie as saveM } from "../lib/storage";
import { TOTAL_ASSETS } from "../art/registry";
import { C } from "../lib/theme";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { packProject, unpackProject } from "../lib/projectFile";
import { uid } from "../lib/scene";

export default function HomeScreen({ onOpen, onLibrary, onDemo }: { onOpen: (m: Movie) => void; onLibrary: () => void; onDemo: () => void }) {
  const [list, setList] = useState<Meta[]>([]);
  const [name, setName] = useState("");
  const refresh = useCallback(() => { listMovies().then(setList).catch(() => setList([])); }, []);
  useEffect(refresh, [refresh]);
  const open = async (id: string) => { try { onOpen(await loadMovie(id)); } catch (e: any) { Alert.alert("খোলা যায়নি", String(e?.message ?? e)); } };
  const [busy, setBusy] = useState(false);
  const story = async () => {
    setBusy(true);
    try { const r = await buildStory(); await saveM(r.movie); refresh(); if (r.note) Alert.alert("ভয়েস নিয়ে জানুন", r.note + "\n\nভয়েস ছাড়াই গল্প তৈরি হয়েছে; এক্সপোর্টের সময় ফোনের ভয়েস বলবে।"); onOpen(r.movie); }
    catch (e: any) { Alert.alert("গল্প তৈরি হয়নি", String(e?.message ?? e)); }
    finally { setBusy(false); }
  };
  const exportProj = async (id: string) => {
    try {
      const m = await loadMovie(id); const safe = m.name.replace(/[^\p{L}\p{N}_-]+/gu, "_") || "project";
      const uri = (FileSystem.cacheDirectory ?? "") + safe + ".bcsproj"; await FileSystem.writeAsStringAsync(uri, packProject(m));
      if (!(await Sharing.isAvailableAsync())) throw new Error("শেয়ার করার সুবিধা নেই");
      await Sharing.shareAsync(uri, { mimeType: "application/octet-stream", dialogTitle: "প্রজেক্ট এক্সপোর্ট (.bcsproj)" });
    } catch (e: any) { Alert.alert("এক্সপোর্ট হয়নি", String(e?.message ?? e)); }
  };
  const importProj = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true }); if (r.canceled || !r.assets?.[0]) return;
      const m = unpackProject(await FileSystem.readAsStringAsync(r.assets[0].uri)); const copy = { ...m, id: uid(), name: m.name + " (ইমপোর্ট)", updatedAt: Date.now() };
      await saveM(copy); refresh(); Alert.alert("ইমপোর্ট সম্পন্ন", `"${copy.name}" তালিকায় যোগ হয়েছে। (ভয়েস/মিউজিক ফাইল এক ডিভাইস থেকে অন্যটিতে যায় না; সংলাপের লেখা ও চরিত্র যায়।)`);
    } catch (e: any) { Alert.alert("ইমপোর্ট হয়নি", String(e?.message ?? e)); }
  };
  const create = () => onOpen(newMovie(name.trim() || "আমার কার্টুন"));
  return (
    <View style={s.root}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Image source={require("../../assets/logo.png")} style={{ width: 64, height: 64, marginRight: 12 }} />
        <Text style={[s.h1, { flex: 1 }]}>Bengali Cartoon Studio</Text>
      </View>
      <Text style={s.sub}>আঁকতে হবে না — তৈরি {TOTAL_ASSETS}টি কার্টুন দিয়ে ভিডিও বানান</Text>
      <View style={s.new}>
        <TextInput value={name} onChangeText={setName} placeholder="নতুন ভিডিওর নাম" placeholderTextColor={C.dim} style={s.input} />
        <TouchableOpacity style={s.btn} onPress={create}><Text style={s.btnTxt}>＋ নতুন</Text></TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onLibrary} style={s.lib}><Text style={{ color: C.text, fontWeight: "700" }}>📚 অ্যাসেট লাইব্রেরি দেখুন ({TOTAL_ASSETS}টি)</Text></TouchableOpacity>
      <TouchableOpacity onPress={onDemo} style={[s.lib, { backgroundColor: "#1d3b37" }]}><Text style={{ color: C.text, fontWeight: "700" }}>🎭 অ্যানিমেশন ডেমো — ৩০টি অ্যানিমেশন চালিয়ে দেখুন</Text></TouchableOpacity>
      <TouchableOpacity onPress={story} disabled={busy} style={[s.lib, { backgroundColor: "#3b2d1d" }]}><Text style={{ color: C.text, fontWeight: "700" }}>{busy ? "⏳ গল্প তৈরি হচ্ছে…" : "📖 গল্প: টুকাই ও মিনি — হারানো সাইকেল (৫ দৃশ্য)"}</Text></TouchableOpacity>
      <TouchableOpacity onPress={importProj} style={[s.lib, { backgroundColor: "#1d2b3b" }]}><Text style={{ color: C.text, fontWeight: "700" }}>📥 প্রজেক্ট ইমপোর্ট (.bcsproj — Windows থেকেও)</Text></TouchableOpacity>
      <Text style={s.h2}>সেভ করা প্রজেক্ট</Text>
      <FlatList data={list} keyExtractor={(m) => m.id} ListEmptyComponent={<Text style={{ color: C.dim }}>এখনও কোনো প্রজেক্ট নেই।</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.item} onPress={() => open(item.id)}>
            <View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: "700", fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: C.dim, fontSize: 12 }}>{item.scenes}টি দৃশ্য · {new Date(item.updatedAt).toLocaleString()}</Text></View>
            <TouchableOpacity onPress={() => exportProj(item.id)} style={{ marginRight: 14 }}><Text style={{ fontSize: 20 }}>📤</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => Alert.alert("মুছবেন?", item.name, [{ text: "না" }, { text: "মুছুন", style: "destructive", onPress: () => deleteMovie(item.id).then(refresh) }])}><Text style={{ fontSize: 20 }}>🗑</Text></TouchableOpacity>
          </TouchableOpacity>)} />
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 16, paddingTop: 48 },
  h1: { color: C.text, fontSize: 24, fontWeight: "800" }, sub: { color: C.dim, marginTop: 4, marginBottom: 16 }, h2: { color: C.text, fontWeight: "700", marginTop: 18, marginBottom: 8 },
  new: { flexDirection: "row" }, input: { flex: 1, backgroundColor: C.panel2, color: C.text, borderRadius: 10, padding: 12, marginRight: 8 },
  btn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 18, justifyContent: "center" }, btnTxt: { color: "#111", fontWeight: "800" },
  lib: { backgroundColor: C.panel, padding: 14, borderRadius: 12, marginTop: 12 },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: C.panel, padding: 14, borderRadius: 12, marginBottom: 8 },
});
