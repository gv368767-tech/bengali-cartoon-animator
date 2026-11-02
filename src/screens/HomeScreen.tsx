import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Modal, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { deleteProject, listProjects, loadProject, saveProject, type Meta } from "../lib/storage";
import { newProject, type Project } from "../lib/model";
import { C } from "../lib/theme";

const FPS_OPTS = [6, 8, 12, 15, 24];

export default function HomeScreen({ onOpen }: { onOpen: (p: Project) => void }) {
  const [items, setItems] = useState<Meta[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [fps, setFps] = useState(12);

  const refresh = useCallback(() => { listProjects().then(setItems).catch(() => setItems([])); }, []);
  useEffect(refresh, [refresh]);

  async function create() {
    const p = newProject(name, fps);
    try { await saveProject(p); } catch { Alert.alert("ত্রুটি", "প্রজেক্ট সেভ করা যায়নি"); return; }
    setCreating(false); setName(""); onOpen(p);
  }
  async function open(m: Meta) {
    try { onOpen(await loadProject(m.id)); } catch (e: any) { Alert.alert("খোলা যায়নি", e?.message ?? ""); }
  }
  function remove(m: Meta) {
    Alert.alert("প্রজেক্ট মুছবেন?", m.name, [{ text: "না" },
      { text: "মুছুন", style: "destructive", onPress: async () => { await deleteProject(m.id); refresh(); } }]);
  }

  return (
    <View style={s.root}>
      <Text style={s.logo}>✎ বাংলা কার্টুন অ্যানিমেটর</Text>
      <Text style={s.sub}>ফ্রেম-বাই-ফ্রেম ২ডি অ্যানিমেশন • সম্পূর্ণ অফলাইন</Text>
      <FlatList data={items} keyExtractor={(i) => i.id} style={{ marginTop: 16 }}
        ListEmptyComponent={<Text style={s.empty}>কোনো প্রজেক্ট নেই।{"\n"}নিচের বোতামে চেপে প্রথম অ্যানিমেশন শুরু করুন।</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => open(item)} onLongPress={() => remove(item)}>
            <Text style={s.cardTitle}>{item.name}</Text>
            <Text style={s.cardSub}>{item.frames} ফ্রেম • {item.fps} FPS • {new Date(item.updatedAt).toLocaleDateString("bn-BD")}</Text>
          </TouchableOpacity>
        )} />
      <Text style={s.hint}>মুছতে প্রজেক্টে চেপে ধরে রাখুন</Text>
      <TouchableOpacity style={s.fab} onPress={() => setCreating(true)}><Text style={s.fabTxt}>＋ নতুন প্রজেক্ট</Text></TouchableOpacity>

      <Modal transparent visible={creating} animationType="fade" onRequestClose={() => setCreating(false)}>
        <View style={s.overlay}>
          <View style={s.dialog}>
            <Text style={s.dTitle}>নতুন প্রজেক্ট</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="প্রজেক্টের নাম" placeholderTextColor={C.dim} />
            <Text style={s.label}>FPS (প্রতি সেকেন্ডে ফ্রেম)</Text>
            <View style={{ flexDirection: "row" }}>
              {FPS_OPTS.map((f) => (
                <TouchableOpacity key={f} onPress={() => setFps(f)} style={[s.chip, f === fps && s.chipOn]}>
                  <Text style={[s.chipTxt, f === fps && { color: "#111" }]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: "row", marginTop: 18 }}>
              <TouchableOpacity style={[s.btn, { backgroundColor: C.panel2 }]} onPress={() => setCreating(false)}><Text style={{ color: C.text }}>বাতিল</Text></TouchableOpacity>
              <TouchableOpacity style={[s.btn, { backgroundColor: C.accent }]} onPress={create}><Text style={{ color: "#111", fontWeight: "800" }}>তৈরি করুন</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 18, paddingTop: (StatusBar.currentHeight ?? 24) + 16 },
  logo: { color: C.accent, fontSize: 26, fontWeight: "800" },
  sub: { color: C.dim, marginTop: 4 },
  empty: { color: C.dim, textAlign: "center", marginTop: 60, lineHeight: 24 },
  card: { backgroundColor: C.panel, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.line },
  cardTitle: { color: C.text, fontSize: 18, fontWeight: "700" }, cardSub: { color: C.dim, marginTop: 4 },
  hint: { color: C.dim, fontSize: 12, textAlign: "center", marginBottom: 6 },
  fab: { backgroundColor: C.accent, padding: 16, borderRadius: 16, alignItems: "center" },
  fabTxt: { color: "#111", fontSize: 17, fontWeight: "800" },
  overlay: { flex: 1, backgroundColor: "#000a", justifyContent: "center", padding: 24 },
  dialog: { backgroundColor: C.panel, borderRadius: 18, padding: 18 },
  dTitle: { color: C.text, fontSize: 20, fontWeight: "700", marginBottom: 12 },
  input: { backgroundColor: C.panel2, color: C.text, borderRadius: 10, padding: 12, fontSize: 16 },
  label: { color: C.dim, marginTop: 14, marginBottom: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: C.panel2, marginRight: 8 },
  chipOn: { backgroundColor: C.accent }, chipTxt: { color: C.text, fontWeight: "700" },
  btn: { flex: 1, padding: 14, borderRadius: 12, alignItems: "center", marginHorizontal: 4 },
});
