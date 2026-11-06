import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ASSETS, CATS, Cat, getAsset, getBg } from "../art/registry";
import { BACKGROUNDS } from "../art/backgrounds";
import { AssetThumb, BgThumb } from "./StageView";
import { CastMember, Look, Movie, Scene, dialogueLength, fmtTime } from "../lib/scene";
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
function LibraryPanelImpl({ movie, scene, onAdd, onBg }: { movie: Movie; scene: Scene; onAdd: (assetId: string, castId?: string) => void; onBg: (id: string) => void }) {
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

export const LibraryPanel = React.memo(LibraryPanelImpl); // প্লে চলার সময় প্রতি ফ্রেমে লাইব্রেরি আবার আঁকা বন্ধ → ল্যাগ কম

// ---------- সংলাপ (লেখা → ভয়েস ফাইল, সম্পাদনা, সময়) ----------
export type VoiceOpt = { rate: number; pitch: number };
export function DialogueSheet({ movie, scene, objId, t, busy, onAdd, onRemove, onUpdate, onVoice, onPlay, onClose }: {
  movie: Movie; scene: Scene; objId: string; t: number; busy: string;
  onAdd: (text: string, gen: boolean, v: VoiceOpt) => void; onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<import("../lib/scene").Dialogue>) => void; onVoice: (id: string, v: VoiceOpt) => void; onPlay: (id: string) => void; onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [edit, setEdit] = useState<string | null>(null);
  const [rate, setRate] = useState(0.95);
  const [pitch, setPitch] = useState(1);
  const v: VoiceOpt = { rate, pitch };
  const nameOf = (id: string) => { const o = scene.objects.find((x) => x.id === id); const cm = o?.castId ? movie.cast.find((c) => c.id === o.castId) : undefined; return cm?.name ?? (o ? getAsset(o.assetId)?.name : "") ?? ""; };
  const ok = !!text.trim() && !busy;
  const Opt = ({ label, on, f }: { label: string; on: boolean; f: () => void }) => <TouchableOpacity onPress={f} style={[s.chip2, on && { backgroundColor: C.accent }]}><Text style={{ color: on ? "#111" : C.text, fontSize: 12, fontWeight: "700" }}>{label}</Text></TouchableOpacity>;
  return (
    <Sheet title={`${nameOf(objId)} — কথা (${t.toFixed(1)}s থেকে)`} onClose={onClose}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <TextInput value={text} onChangeText={setText} multiline placeholder="বাংলায় সংলাপ লিখুন…" placeholderTextColor={C.dim} style={s.input} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
          <Text style={s.sub}>গতি </Text>
          <Opt label="ধীর" on={rate < 0.9} f={() => setRate(0.75)} /><Opt label="স্বাভাবিক" on={rate >= 0.9 && rate <= 1} f={() => setRate(0.95)} /><Opt label="দ্রুত" on={rate > 1} f={() => setRate(1.25)} />
          <Text style={[s.sub, { marginLeft: 8 }]}>সুর </Text>
          <Opt label="ভারী" on={pitch < 0.95} f={() => setPitch(0.8)} /><Opt label="স্বাভাবিক" on={pitch >= 0.95 && pitch <= 1.05} f={() => setPitch(1)} /><Opt label="সরু" on={pitch > 1.05} f={() => setPitch(1.35)} />
        </View>
        {edit ? (
          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity style={[s.btn, { flex: 1, marginRight: 6 }, !ok && { opacity: 0.4 }]} disabled={!ok} onPress={() => { onUpdate(edit, { text: text.trim(), voiceUri: undefined, dur: dialogueLength(text) }); setEdit(null); setText(""); }}><Text style={s.btnTxt}>✔ আপডেট (ভয়েস আবার বানাতে হবে)</Text></TouchableOpacity>
            <TouchableOpacity style={[s.btn, { backgroundColor: C.panel2 }]} onPress={() => { setEdit(null); setText(""); }}><Text style={[s.btnTxt, { color: C.text }]}>বাতিল</Text></TouchableOpacity>
          </View>
        ) : (<>
          <TouchableOpacity style={[s.btn, !ok && { opacity: 0.4 }]} disabled={!ok} onPress={() => { onAdd(text, false, v); setText(""); }}><Text style={s.btnTxt}>＋ সংলাপ যোগ (ফোনের ভয়েস, ঠোঁট নড়বে)</Text></TouchableOpacity>
          <TouchableOpacity style={[s.btn, { backgroundColor: C.teal }, !ok && { opacity: 0.4 }]} disabled={!ok} onPress={() => { onAdd(text, true, v); setText(""); }}><Text style={s.btnTxt}>🎙 যোগ + ভয়েস অডিও ফাইল বানান</Text></TouchableOpacity>
        </>)}
        {!!busy && <Text style={{ color: C.accent, marginTop: 8 }}>⏳ {busy}</Text>}
        <Text style={[s.sub, { marginTop: 10 }]}>এই দৃশ্যের সংলাপ</Text>
        {scene.dialogues.map((d) => (
          <View key={d.id} style={[s.row, { flexDirection: "column", alignItems: "stretch" }]}>
            <Text style={{ color: C.text }}>{nameOf(d.objId)}: {d.text}</Text>
            <Text style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>{d.t.toFixed(1)}s · {d.dur.toFixed(1)}s · {d.voiceUri ? "🎙 ভয়েস ফাইল আছে" : "ফোনের ভয়েস"}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
              <Opt label="▶ শুনুন" on={false} f={() => onPlay(d.id)} />
              <Opt label="🎙 ভয়েস বানান" on={false} f={() => onVoice(d.id, v)} />
              <Opt label="✎ লেখা বদল" on={false} f={() => { setEdit(d.id); setText(d.text); }} />
              <Opt label="◀ −0.5s" on={false} f={() => onUpdate(d.id, { t: Math.max(0, d.t - 0.5) })} />
              <Opt label="+0.5s ▶" on={false} f={() => onUpdate(d.id, { t: d.t + 0.5 })} />
              <TouchableOpacity onPress={() => onRemove(d.id)} style={s.chip2}><Text style={{ color: C.danger }}>🗑</Text></TouchableOpacity>
            </View>
          </View>))}
        {!scene.dialogues.length && <Text style={{ color: C.dim }}>এই দৃশ্যে এখনও কোনো সংলাপ নেই।</Text>}
      </ScrollView>
    </Sheet>
  );
}

// ---------- অডিও: নিজের মিউজিক, সাউন্ড ইফেক্ট, ভয়েসওভার ----------
export function AudioSheet({ movie, scene, t, objs, busy, onMusic, onMusicFile, onMusicVol, onAddClip, onUpdateClip, onRemoveClip, onClose }: {
  movie: Movie; scene: Scene; t: number; objs: { id: string; name: string }[]; busy: string;
  onMusic: (id: string | null) => void; onMusicFile: () => void; onMusicVol: (v: number) => void;
  onAddClip: (kind: "sfx" | "voice") => void; onUpdateClip: (id: string, patch: Partial<import("../lib/scene").AudioClip>) => void; onRemoveClip: (id: string) => void; onClose: () => void;
}) {
  const vol = movie.musicVol ?? (movie.musicClip ? 0.5 : 0.3);
  const Opt = ({ label, f, on }: { label: string; f: () => void; on?: boolean }) => <TouchableOpacity onPress={f} style={[s.chip2, on && { backgroundColor: C.accent }]}><Text style={{ color: on ? "#111" : C.text, fontSize: 12, fontWeight: "700" }}>{label}</Text></TouchableOpacity>;
  return (
    <Sheet title="🔊 অডিও (মিউজিক, সাউন্ড ইফেক্ট, ভয়েসওভার)" onClose={onClose}>
      <ScrollView>
        <Text style={s.sub}>ব্যাকগ্রাউন্ড মিউজিক (পুরো ভিডিওতে লুপ হয়)</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Opt label="কোনোটি নয়" on={!movie.music && !movie.musicClip} f={() => onMusic(null)} />
          {TRACKS.map((tr) => <Opt key={tr.id} label={tr.name} on={movie.music === tr.id && !movie.musicClip} f={() => onMusic(tr.id)} />)}
          <Opt label={movie.musicClip ? `📂 ${movie.musicClip.name}` : "📂 নিজের ফোন থেকে (MP3/WAV)"} on={!!movie.musicClip} f={onMusicFile} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
          <Text style={s.sub}>মিউজিকের আওয়াজ: {Math.round(vol * 100)}%  </Text>
          <Opt label="−" f={() => onMusicVol(Math.max(0.05, vol - 0.1))} /><Opt label="＋" f={() => onMusicVol(Math.min(1, vol + 0.1))} />
        </View>
        <Text style={[s.sub, { marginTop: 14 }]}>এই দৃশ্যে যোগ করুন — {t.toFixed(1)} সেকেন্ড থেকে</Text>
        <View style={{ flexDirection: "row" }}>
          <TouchableOpacity style={[s.btn, { flex: 1, marginRight: 6 }, !!busy && { opacity: 0.4 }]} disabled={!!busy} onPress={() => onAddClip("sfx")}><Text style={s.btnTxt}>＋ সাউন্ড ইফেক্ট</Text></TouchableOpacity>
          <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: C.teal }, !!busy && { opacity: 0.4 }]} disabled={!!busy} onPress={() => onAddClip("voice")}><Text style={s.btnTxt}>＋ ভয়েসওভার</Text></TouchableOpacity>
        </View>
        {!!busy && <Text style={{ color: C.accent, marginTop: 8 }}>⏳ {busy}</Text>}
        {(scene.clips ?? []).map((c) => {
          const who = objs.find((o) => o.id === c.objId)?.name;
          const next = () => { const i = objs.findIndex((o) => o.id === c.objId); onUpdateClip(c.id, { objId: i + 1 < objs.length ? objs[i + 1].id : undefined }); };
          return (
            <View key={c.id} style={[s.row, { flexDirection: "column", alignItems: "stretch" }]}>
              <Text style={{ color: C.text }}>{c.kind === "sfx" ? "🔔 ইফেক্ট" : "🎙 ভয়েসওভার"} · {c.name}</Text>
              <Text style={{ color: C.dim, fontSize: 12 }}>{c.t.toFixed(1)}s থেকে · {c.dur.toFixed(1)}s · আওয়াজ {Math.round(c.vol * 100)}%{c.kind === "voice" ? ` · ঠোঁট: ${who ?? "কারও নয়"}` : ""}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
                <Opt label="◀ −0.5s" f={() => onUpdateClip(c.id, { t: Math.max(0, c.t - 0.5) })} /><Opt label="+0.5s ▶" f={() => onUpdateClip(c.id, { t: c.t + 0.5 })} />
                <Opt label="🔉 −" f={() => onUpdateClip(c.id, { vol: Math.max(0.1, c.vol - 0.1) })} /><Opt label="🔊 ＋" f={() => onUpdateClip(c.id, { vol: Math.min(1, c.vol + 0.1) })} />
                {c.kind === "voice" && objs.length > 0 && <Opt label={`👄 ${who ?? "চরিত্র বাছুন"}`} f={next} on={!!who} />}
                <TouchableOpacity onPress={() => onRemoveClip(c.id)} style={s.chip2}><Text style={{ color: C.danger }}>🗑</Text></TouchableOpacity>
              </View>
            </View>);
        })}
        {!(scene.clips ?? []).length && <Text style={{ color: C.dim, marginTop: 8 }}>এই দৃশ্যে এখনও কোনো ইফেক্ট বা ভয়েসওভার নেই।</Text>}
        <Text style={{ color: C.dim, fontSize: 11, marginTop: 10 }}>ভয়েসওভারে চরিত্র বাছলে ফাইলের আওয়াজ অনুযায়ী তার ঠোঁট নড়বে। সব অডিও MP4-তে মিশে যাবে।</Text>
      </ScrollView>
    </Sheet>
  );
}

// ---------- দৃশ্য জোড়া (Scene Merge) ----------
export function MergeSheet({ movie, onToggle, onFade, onMove, onAll, onExport, onClose }: {
  movie: Movie; onToggle: (id: string, skip: boolean) => void; onFade: (id: string, fade: boolean) => void; onMove: (i: number, d: -1 | 1) => void; onAll: () => void; onExport: () => void; onClose: () => void;
}) {
  const chosen = movie.scenes.filter((x) => !x.skip);
  const total = chosen.reduce((a, x) => a + x.duration, 0);
  return (
    <Sheet title="🎞 দৃশ্য জুড়ে একটি ভিডিও" onClose={onClose}>
      <ScrollView>
        <Text style={s.sub}>টিক দেওয়া দৃশ্যগুলো ওপর থেকে নিচের ক্রমে জুড়ে যাবে। ক্রম বদলাতে ▲▼, মাঝখানে নরম বদল চাইলে "ফেড" চালু করুন।</Text>
        {movie.scenes.map((sc, i) => (
          <View key={sc.id} style={[s.row, !sc.skip && { borderColor: C.teal, borderWidth: 1 }]}>
            <TouchableOpacity onPress={() => onToggle(sc.id, !sc.skip)} style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <Text style={{ fontSize: 22, marginRight: 8 }}>{sc.skip ? "☐" : "☑"}</Text>
              <View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: "700" }}>দৃশ্য {i + 1}</Text><Text style={{ color: C.dim, fontSize: 12 }}>{getBg(sc.bg)?.name} · {sc.duration}s · {sc.objects.length} বস্তু · {sc.dialogues.length} সংলাপ{(sc.clips ?? []).length ? ` · ${(sc.clips ?? []).length} অডিও` : ""}</Text></View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onFade(sc.id, !sc.fade)} style={[s.chip2, sc.fade && { backgroundColor: C.accent }]}><Text style={{ color: sc.fade ? "#111" : C.text, fontSize: 12, fontWeight: "700" }}>ফেড</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onMove(i, -1)} disabled={i === 0}><Text style={[s.mv, i === 0 && { opacity: 0.25 }]}>▲</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onMove(i, 1)} disabled={i === movie.scenes.length - 1}><Text style={[s.mv, i === movie.scenes.length - 1 && { opacity: 0.25 }]}>▼</Text></TouchableOpacity>
          </View>))}
        <View style={{ flexDirection: "row", marginTop: 10, alignItems: "center" }}>
          <Text style={{ color: C.text, flex: 1 }}>{chosen.length}টি দৃশ্য · মোট {fmtTime(total)}</Text>
          <TouchableOpacity onPress={onAll}><Text style={{ color: C.accent, fontWeight: "700" }}>সব নির্বাচন</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={[s.btn, !chosen.length && { opacity: 0.4 }]} disabled={!chosen.length} onPress={onExport}><Text style={s.btnTxt}>🎬 নির্বাচিত দৃশ্য জুড়ে MP4 বানান</Text></TouchableOpacity>
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
    tts_init_failed: "ফোনের ভয়েস ইঞ্জিন চালু করা যায়নি — সংলাপের শব্দ বাদ গেছে।", no_voice_placed: "কোনো সংলাপের শব্দ তৈরি হয়নি।", music_read_failed: "মিউজিক পড়া যায়নি।", no_audio: "ভিডিওতে কোনো শব্দ নেই (মিউজিক/সংলাপ ছাড়া)।", clip_read_failed: "কোনো অডিও ফাইল পড়া যায়নি (ফাইল মুছে গেছে বা অচেনা ফরম্যাট) — সেটি বাদ গেছে।",
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
          <TouchableOpacity style={[s.btn, { flex: 1, marginRight: 6, paddingVertical: 17 }]} onPress={onSave}><Text style={[s.btnTxt, { fontSize: 16 }]}>⬇ ডাউনলোড{"\n"}(ফোনে সেভ)</Text></TouchableOpacity>
          <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: C.teal, paddingVertical: 17 }]} onPress={onShare}><Text style={[s.btnTxt, { fontSize: 16 }]}>↗ শেয়ার{"\n"}(YouTube/WhatsApp)</Text></TouchableOpacity>
        </View>
        <Text style={{ color: C.dim, fontSize: 12, marginTop: 8 }}>ডাউনলোড চাপলে ভিডিও গ্যালারি ও ফাইল-ম্যানেজারের Movies/BengaliCartoonStudio ফোল্ডারে সেভ হয়।</Text></View>)}
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
  chip2: { backgroundColor: C.panel2, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, marginRight: 5, marginBottom: 5 }, mv: { color: C.text, fontSize: 20, paddingHorizontal: 8 },
  swatch: { width: 34, height: 34, borderRadius: 17, marginRight: 8, borderWidth: 2, borderColor: C.line }, swatchOn: { borderColor: C.accent, borderWidth: 3 },
  q: { flex: 1, backgroundColor: C.panel2, padding: 12, borderRadius: 12, alignItems: "center", marginRight: 8 }, qOn: { backgroundColor: C.accent },
  qTxt: { color: C.text, fontSize: 20, fontWeight: "800" },
  bar: { width: "100%", height: 8, backgroundColor: C.panel2, borderRadius: 4, marginTop: 10, overflow: "hidden" }, barFill: { height: 8, backgroundColor: C.teal },
});
