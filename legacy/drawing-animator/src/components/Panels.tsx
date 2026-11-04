import React, { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MAX_LAYERS, type Project } from "../lib/model";
import { C, PALETTE, SIZES } from "../lib/theme";

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHead}>
          <Text style={s.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}><Text style={{ color: C.accent, fontWeight: "700", fontSize: 16 }}>বন্ধ</Text></TouchableOpacity>
        </View>
        {children}
      </View>
    </Modal>
  );
}

export function LayerPanel({ project, layerId, onSelect, onAdd, onRemove, onToggle, onMove, onClose }: {
  project: Project; layerId: string; onSelect: (id: string) => void; onAdd: () => void;
  onRemove: (id: string) => void; onToggle: (id: string) => void; onMove: (id: string, d: 1 | -1) => void; onClose: () => void;
}) {
  const list = [...project.layers].reverse(); // উপরের লেয়ার আগে দেখান
  return (
    <Sheet title="লেয়ার" onClose={onClose}>
      <ScrollView style={{ maxHeight: 320 }}>
        {list.map((l) => (
          <View key={l.id} style={[s.row, l.id === layerId && s.rowOn]}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => onSelect(l.id)}>
              <Text style={s.rowTxt}>{l.id === layerId ? "● " : "○ "}{l.name}</Text>
            </TouchableOpacity>
            <Btn t={l.visible ? "👁" : "🚫"} onPress={() => onToggle(l.id)} />
            <Btn t="▲" onPress={() => onMove(l.id, 1)} />
            <Btn t="▼" onPress={() => onMove(l.id, -1)} />
            <Btn t="🗑" onPress={() => onRemove(l.id)} />
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity style={[s.primary, project.layers.length >= MAX_LAYERS && { opacity: 0.4 }]}
        disabled={project.layers.length >= MAX_LAYERS} onPress={onAdd}>
        <Text style={s.primaryTxt}>＋ নতুন লেয়ার ({project.layers.length}/{MAX_LAYERS})</Text>
      </TouchableOpacity>
    </Sheet>
  );
}

export function BrushPanel({ color, size, onColor, onSize, onClose }: {
  color: string; size: number; onColor: (c: string) => void; onSize: (n: number) => void; onClose: () => void;
}) {
  const [hex, setHex] = useState(color);
  const apply = (h: string) => { setHex(h); if (/^#[0-9a-fA-F]{6}$/.test(h)) onColor(h.toLowerCase()); };
  return (
    <Sheet title="রং ও আকার" onClose={onClose}>
      <View style={s.grid}>
        {PALETTE.map((c) => (
          <TouchableOpacity key={c} onPress={() => { onColor(c); setHex(c); }}
            style={[s.swatch, { backgroundColor: c }, c === color && s.swatchOn]} />
        ))}
      </View>
      <TextInput value={hex} onChangeText={apply} autoCapitalize="none" maxLength={7}
        placeholder="#rrggbb" placeholderTextColor={C.dim} style={s.input} />
      <Text style={[s.sheetTitle, { marginTop: 14, fontSize: 14 }]}>ব্রাশের আকার: {size}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        {SIZES.map((n) => (
          <TouchableOpacity key={n} onPress={() => onSize(n)} style={[s.sizeBtn, n === size && s.sizeOn]}>
            <View style={{ width: Math.min(n, 34), height: Math.min(n, 34), borderRadius: 40, backgroundColor: n === size ? "#111" : C.text }} />
          </TouchableOpacity>
        ))}
      </View>
    </Sheet>
  );
}

const Btn = ({ t, onPress }: { t: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={s.mini}><Text style={{ fontSize: 16 }}>{t}</Text></TouchableOpacity>
);

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#0008" },
  sheet: { backgroundColor: C.panel, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  sheetTitle: { color: C.text, fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", padding: 8, borderRadius: 10, marginBottom: 6, backgroundColor: C.panel2 },
  rowOn: { borderWidth: 1, borderColor: C.accent },
  rowTxt: { color: C.text, fontSize: 16 },
  mini: { paddingHorizontal: 8, paddingVertical: 6 },
  primary: { backgroundColor: C.accent, padding: 14, borderRadius: 12, alignItems: "center", marginTop: 8 },
  primaryTxt: { color: "#111", fontWeight: "700", fontSize: 15 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  swatch: { width: 38, height: 38, borderRadius: 19, margin: 5, borderWidth: 2, borderColor: C.line },
  swatchOn: { borderColor: C.accent, borderWidth: 3 },
  input: { backgroundColor: C.panel2, color: C.text, borderRadius: 10, padding: 10, marginTop: 10, fontSize: 16 },
  sizeBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.panel2, alignItems: "center", justifyContent: "center" },
  sizeOn: { backgroundColor: C.accent },
});
