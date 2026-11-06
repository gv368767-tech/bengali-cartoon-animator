import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, LayoutChangeEvent, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import * as Sharing from "expo-sharing";
import { StageView } from "../components/StageView";
import { AudioSheet, DialogueSheet, ExportSheet, LibraryPanel, LookSheet, MergeSheet, MusicSheet, VoiceOpt } from "../components/Panels";
import TimelineEditor from "../components/TimelineEditor";
import AnimationPanel from "../components/AnimationPanel";
import { getAsset } from "../art/registry";
import {
  Movie, STAGE_H, STAGE_W, addDialogue, addObject, addScene, deleteScene, dialogueAt, duplicateScene, emptyHistory, evalObj, fmtTime,
  hitTest, History, pushHistory, redo, removeDialogue, removeKeyAt, removeObject, renameCast, setAction, setBg, setDuration, setKey, setLook,
  undo, updateObj, updateScene, Look, dialogueLength, setView, viewAt, actionAt,
  activeDuration, addClip, moveScene, removeClip, setSceneFlags, updateClip, updateDialogue,
} from "../lib/scene";
import { saveMovie } from "../lib/storage";
import { pauseMusic, playClip, playMusic, speak, stopClips, stopMusic, stopSpeech } from "../lib/audio";
import { ensureEnvelopes, makeVoice, pickAudio } from "../lib/audioFiles";
import { exportAvailable, exportMovie, Quality, saveToGallery } from "../lib/exporter";
import { ACTION_BN, C } from "../lib/theme";
import type { Action, View as ViewT } from "../art/shapes";
import { animName } from "../art/anim";

type Sheet = null | "dialogue" | "look" | "music" | "export" | "anim" | "audio" | "merge" | "timeline";

export default function EditorScreen({ initial, onBack }: { initial: Movie; onBack: () => void }) {
  const { width: winW } = useWindowDimensions();
  const stageW = Math.min(winW, 520);
  const [movie, setMovie] = useState<Movie>(initial);
  const [hist, setHist] = useState<History<Movie>>(emptyHistory());
  const [si, setSi] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [lib, setLib] = useState(true);
  const [animT, setAnimT] = useState(0);

  const scene = movie.scenes[Math.min(si, movie.scenes.length - 1)];
  const R = useRef({ movie, scene, t, sel, hist, si, playing });
  R.current = { movie, scene, t, sel, hist, si, playing };

  // ---- পরিবর্তন (আনডুসহ) ----
  const commit = useCallback((fn: (m: Movie) => Movie, record = true) => {
    const cur = R.current.movie;
    const next = { ...fn(cur), updatedAt: Date.now() };
    if (record) setHist((h) => pushHistory(h, cur));
    setMovie(next);
  }, []);

  // ---- অটোসেভ ----
  useEffect(() => {
    const id = setTimeout(() => { saveMovie(movie).catch(() => {}); }, 800);
    return () => clearTimeout(id);
  }, [movie]);

  // ---- প্লেব্যাক ----
  const spoken = useRef<Set<string>>(new Set());
  const stopAll = useCallback(() => { setPlaying(false); stopSpeech(); stopClips(); pauseMusic(); }, []);
  const played = useRef<Set<string>>(new Set());
  useEffect(() => { ensureEnvelopes(initial).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = Date.now();
    { const mv0 = R.current.movie; const mu = mv0.musicClip?.uri ?? mv0.music; if (mu) playMusic(mu, mv0.musicVol ?? (mv0.musicClip ? 0.5 : 0.35)).catch(() => {}); }
    const tick = () => {
      const now = Date.now(), dt = (now - last) / 1000; last = now;
      const { scene: sc, t: cur, si: idx, movie: mv } = R.current;
      let nt = cur + dt;
      for (const d of sc.dialogues) if (nt >= d.t && cur < d.t + 0.001 && !spoken.current.has(d.id)) { spoken.current.add(d.id); if (d.voiceUri) playClip(d.voiceUri, 1); else speak(d.text); }
      for (const c of sc.clips ?? []) if (nt >= c.t && cur < c.t + 0.001 && !spoken.current.has(c.id)) { spoken.current.add(c.id); playClip(c.uri, c.vol); }
      if (nt >= sc.duration) {
        if (idx < mv.scenes.length - 1) { setSi(idx + 1); nt = 0; spoken.current.clear(); }
        else { setT(sc.duration); stopAll(); return; }
      }
      setT(nt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, stopAll]);
  useEffect(() => () => { stopSpeech(); stopClips(); stopMusic(); }, []);

  const togglePlay = () => {
    if (playing) return stopAll();
    spoken.current.clear();
    setSel(null);
    if (t >= scene.duration - 0.05) setT(0);
    setPlaying(true);
  };
  const playAll = () => { stopAll(); spoken.current.clear(); setSi(0); setT(0); setSel(null); setTimeout(() => setPlaying(true), 50); };

  // ---- স্টেজে টানা (ড্র্যাগ) ----
  const dragRef = useRef<{ id: string | null; moved: boolean; sx: number; sy: number }>({ id: null, moved: false, sx: 0, sy: 0 });
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !R.current.playing,
    onMoveShouldSetPanResponder: () => !R.current.playing,
    onPanResponderGrant: (e) => {
      const { scene: sc, t: tt } = R.current;
      const x = (e.nativeEvent.locationX / stageW) * STAGE_W, y = (e.nativeEvent.locationY / stageW) * STAGE_W;
      const id = hitTest(sc, tt, x, y);
      dragRef.current = { id, moved: false, sx: e.nativeEvent.locationX, sy: e.nativeEvent.locationY };
      setSel(id);
    },
    onPanResponderMove: (e) => {
      const d = dragRef.current; if (!d.id) return;
      if (!d.moved) {
        if (Math.hypot(e.nativeEvent.locationX - d.sx, e.nativeEvent.locationY - d.sy) < 7) return;
        d.moved = true; setHist((h) => pushHistory(h, R.current.movie));
      }
      const id = d.id;
      const x = Math.max(0, Math.min(STAGE_W, (e.nativeEvent.locationX / stageW) * STAGE_W));
      const y = Math.max(0, Math.min(STAGE_H, (e.nativeEvent.locationY / stageW) * STAGE_W));
      const { scene: sc, t: tt } = R.current;
      commit((m) => updateScene(m, sc.id, (s) => updateObj(s, id, (o) => setKey(o, tt, { x, y }))), false);
    },
    onPanResponderRelease: () => {
      const d = dragRef.current;
      if (d.id && !d.moved) { // শুধু ট্যাপ — মানুষ হলে অ্যানিমেশন প্যানেল খুলুন
        const o = R.current.scene.objects.find((x) => x.id === d.id);
        if (o && getAsset(o.assetId)?.cat === "human") { setAnimT(R.current.t); setSheet("anim"); }
      }
    },
  }), [stageW, commit]);

  // ---- অ্যানিমেশন প্যানেল খোলা থাকলে স্টেজেও ৩ সেকেন্ডের লুপে চলে ----
  useEffect(() => {
    if (sheet !== "anim") return;
    let raf = 0; const t0 = Date.now();
    const f = () => {
      const dur = R.current.scene.duration;
      setT(Math.min(dur - 0.01, animT + (((Date.now() - t0) / 1000) % 3)));
      raf = requestAnimationFrame(f);
    };
    raf = requestAnimationFrame(f);
    return () => { cancelAnimationFrame(raf); setT(animT); };
  }, [sheet, animT]);

  // ---- সময়-দণ্ড (স্ক্রাব) ----
  const [barW, setBarW] = useState(300);
  const seek = (px: number) => { stopAll(); setT(Math.max(0, Math.min(R.current.scene.duration, (px / barW) * R.current.scene.duration))); };
  const scrub = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => seek(e.nativeEvent.locationX), onPanResponderMove: (e) => seek(e.nativeEvent.locationX),
  }), [barW]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- বস্তুর কাজ ----
  const selObj = scene.objects.find((o) => o.id === sel) ?? null;
  const selAsset = selObj ? getAsset(selObj.assetId)! : null;
  const selCast = selObj?.castId ? movie.cast.find((c) => c.id === selObj.castId) ?? null : null;
  const editSel = (fn: (o: NonNullable<typeof selObj>) => NonNullable<typeof selObj>) => { if (selObj) commit((m) => updateScene(m, scene.id, (s) => updateObj(s, selObj.id, fn))); };
  const st = selObj ? evalObj(selObj, t) : null;

  const add = (assetId: string, castId?: string) => {
    stopAll();
    const r = addObject(R.current.movie, R.current.scene.id, assetId, castId);
    setHist((h) => pushHistory(h, R.current.movie));
    setMovie({ ...r.movie, updatedAt: Date.now() }); setSel(r.objId);
  };

  const addCb = useCallback((a: string, c?: string) => add(a, c), []); // eslint-disable-line react-hooks/exhaustive-deps
  const bgCb = useCallback((id: string) => commit((m) => setBg(m, R.current.scene.id, id)), [commit]);
  const doUndo = () => { const r = undo(hist, movie); if (r) { setHist(r.h); setMovie(r.v); setSel(null); if (si >= r.v.scenes.length) setSi(r.v.scenes.length - 1); } };
  const doRedo = () => { const r = redo(hist, movie); if (r) { setHist(r.h); setMovie(r.v); setSel(null); } };

  // ---- এক্সপোর্ট ----
  const [exp, setExp] = useState({ busy: false, p: 0, msg: "", result: null as string | null, error: "", warnings: [] as string[] });
  const cancelRef = useRef(false);
  const startExport = async (q: Quality) => {
    stopAll(); cancelRef.current = false;
    setExp({ busy: true, p: 0, msg: "শুরু হচ্ছে…", result: null, error: "", warnings: [] });
    try {
      const r = await exportMovie(R.current.movie, q, (p, msg) => setExp((e) => ({ ...e, p, msg })), () => cancelRef.current);
      setExp((e) => ({ ...e, busy: false, result: r.path, warnings: r.warnings }));
    } catch (e: any) {
      setExp((x) => ({ ...x, busy: false, error: cancelRef.current ? "বাতিল করা হয়েছে" : String(e?.message ?? e) }));
    }
  };
  const doSave = async () => { try { const n = await saveToGallery(exp.result!); Alert.alert("সেভ হয়েছে", "গ্যালারি/ভিডিও অ্যাপে দেখুন: " + n); } catch (e: any) { Alert.alert("ত্রুটি", String(e?.message ?? e)); } };
  const doShare = async () => { try { if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(exp.result!, { mimeType: "video/mp4" }); else Alert.alert("শেয়ার সম্ভব নয়"); } catch (e: any) { Alert.alert("ত্রুটি", String(e?.message ?? e)); } };

  // ---- সংলাপ ভয়েস / অডিও ----
  const [busy, setBusy] = useState("");
  const withBusy = async (msg: string, fn: () => Promise<void>) => {
    setBusy(msg);
    try { await fn(); } catch (e: any) { Alert.alert("ত্রুটি", String(e?.message ?? e)); } finally { setBusy(""); }
  };
  const objChoices = () => scene.objects.filter((o) => getAsset(o.assetId)?.talk).map((o) => { const cm = o.castId ? R.current.movie.cast.find((c) => c.id === o.castId) : null; return { id: o.id, name: cm?.name ?? getAsset(o.assetId)?.name ?? "" }; });
  const genVoice = (sceneId: string, dId: string, text: string, v: VoiceOpt) => withBusy("ভয়েস বানানো হচ্ছে…", async () => {
    const r = await makeVoice(text, v.rate, v.pitch);
    commit((m) => updateScene(m, sceneId, (sc) => updateDialogue(sc, dId, { voiceUri: r.uri, dur: r.dur })));
  });
  const addDlg = (text: string, gen: boolean, v: VoiceOpt) => {
    if (!selObj || !text.trim()) return;
    const id = Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
    const sid = scene.id, oid = selObj.id, tt = t, tx = text.trim();
    commit((m) => updateScene(m, sid, (sc) => addDialogue(sc, oid, tt, tx, id)));
    if (gen) genVoice(sid, id, tx, v); else speak(tx);
  };
  const addAudioClip = (kind: "sfx" | "voice") => withBusy("অডিও ফাইল পড়া হচ্ছে…", async () => {
    const a = await pickAudio(); if (!a) return;
    const sid = scene.id, tt = t, objId = kind === "voice" ? selObj?.id : undefined;
    commit((m) => updateScene(m, sid, (sc) => addClip(sc, { kind, name: a.name, uri: a.uri, t: tt, dur: a.dur, vol: 1, objId })));
  });
  const pickMusic = () => withBusy("মিউজিক ফাইল পড়া হচ্ছে…", async () => {
    const a = await pickAudio(); if (!a) return;
    commit((m) => ({ ...m, musicClip: { id: "music", kind: "music", name: a.name, uri: a.uri, t: 0, dur: a.dur, vol: 0.5 }, musicVol: m.musicVol ?? 0.5 }));
  });

  const dlg = dialogueAt(scene, t);
  const dlgName = dlg ? (() => { const o = scene.objects.find((x) => x.id === dlg.objId); const cm = o?.castId ? movie.cast.find((c) => c.id === o.castId) : null; return cm?.name ?? ""; })() : "";
  const actions: Action[] = selAsset ? (["auto", ...selAsset.actions] as Action[]) : [];

  return (
    <View style={s.root}>
      {/* উপরের বার */}
      <View style={s.top}>
        <TouchableOpacity onPress={() => { stopAll(); saveMovie(movie).finally(onBack); }}><Text style={s.topBtn}>← ফিরুন</Text></TouchableOpacity>
        <Text style={s.topTitle} numberOfLines={1}>{movie.name}</Text>
        <TouchableOpacity onPress={doUndo} disabled={!hist.past.length}><Text style={[s.ic, !hist.past.length && s.dis]}>↶</Text></TouchableOpacity>
        <TouchableOpacity onPress={doRedo} disabled={!hist.future.length}><Text style={[s.ic, !hist.future.length && s.dis]}>↷</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { stopAll(); setSheet("timeline"); }}><Text style={s.ic}>⏱</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { stopAll(); setSheet("audio"); }}><Text style={s.ic}>🔊</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setSheet("music")}><Text style={s.ic}>🎵</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => { stopAll(); setSheet("export"); }}><Text style={[s.topBtn, { color: C.accent }]}>MP4 ⬇</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 24 }}>
        {/* স্টেজ */}
        <View style={{ width: stageW, height: (stageW * STAGE_H) / STAGE_W }}>
          <StageView movie={movie} scene={scene} t={t} width={stageW} selectedId={playing ? null : sel} />
          <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />
          {dlg && <View style={s.cap}><Text style={s.capTxt}>{dlgName ? dlgName + ": " : ""}{dlg.text}</Text></View>}
        </View>

        {/* প্লে ও সময় */}
        <View style={[s.row, { width: stageW }]}>
          <TouchableOpacity onPress={togglePlay} style={s.play}><Text style={s.playTxt}>{playing ? "⏸" : "▶"}</Text></TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <View style={s.bar} onLayout={(e: LayoutChangeEvent) => setBarW(e.nativeEvent.layout.width)} {...scrub.panHandlers}>
              <View style={[s.barFill, { width: `${(t / scene.duration) * 100}%` }]} />
              {selObj?.keys.map((k, i) => <View key={i} pointerEvents="none" style={[s.mark, { left: `${(k.t / scene.duration) * 100}%`, backgroundColor: C.accent }]} />)}
              {scene.dialogues.map((d) => <View key={d.id} pointerEvents="none" style={[s.mark, { left: `${(d.t / scene.duration) * 100}%`, backgroundColor: C.teal, top: 20 }]} />)}
              {selObj?.acts.map((a, i) => <View key={"a" + i} pointerEvents="none" style={[s.mark, { left: `${(a.t / scene.duration) * 100}%`, backgroundColor: "#b07cff", top: 12, height: 8 }]} />)}
            </View>
          </View>
          <Text style={s.time}>{t.toFixed(1)}/{scene.duration}s</Text>
        </View>
        <View style={[s.row, { width: stageW, justifyContent: "space-between" }]}>
          <TouchableOpacity onPress={playAll}><Text style={s.link}>▶ পুরো ভিডিও</Text></TouchableOpacity>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={s.dimTxt}>গতি </Text>
            {[0.5, 1, 1.5, 2].map((v) => (
              <TouchableOpacity key={v} onPress={() => commit((m) => ({ ...m, speed: v }))} style={[s.chip, movie.speed === v && s.chipOn]}><Text style={[s.chipTxt, movie.speed === v && { color: "#111" }]}>{v}×</Text></TouchableOpacity>))}
          </View>
        </View>

        {/* নির্বাচিত বস্তুর টুল */}
        {selObj && selAsset && st && !playing && (
          <View style={[s.card, { width: stageW }]}>
            <Text style={s.cardTitle}>{selCast?.name ?? selAsset.name} <Text style={s.dimTxt}>· {t.toFixed(1)}s-এ</Text></Text>
            <View style={s.wrap}>
              <Btn label="＋ বড়" onPress={() => editSel((o) => setKey(o, t, { s: Math.min(3, st.s * 1.15) }))} />
              <Btn label="－ ছোট" onPress={() => editSel((o) => setKey(o, t, { s: Math.max(0.2, st.s / 1.15) }))} />
              <Btn label="⟲ ঘোরান" onPress={() => editSel((o) => setKey(o, t, { r: st.r - 15 }))} />
              <Btn label="⟳ ঘোরান" onPress={() => editSel((o) => setKey(o, t, { r: st.r + 15 }))} />
              <Btn label="⇋ উল্টান" onPress={() => editSel((o) => ({ ...o, flip: !o.flip }))} />
              <Btn label="📍 চাবি ও সরান" onPress={() => editSel((o) => setKey(o, t, {}))} />
              <Btn label="✖ চাবি মোছা" onPress={() => editSel((o) => removeKeyAt(o, t))} />
              <Btn label="🗑 বস্তু মুছুন" danger onPress={() => { commit((m) => removeObject(m, scene.id, selObj.id)); setSel(null); }} />
            </View>
            <Text style={s.hint}>নির্দেশ: অন্য সময়ে (সময়-দণ্ড টেনে) গিয়ে বস্তুটি সরালে সেখানে নতুন চাবি তৈরি হয়, আর মাঝখানে নিজে নিজে হেঁটে/উড়ে যায়।</Text>
            <Text style={s.sub}>কাজ (এই সময় থেকে)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {actions.map((a) => <TouchableOpacity key={a} style={s.chip} onPress={() => editSel((o) => setAction(o, t, a))}><Text style={s.chipTxt}>{ACTION_BN[a] ?? a}</Text></TouchableOpacity>)}
            </ScrollView>
            <View style={[s.wrap, { marginTop: 8 }]}>
              {selAsset.cat === "human" && <Btn label="🎭 অ্যানিমেশন" onPress={() => { setAnimT(t); setSheet("anim"); }} />}
              {selAsset.talk && <Btn label="💬 কথা বলান" onPress={() => setSheet("dialogue")} />}
              {selCast && selAsset.cat === "human" && <Btn label="🎨 চেহারা/পোশাক" onPress={() => setSheet("look")} />}
            </View>
          </View>
        )}

        {/* দৃশ্য-স্ট্রিপ */}
        <View style={[s.card, { width: stageW }]}>
          <Text style={s.cardTitle}>দৃশ্য ({movie.scenes.length}টি) <Text style={s.dimTxt}>· ভিডিও {fmtTime(activeDuration(movie))}</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {movie.scenes.map((sc, i) => (
              <TouchableOpacity key={sc.id} onPress={() => { stopAll(); setSi(i); setT(0); setSel(null); }} style={[s.scene, i === si && s.sceneOn]}>
                <Text style={{ color: C.text, fontWeight: "700" }}>দৃশ্য {i + 1}</Text><Text style={s.dimTxt}>{sc.duration}s · {sc.objects.length} বস্তু</Text>{sc.skip && <Text style={{ color: C.danger, fontSize: 11 }}>বাদ</Text>}</TouchableOpacity>))}
          </ScrollView>
          <View style={[s.wrap, { marginTop: 8 }]}>
            <Btn label="＋ নতুন দৃশ্য" onPress={() => { stopAll(); commit((m) => addScene(m, si, scene.bg)); setSi(si + 1); setT(0); setSel(null); }} />
            <Btn label="⧉ নকল" onPress={() => { stopAll(); commit((m) => duplicateScene(m, si)); setSi(si + 1); setT(0); setSel(null); }} />
            <Btn label="🗑 দৃশ্য মুছুন" danger onPress={() => { if (movie.scenes.length < 2) return Alert.alert("অন্তত একটি দৃশ্য থাকতে হবে"); stopAll(); commit((m) => deleteScene(m, si)); setSi(Math.max(0, si - 1)); setT(0); setSel(null); }} />
            <Btn label="🎞 দৃশ্য জোড়া" onPress={() => { stopAll(); setSheet("merge"); }} />
            <Btn label="⏱ টাইমলাইন" onPress={() => { stopAll(); setSheet("timeline"); }} />
            <Btn label="⏱ −" onPress={() => commit((m) => setDuration(m, scene.id, scene.duration - 1))} />
            <Btn label="⏱ ＋" onPress={() => commit((m) => setDuration(m, scene.id, scene.duration + 1))} />
          </View>
        </View>

        {/* লাইব্রেরি */}
        <View style={[{ width: stageW }]}>
          <TouchableOpacity onPress={() => setLib(!lib)}><Text style={[s.link, { padding: 8 }]}>{lib ? "▼" : "▶"} লাইব্রেরি (ব্যাকগ্রাউন্ড, মানুষ, প্রাণী, পাখি…)</Text></TouchableOpacity>
          {lib && <LibraryPanel movie={movie} scene={scene} onAdd={addCb} onBg={bgCb} />}
        </View>
      </ScrollView>

      {sheet === "anim" && selObj && selAsset && selAsset.cat === "human" && (
        <AnimationPanel
          name={selCast?.name ?? selAsset.name} asset={selAsset} look={selCast?.look as Look | undefined}
          curAction={actionAt(selObj, selAsset, animT) as any} curView={viewAt(selObj, animT) as ViewT} t={animT}
          onClose={() => setSheet(null)}
          onAction={(a) => editSel((o) => setAction(o, animT, a))}
          onAuto={() => editSel((o) => setAction(o, animT, "auto"))}
          onView={(v) => editSel((o) => setView(o, animT, v))}
          onSpeakAdd={(text) => { if (text.trim()) commit((m) => updateScene(m, scene.id, (sc) => addDialogue(sc, selObj.id, animT, text))); }}
        />
      )}
      {sheet === "dialogue" && selObj && (
        <DialogueSheet movie={movie} scene={scene} objId={selObj.id} t={t} busy={busy} onClose={() => setSheet(null)}
          onAdd={addDlg}
          onRemove={(id) => commit((m) => updateScene(m, scene.id, (sc) => removeDialogue(sc, id)))}
          onUpdate={(id, patch) => commit((m) => updateScene(m, scene.id, (sc) => updateDialogue(sc, id, patch)))}
          onVoice={(id, v) => { const d = scene.dialogues.find((x) => x.id === id); if (d) genVoice(scene.id, id, d.text, v); }}
          onPlay={(id) => { const d = scene.dialogues.find((x) => x.id === id); if (!d) return; stopClips(); if (d.voiceUri) playClip(d.voiceUri, 1); else speak(d.text); }} />
      )}
      {sheet === "look" && selCast && (
        <LookSheet cast={selCast} onClose={() => setSheet(null)} onLook={(l: Look) => commit((m) => setLook(m, selCast.id, l))} onRename={(n) => commit((m) => renameCast(m, selCast.id, n))} />
      )}
      {sheet === "music" && <MusicSheet current={movie.music} onClose={() => setSheet(null)} onPick={(id) => { commit((m) => ({ ...m, music: id })); if (!id) stopMusic(); else playMusic(id).catch(() => {}); }} />}
      {sheet === "audio" && (
        <AudioSheet movie={movie} scene={scene} t={t} objs={objChoices()} busy={busy} onClose={() => setSheet(null)}
          onMusic={(id) => { commit((m) => ({ ...m, music: id, musicClip: undefined })); if (!id) stopMusic(); else playMusic(id, R.current.movie.musicVol ?? 0.35).catch(() => {}); }}
          onMusicFile={pickMusic}
          onMusicVol={(v) => commit((m) => ({ ...m, musicVol: Math.round(v * 100) / 100 }), false)}
          onAddClip={addAudioClip}
          onUpdateClip={(id, patch) => commit((m) => updateScene(m, scene.id, (sc) => updateClip(sc, id, patch)))}
          onRemoveClip={(id) => commit((m) => updateScene(m, scene.id, (sc) => removeClip(sc, id)))} />
      )}
      {sheet === "merge" && (
        <MergeSheet movie={movie} onClose={() => setSheet(null)}
          onToggle={(id, skip) => commit((m) => setSceneFlags(m, id, { skip }))}
          onFade={(id, fade) => commit((m) => setSceneFlags(m, id, { fade }))}
          onMove={(i, d) => commit((m) => moveScene(m, i, d))}
          onAll={() => commit((m) => ({ ...m, scenes: m.scenes.map((x) => ({ ...x, skip: false })) }))}
          onExport={() => setSheet("export")} />
      )}
      {sheet === "timeline" && <TimelineEditor movie={movie} si={si} selId={sel} commit={(fn) => commit(fn)} onScene={(i) => { stopAll(); setSi(i); setT(0); }} onClose={() => setSheet(null)} />}
      {sheet === "export" && (
        <ExportSheet available={exportAvailable()} busy={exp.busy} progress={exp.p} msg={exp.msg} result={exp.result} error={exp.error} warnings={exp.warnings}
          onStart={startExport} onCancel={() => { cancelRef.current = true; }} onSave={doSave} onShare={doShare} onClose={() => { setSheet(null); setExp((e) => ({ ...e, result: null, error: "" })); }} />
      )}
    </View>
  );
}

function Btn({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return <TouchableOpacity onPress={onPress} style={[s.btn, danger && { backgroundColor: "#4a2a2e" }]}><Text style={[s.btnTxt, danger && { color: C.danger }]}>{label}</Text></TouchableOpacity>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: "row", alignItems: "center", paddingTop: 36, paddingBottom: 8, paddingHorizontal: 10, backgroundColor: C.panel },
  topBtn: { color: C.text, fontWeight: "700", fontSize: 14, marginHorizontal: 6 }, topTitle: { flex: 1, color: C.text, fontWeight: "700", fontSize: 15, marginHorizontal: 6 },
  ic: { color: C.text, fontSize: 22, marginHorizontal: 8 }, dis: { opacity: 0.3 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 6 },
  play: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" }, playTxt: { fontSize: 20, color: "#111" },
  bar: { height: 34, backgroundColor: C.panel2, borderRadius: 8, overflow: "hidden", justifyContent: "center" },
  barFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#FFB02055" },
  mark: { position: "absolute", top: 4, width: 6, height: 10, borderRadius: 3 },
  time: { color: C.dim, fontSize: 12, minWidth: 54, textAlign: "right" },
  cap: { position: "absolute", left: 10, right: 10, bottom: 8, backgroundColor: "#000a", borderRadius: 8, padding: 6 }, capTxt: { color: "#fff", textAlign: "center", fontSize: 15 },
  card: { backgroundColor: C.panel, borderRadius: 14, padding: 10, marginTop: 8 }, cardTitle: { color: C.text, fontWeight: "700", fontSize: 15, marginBottom: 6 },
  wrap: { flexDirection: "row", flexWrap: "wrap" },
  btn: { backgroundColor: C.panel2, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10, marginRight: 6, marginBottom: 6 }, btnTxt: { color: C.text, fontSize: 13, fontWeight: "600" },
  chip: { backgroundColor: C.panel2, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 14, marginRight: 6 }, chipOn: { backgroundColor: C.accent }, chipTxt: { color: C.text, fontSize: 13 },
  hint: { color: C.dim, fontSize: 11, marginVertical: 4 }, sub: { color: C.dim, fontSize: 12, marginBottom: 4 }, dimTxt: { color: C.dim, fontSize: 12 }, link: { color: C.accent, fontWeight: "700" },
  scene: { backgroundColor: C.panel2, padding: 10, borderRadius: 10, marginRight: 8, minWidth: 96 }, sceneOn: { borderWidth: 2, borderColor: C.accent },
});
