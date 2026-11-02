import React, { useEffect, useRef } from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { frameHasContent, type Frame } from "../lib/model";
import { C } from "../lib/theme";

const CELL = 54, GAP = 6;

export default function Timeline({ frames, idx, onSelect }: { frames: Frame[]; idx: number; onSelect: (i: number) => void }) {
  const ref = useRef<ScrollView>(null);
  useEffect(() => { ref.current?.scrollTo({ x: Math.max(0, idx * (CELL + GAP) - 120), animated: true }); }, [idx]);
  return (
    <ScrollView ref={ref} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 8 }}>
      {frames.map((f, i) => {
        const on = i === idx, has = frameHasContent(f);
        return (
          <TouchableOpacity key={f.id} onPress={() => onSelect(i)} activeOpacity={0.7}
            style={[s.cell, on && s.cellOn]}>
            <Text style={[s.num, on && { color: "#111" }]}>{i + 1}</Text>
            <View style={[s.dot, { backgroundColor: has ? (on ? "#111" : C.teal) : "transparent", borderColor: on ? "#111" : C.line }]} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  cell: { width: CELL, height: 56, marginRight: GAP, borderRadius: 10, backgroundColor: C.panel2, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  cellOn: { backgroundColor: C.accent, borderColor: C.accent },
  num: { color: C.text, fontWeight: "700", fontSize: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1, marginTop: 6 },
});
