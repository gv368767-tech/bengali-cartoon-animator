// "গল্প লিখুন → সম্পূর্ণ কার্টুন ভিডিও": অফলাইন; গল্প পড়ে চরিত্র/পটভূমি/ভঙ্গি/সংলাপ/ভয়েস/মিউজিক বসিয়ে সিনেমা বানায়, তারপর এডিটরে খোলে।
import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { C } from "../lib/theme";
import { Movie } from "../lib/scene";
import { saveMovie } from "../lib/storage";
import { planStory, StoryPlan } from "../lib/storyPlan";
import { buildStoryMovie } from "../lib/storyBuild";
import { makeVoice } from "../lib/audioFiles";
import { SFX, SfxId, sfxFile } from "../lib/sfx";
import { getBg } from "../art/registry";

const SAMPLE = `একদিন রাহুল নামের একটি ছেলে গ্রামের মাঠে সাইকেল চালিয়ে ঘুরছিল। হঠাৎ মিতা নামের একটি মেয়ে দৌড়ে এল। মিতা বলল, “দাদা, মা তোমাকে ডাকছে!”
“আমি আসছি,” রাহুল বলল। তারপর দুজনে নদীর ঘাটে গিয়ে বসল। বৃদ্ধ দাদু সেখানে গান গাইছিলেন। সবাই হাততালি দিল।
এরপর তারা মন্দিরে গিয়ে ঠাকুরকে প্রণাম করল। পুরোহিত আশীর্বাদ করলেন। সন্ধ্যায় সবাই বাজারে গিয়ে ফল কিনল। ফলওয়ালা বলল, “নিন, তাজা আম!”`;

export default function StoryMakerScreen({ onBack, onOpen }: { onBack: () => void; onOpen: (m: Movie) => void }) {
  const [text, setText] = useState(""), [title, setTitle] = useState("");
  const [mins, setMins] = useState(1), [music, setMusic] = useState(true), [vol, setVol] = useState(0.3), [voices, setVoices] = useState(true), [narrate, setNarrate] = useState(true);
  const [busy, setBusy] = useState(false), [pct, setPct] = useState(0), [msg, setMsg] = useState("");
  const cancel = useRef(false);
  const plan = useMemo<StoryPlan | { err: string } | null>(() => { if (text.trim().length < 5) return null; try { return planStory(text); } catch (e: any) { return { err: String(e?.message ?? e) }; } }, [text]);
  const ok = plan && !("err" in plan) ? plan : null;
  const go = async () => {
    if (!ok) { Alert.alert("গল্প লিখুন", "অন্তত কয়েকটি বাক্য লিখুন।"); return; }
    setBusy(true); setPct(0); cancel.current = false;
    try {
      const r = await buildStoryMovie(ok, title.trim() || "আমার গল্প", {
        seconds: mins * 60, music, musicVol: vol, voices, narrate, makeVoice: (t, rate, pitch, variant) => makeVoice(t, rate, pitch, variant),
        sfx: async (id) => { try { const d = SFX[id as SfxId]; return d ? { uri: await sfxFile(id as SfxId), dur: d.dur, name: d.name } : null; } catch { return null; } },
        progress: (p, t) => { setPct(p); setMsg(t); }, cancelled: () => cancel.current,
      });
      await saveMovie(r.movie);
      Alert.alert("ভিডিও প্রস্তুত", `${r.scenes}টি দৃশ্য, প্রায় ${r.seconds} সেকেন্ড${r.voiced ? `, ${r.voiced}টি ভয়েস` : ""}।${r.notes.length ? "\n\n" + r.notes.join("\n") : ""}\n\nএডিটরে খুলছে — সেখান থেকে বদলে MP4 এক্সপোর্ট করুন।`, [{ text: "খুলুন", onPress: () => onOpen(r.movie) }]);
    } catch (e: any) { if (!cancel.current) Alert.alert("তৈরি হয়নি", String(e?.message ?? e)); }
    finally { setBusy(false); }
  };
  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: 16, paddingTop: 44, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={onBack}><Text style={{ color: C.accent, fontWeight: "700" }}>← ফিরে যান</Text></TouchableOpacity>
      <Text style={s.h1}>🎬 গল্প → কার্টুন ভিডিও</Text>
      <Text style={s.dim}>বাংলা (বা ইংরেজি) গল্প লিখুন। অ্যাপ নিজের চরিত্র, পটভূমি ও ভঙ্গি দিয়ে ভিডিও বানাবে — সব ফোনের ভেতরে, ইন্টারনেট/AI ছাড়া। চরিত্রের নাম দিতে লিখুন: "রাহুল নামের ছেলে"। কথোপকথন "…" চিহ্নে লিখুন।</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="ভিডিওর নাম" placeholderTextColor={C.dim} style={s.input} />
      <TextInput value={text} onChangeText={setText} multiline placeholder="এখানে গল্প লিখুন…" placeholderTextColor={C.dim} style={[s.input, { height: 220, textAlignVertical: "top" }]} />
      <TouchableOpacity onPress={() => setText(SAMPLE)}><Text style={{ color: C.teal, marginTop: 6 }}>নমুনা গল্প বসান</Text></TouchableOpacity>
      <Text style={s.h2}>ভিডিওর সময়</Text>
      <View style={s.row}>{[1, 2, 3, 4, 5].map((n) => <Chip key={n} on={mins === n} label={`${n} মিনিট`} onPress={() => setMins(n)} />)}</View>
      <Text style={s.dim}>গল্প ছোট হলে ভিডিও লক্ষ্যের চেয়ে ছোট হবে; বড় হলে শেষ অংশ বাদ যাবে — সবসময় জানিয়ে দেওয়া হয়।</Text>
      <Text style={s.h2}>শব্দ</Text>
      <View style={s.row}>
        <Chip on={voices} label="🗣 কণ্ঠ" onPress={() => setVoices(!voices)} /><Chip on={narrate} label="📖 বর্ণনা পড়া" onPress={() => setNarrate(!narrate)} />
        <Chip on={music} label="🎵 মিউজিক" onPress={() => setMusic(!music)} />
      </View>
      {music ? <View style={s.row}>{[0.15, 0.3, 0.5].map((v, i) => <Chip key={v} on={vol === v} label={["মিউজিক ক্ষীণ", "মাঝারি", "জোরে"][i]} onPress={() => setVol(v)} />)}</View> : null}
      {ok ? (
        <View style={s.box}>
          <Text style={s.h2}>অ্যাপ যা বুঝেছে</Text>
          <Text style={{ color: C.text }}>চরিত্র: {ok.chars.map((c) => `${c.name}${c.name !== c.role.label ? ` (${c.role.label})` : ""}`).join(", ")}</Text>
          {ok.scenes.map((sc, i) => <Text key={i} style={s.dim}>দৃশ্য {i + 1}: {getBg(sc.bg).name} — {sc.units.length}টি অংশ</Text>)}
          {ok.notes.map((n, i) => <Text key={i} style={{ color: C.accent }}>{n}</Text>)}
        </View>
      ) : plan && "err" in plan ? <Text style={{ color: C.danger, marginTop: 10 }}>{plan.err}</Text> : null}
      {busy ? (
        <View style={{ marginTop: 16 }}><ActivityIndicator color={C.accent} /><Text style={{ color: C.text, textAlign: "center", marginTop: 6 }}>{msg} ({Math.round(pct * 100)}%)</Text>
          <TouchableOpacity onPress={() => { cancel.current = true; }} style={[s.btn, { backgroundColor: C.danger }]}><Text style={s.btnTxt}>বাতিল</Text></TouchableOpacity></View>
      ) : <TouchableOpacity onPress={go} style={s.btn}><Text style={s.btnTxt}>🎬 ভিডিও তৈরি করুন</Text></TouchableOpacity>}
    </ScrollView>
  );
}
const Chip = ({ on, label, onPress }: { on: boolean; label: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={[s.chip, on && { backgroundColor: C.accent }]}><Text style={{ color: on ? "#111" : C.text, fontWeight: "700" }}>{label}</Text></TouchableOpacity>);
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg }, h1: { color: C.text, fontSize: 22, fontWeight: "800", marginTop: 10 }, h2: { color: C.text, fontWeight: "700", marginTop: 16, marginBottom: 6 },
  dim: { color: C.dim, marginTop: 6, lineHeight: 20 }, input: { backgroundColor: C.panel2, color: C.text, borderRadius: 10, padding: 12, marginTop: 12 },
  row: { flexDirection: "row", flexWrap: "wrap" }, chip: { backgroundColor: C.panel2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 18, marginRight: 8, marginBottom: 8 },
  box: { backgroundColor: C.panel, borderRadius: 12, padding: 12, marginTop: 14 }, btn: { backgroundColor: C.accent, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 18 }, btnTxt: { color: "#111", fontWeight: "800", fontSize: 16 },
});
