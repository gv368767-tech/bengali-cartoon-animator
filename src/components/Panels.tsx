import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ASSETS, CATS, Cat, getAsset } from "../art/registry";
import { BACKGROUNDS } from "../art/backgrounds";
import { AssetThumb, BgThumb } from "./StageView";
import { CastMember, Look, Movie, Scene } from "../lib/scene";
import { TRACKS } from "../lib/audio";
import { C, HAIRS, PALETTE, SKINS } from "../lib/theme";
import type { Quality } from "../lib/exporter";

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.head}><Text style={s.title}>{title}</Text><TouchableOpacity onPress={onClose}><Text style={s.close}>বন্ধ</Text></TouchableOpacity></View>
        {children}
      </View>
    </Modal>
  );
}

// ---------- লাইব্রেরি: ব্যাকগ্রাউন্ড / ক্যারেক্টার / প্রাণী / পাখি / প্রকৃতি / বস্তু ----------
export function LibraryPanel({ movie, scene, onAdd, onBg }: { movie: Movie; scene: Scene; onAdd: (assetId: string, castId?: string) => void; onBg: (id: string) => void }) {
  const [cat, setCat] = useState<Cat>("human");
  const list = ASSETS.filter((a) => a.cat === cat);
  return (
    <View style={s.lib}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        {CATS.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => setCat(c.id)} style={[s.tab, cat === c.id && s.tabOn]}><Text style={[s.tabTxt, cat === c.id && { color: "#111" }]}>{c.name}</Text></TouchableOpacity>
        ))}
      </ScrollView>
      {cat === "human" && movie.cast.length > 0 && (
        <View><Text style={s.sub}>আমার ক্যারেক্টার (সব দৃশ্যে একই চেহারা)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {movie.cast.map((cm: CastMember) => (
              <TouchableOpacity key={cm.id} style={s.item} onPress={() => onAdd(cm.assetId, cm.id)}>
                <AssetThumb asset={getAsset(cm.assetId)!} size={64} look={cm.look as Record<string, string> | undefined} /><Text style={s.name} numberOfLines={1}>{cm.name}</Text>
              </TouchableOpacity>))}
          </ScrollView></View>
      )}
      {cat === "human" && <Text style={s.sub}>নতুন ক্যারেক্টার</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {cat === "bg"
          ? BACKGROUNDS.map((b) => (
            <TouchableOpacity key={b.id} style={[s.item, scene.bg === b.id && s.itemOn]} onPress={() => onBg(b.id)}><BgThumb id={b.id} w={104} /><Text style={s.name}>{b.name}</Text></TouchableOpacity>))
          : list.map((a) => (
            <TouchableOpacity key={a.id} style={s.item} onPress={() => onAdd(a.id)}><AssetThumb asset={a} size={64} /><Text style={s.name}>{a.name}</Text></TouchableOpacity>))}
      </ScrollView>
    </View>
  );
}

// ---------- সংলাপ ----------
export function DialogueSheet({ movie, scene, objId, t, onAdd, onRemove, onClose }: { movie: Movie; scene: Scene; objId: string; t: number; onAdd: (text: string) => void; onRemove: (id: string) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const nameOf = (id: string) => { const o = scene.objects.find((x) => x.id === id); const cm = o?.castId ? movie.cast.find((c) => c.id === o.castId) : undefined; return cm?.name ?? (o ? getAsset(o.assetId)?.name : "") ?? ""; };
  return (
    <Sheet title={`${nameOf(objId)} — কথা যোগ (${t.toFixed(1)}s থেকে)`} onClose={onClose}>
      <TextInput value={text} onChangeText={setText} multiline placeholder="বাংলায় সংলাপ লিখুন…" placeholderTextColor={C.dim} style={s.input} />
      <TouchableOpacity style={[s.btn, !text.trim() && { opacity: 0.4 }]} disabled={!text.trim()} onPress={() => { onAdd(text); setText(""); }}><Text style={s.btnTxt}>＋ সংলাপ যোগ করুন</Text></TouchableOpacity>
      <ScrollView style={{ maxHeight: 180, marginTop: 10 }}>
        {scene.dialogues.map((d) => (
          <View key={d.id} style={s.row}><Text style={{ color: C.text, flex: 1 }}>{d.t.toFixed(1)}s · {nameOf(d.objId)}: {d.text}</Text>
            <TouchableOpacity onPress={() => onRemove(d.id)}><Text style={{ color: C.danger, fontSize: 18 }}>🗑</Text></TouchableOpacity></View>))}
        {!scene.dialogues.length && <Text style={{ color: C.dim }}>এই দৃশ্যে এখনও কোনো সংলাপ নেই।</Text>}
      </ScrollView>
    </Sheet>
  );
}

// ---------- চেহারা (cast-এ জমা — সব দৃশ্যে একই) ----------
export function LookSheet({ cast, onLook, onRename, onClose }: { cast: CastMember; onLook: (l: Look) => void; onRename: (n: string) => void; onClose: () => void }) {
  const asset = getAsset(cast.assetId)!;
  const base = { ...cast.look } as Record<string, string>;
  const Row = ({ label, k, colors }: { label: string; k: keyof Look; colors: string[] }) => (
    <View style={{ marginTop: 8 }}><Text style={s.sub}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {colors.map((c) => <TouchableOpacity key={c} onPress={() => onLook({ [k]: c })} style={[s.swatch, { backgroundColor: c }, base[k] === c && s.swatchOn]} />)}
      </ScrollView></View>
  );
  return (
    <Sheet title="ক্যারেক্টারের চেহারা" onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <AssetThumb asset={asset} size={92} look={base} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.sub}>নাম</Text>
          <TextInput defaultValue={cast.name} onEndEditing={(e) => e.nativeEvent.text.trim() && onRename(e.nativeEvent.text.trim())} style={s.input} />
          <Text style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>বদলালে সব দৃশ্যে এই চরিত্র একসাথে বদলাবে।</Text>
        </View>
      </View>
      <Row label="গায়ের রং" k="skin" colors={SKINS} /><Row label="চুল" k="hair" colors={HAIRS} />
      <Row label="উপরের পোশাক" k="top" colors={PALETTE} /><Row label="নিচের পোশাক" k="bottom" colors={PALETTE} />
    </Sheet>
  );
}

// ---------- মিউজিক ----------
export function MusicSheet({ current, onPick, onClose }: { current: string | null; onPick: (id: string | null) => void; onClose: () => void }) {
  return (
    <Sheet title="ব্যাকগ্রাউন্ড মিউজিক" onClose={onClose}>
      {[{ id: null as string | null, name: "কোনো মিউজিক নয়" }, ...TRACKS.map((t) => ({ id: t.id as string | null, name: t.name }))].map((t) => (
        <TouchableOpacity key={String(t.id)} onPress={() => onPick(t.id)} style={[s.row, current === t.id && { borderColor: C.accent, borderWidth: 1 }]}>
          <Text style={{ color: C.text, fontSize: 16 }}>{current === t.id ? "● " : "○ "}{t.name}</Text></TouchableOpacity>))}
      <Text style={{ color: C.dim, marginTop: 8, fontSize: 12 }}>মিউজিকগুলো অ্যাপের নিজস্ব সুর, কপিরাইট-মুক্ত। MP4-তে মিশে যাবে।</Text>
    </Sheet>
  );
}

// ---------- এক্সপোর্ট ----------
export function ExportSheet({ available, busy, progress, msg, result, error, warnings, onStart, onCancel, onSave, onShare, onClose }: {
  available: boolean; busy: boolean; progress: number; msg: string; result: string | null; error: string; warnings: string[];
  onStart: (q: Quality) => void; onCancel: () => void; onSave: () => void; onShare: () => void; onClose: () => void;
}) {
  const [q, setQ] = useState<Quality>(720);
  const W: Record<string, string> = {
    tts_no_bengali: "এই ফোনে বাংলা টেক্সট-টু-স্পিচ ভয়েস নেই — ভিডিওতে সংলাপের শব্দ আসবে না (ক্যাপশন থাকবে)। ফোনের Settings → ভাষা → টেক্সট-টু-স্পিচ থেকে বাংলা ভয়েস নামান।",
    tts_init_failed: "ফোনের ভয়েস ইঞ্জিন চালু করা যায়নি — সংলাপের শব্দ বাদ গেছে।", no_voice_placed: "কোনো সংলাপের শব্দ তৈরি হয়নি।", music_read_failed: "মিউজিক পড়া যায়নি।", no_audio: "ভিডিওতে কোনো শব্দ নেই (মিউজিক/সংলাপ ছাড়া)।",
  };
  return (
    <Sheet title="MP4 এক্সপোর্ট" onClose={busy ? () => {} : onClose}>
      {!available && <Text style={{ color: C.danger }}>এক্সপোর্ট শুধু ইনস্টল করা APK-তে কাজ করে।</Text>}
      {!busy && !result && (<>
        <View style={{ flexDirection: "row" }}>
          {([720, 1080] as Quality[]).map((v) => (
            <TouchableOpacity key={v} onPress={() => setQ(v)} style={[s.q, q === v && s.qOn]}><Text style={[s.qTxt, q === v && { color: "#111" }]}>{v}p</Text><Text style={{ color: q === v ? "#111" : C.dim, fontSize: 12 }}>{v === 720 ? "১২৮০×৭২০ · দ্রুত" : "১৯২০×১০৮০ · বেশি সময়"}</Text></TouchableOpacity>))}
        </View>
        <TouchableOpacity style={[s.btn, !available && { opacity: 0.4 }]} disabled={!available} onPress={() => onStart(q)}><Text style={s.btnTxt}>🎬 MP4 বানান</Text></TouchableOpacity>
      </>)}
      {busy && (<View style={{ alignItems: "center", marginTop: 8 }}>
        <ActivityIndicator color={C.accent} /><Text style={{ color: C.text, marginTop: 8 }}>{msg}</Text>
        <View style={s.bar}><View style={[s.barFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
        <TouchableOpacity onPress={onCancel}><Text style={{ color: C.danger, marginTop: 10 }}>বাতিল</Text></TouchableOpacity></View>)}
      {!!error && <Text style={{ color: C.danger, marginTop: 10 }}>ত্রুটি: {error}</Text>}
      {result && (<View>
        <Text style={{ color: C.teal, fontSize: 16, fontWeight: "700" }}>✅ ভিডিও তৈরি হয়েছে</Text>
        {warnings.map((w) => <Text key={w} style={{ color: C.accent, marginTop: 6, fontSize: 13 }}>⚠ {W[w] ?? w}</Text>)}
        <View style={{ flexDirection: "row", marginTop: 12 }}>
          <TouchableOpacity style={[s.btn, { flex: 1, marginRight: 6 }]} onPress={onSave}><Text style={s.btnTxt}>গ্যালারিতে সেভ</Text></TouchableOpacity>
          <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: C.teal }]} onPress={onShare}><Text style={s.btnTxt}>শেয়ার / YouTube</Text></TouchableOpacity>
        </View></View>)}
    </Sheet>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#0008" },
  sheet: { backgroundColor: C.panel, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%" },
  head: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  title: { color: C.text, fontSize: 17, fontWeight: "700", flex: 1 }, close: { color: C.accent, fontWeight: "700", fontSize: 16 },
  lib: { backgroundColor: C.panel, padding: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: C.panel2, marginRight: 6, marginBottom: 6 },
  tabOn: { backgroundColor: C.accent }, tabTxt: { color: C.text, fontWeight: "600", fontSize: 13 },
  sub: { color: C.dim, fontSize: 12, marginVertical: 4 },
  item: { alignItems: "center", marginRight: 8, padding: 4, borderRadius: 10, backgroundColor: C.panel2, minWidth: 74 },
  itemOn: { borderWidth: 2, borderColor: C.accent }, name: { color: C.text, fontSize: 11, marginTop: 2, maxWidth: 100 },
  input: { backgroundColor: C.panel2, color: C.text, borderRadius: 10, padding: 10, fontSize: 16, minHeight: 44 },
  btn: { backgroundColor: C.accent, padding: 13, borderRadius: 12, alignItems: "center", marginTop: 10 }, btnTxt: { color: "#111", fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.panel2, padding: 12, borderRadius: 10, marginTop: 6 },
  swatch: { width: 34, height: 34, borderRadius: 17, marginRight: 8, borderWidth: 2, borderColor: C.line }, swatchOn: { borderColor: C.accent, borderWidth: 3 },
  q: { flex: 1, backgroundColor: C.panel2, padding: 12, borderRadius: 12, alignItems: "center", marginRight: 8 }, qOn: { backgroundColor: C.accent },
  qTxt: { color: C.text, fontSize: 20, fontWeight: "800" },
  bar: { width: "100%", height: 8, backgroundColor: C.panel2, borderRadius: 4, marginTop: 10, overflow: "hidden" }, barFill: { height: 8, backgroundColor: C.teal },
});
