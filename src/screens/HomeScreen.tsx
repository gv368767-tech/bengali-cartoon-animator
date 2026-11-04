import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Meta, deleteMovie, listMovies, loadMovie } from "../lib/storage";
import { Movie, newMovie } from "../lib/scene";
import { TOTAL_ASSETS } from "../art/registry";
import { C } from "../lib/theme";

export default function HomeScreen({ onOpen, onLibrary }: { onOpen: (m: Movie) => void; onLibrary: () => void }) {
  const [list, setList] = useState<Meta[]>([]);
  const [name, setName] = useState("");
  const refresh = useCallback(() => { listMovies().then(setList).catch(() => setList([])); }, []);
  useEffect(refresh, [refresh]);
  const open = async (id: string) => { try { onOpen(await loadMovie(id)); } catch (e: any) { Alert.alert("খোলা যায়নি", String(e?.message ?? e)); } };
  const create = () => onOpen(newMovie(name.trim() || "আমার কার্টুন"));
  return (
    <View style={s.root}>
      <Text style={s.h1}>🎬 Bengali Cartoon Studio</Text>
      <Text style={s.sub}>আঁকতে হবে না — তৈরি {TOTAL_ASSETS}টি কার্টুন দিয়ে ভিডিও বানান</Text>
      <View style={s.new}>
        <TextInput value={name} onChangeText={setName} placeholder="নতুন ভিডিওর নাম" placeholderTextColor={C.dim} style={s.input} />
        <TouchableOpacity style={s.btn} onPress={create}><Text style={s.btnTxt}>＋ নতুন</Text></TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onLibrary} style={s.lib}><Text style={{ color: C.text, fontWeight: "700" }}>📚 অ্যাসেট লাইব্রেরি দেখুন ({TOTAL_ASSETS}টি)</Text></TouchableOpacity>
      <Text style={s.h2}>সেভ করা প্রজেক্ট</Text>
      <FlatList data={list} keyExtractor={(m) => m.id} ListEmptyComponent={<Text style={{ color: C.dim }}>এখনও কোনো প্রজেক্ট নেই।</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.item} onPress={() => open(item.id)}>
            <View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: "700", fontSize: 16 }}>{item.name}</Text>
              <Text style={{ color: C.dim, fontSize: 12 }}>{item.scenes}টি দৃশ্য · {new Date(item.updatedAt).toLocaleString()}</Text></View>
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
