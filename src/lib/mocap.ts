// ভিডিও থেকে মানুষের নড়াচড়া → অ্যাপের নিজস্ব 2D চরিত্রের রিগ। পুরোটা ফোনের ভেতরেই চলে; কোনো সার্ভার/ক্লাউড/জেনারেটিভ AI নেই।
// ধাপ: (১) প্রতি ফ্রেমের ৩৩-জয়েন্ট ভঙ্গি থেকে দুজনকে আলাদা করা  (২) ফাঁক ভরা  (৩) মসৃণ করা  (৪) জয়েন্ট → রিগের কোণ।
// জয়েন্ট বের করে MediaPipe Pose Landmarker (অফলাইন মডেল, নেটিভ মডিউলে) — এই ফাইল শুধু গণিত, তাই এখানে টেস্ট করা যায়।
import { STAGE_H, STAGE_W } from "./scene";

export type Pose33 = number[];                       // ৯৯ সংখ্যা: প্রতি জয়েন্টে x, y (০–১), দৃশ্যমানতা
export type Track = (Pose33 | null)[];               // এক ব্যক্তির প্রতি ফ্রেমের ভঙ্গি
export type CropRequest = { person: number; frame: number; box: [number, number, number, number] };
export type CropResult = { person: number; frame: number; pose: Pose33 };
export const CH = ["aL0", "aL1", "aR0", "aR1", "gL", "gR", "lfL", "lfR", "tilt", "x", "y"] as const;
export type Ch = (typeof CH)[number];
// একজন ব্যক্তির নড়াচড়া: সব চ্যানেল মঞ্চের একক (১২৮০×৭২০) ও রিগের কোণে তৈরি
export type Mocap = { fps: number; n: number; face: 1 | -1; scale: number; ch: Record<Ch, number[]>; env: number[]; prop?: string };

const NOSE = 0, LS = 11, RS = 12, LE = 13, RE = 14, LW = 15, RW = 16, LH = 23, RH = 24, LA = 27, RA = 28;
const lm = (p: Pose33, i: number): [number, number, number] => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
const cen = (p: Pose33): [number, number] => {
  let x = 0, y = 0; for (const i of [LS, RS, LH, RH]) { x += p[i * 3]; y += p[i * 3 + 1]; } return [x / 4, y / 4];
};
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// ---------- ১) দুজনকে আলাদা রাখা (ছোট/বড় x দেখে শুরু, তারপর কাছের জনকে ধরে) ----------
export function trackIdentities(frames: Pose33[][]): [Track, Track] {
  const T: [Track, Track] = [frames.map(() => null), frames.map(() => null)];
  let last: ([number, number] | null)[] = [null, null];
  frames.forEach((poses, i) => {
    const ps = [...poses].sort((a, b) => cen(a)[0] - cen(b)[0]);
    if (!last[0] || !last[1]) {
      if (ps.length >= 2) { const a = ps[0], b = ps[ps.length - 1]; T[0][i] = a; T[1][i] = b; last = [cen(a), cen(b)]; }
      return;
    }
    if (ps.length >= 2) {
      const a = ps[0], b = ps[ps.length - 1], ca = cen(a), cb = cen(b);
      const straight = dist(ca, last[0]!) + dist(cb, last[1]!) <= dist(ca, last[1]!) + dist(cb, last[0]!);
      const asg: [number, number] = straight ? [0, 1] : [1, 0];
      T[asg[0]][i] = a; last[asg[0]] = ca; T[asg[1]][i] = b; last[asg[1]] = cb;
    } else if (ps.length === 1) {
      const c = cen(ps[0]); const k = dist(c, last[1]!) < dist(c, last[0]!) ? 1 : 0;
      if (dist(c, last[k]!) < 0.25) { T[k][i] = ps[0]; last[k] = c; }
    }
  });
  return T;
}

// ---------- ২) ধরা না-পড়া ফ্রেমের জন্য: ওই ব্যক্তির এলাকা কেটে আবার খোঁজার অনুরোধ ----------
export function cropRequests(tracks: Track[]): CropRequest[] {
  const out: CropRequest[] = [];
  tracks.forEach((tr, person) => {
    const known = tr.map((p, i) => (p ? i : -1)).filter((i) => i >= 0);
    if (!known.length) return;
    tr.forEach((p, frame) => {
      if (p) return;
      const j = known.reduce((a, b) => (Math.abs(b - frame) < Math.abs(a - frame) ? b : a));
      let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
      for (let k = 0; k < 33; k++) { const [x, y] = lm(tr[j]!, k); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      const pw = (x1 - x0) * 0.6 + 0.05, ph = (y1 - y0) * 0.25 + 0.05;
      out.push({ person, frame, box: [Math.max(0, x0 - pw), Math.max(0, y0 - ph), Math.min(1, x1 + pw), Math.min(1, y1 + ph)] });
    });
  });
  return out;
}
export function mergeCrops(tracks: Track[], res: CropResult[]): Track[] {
  const t = tracks.map((x) => [...x]); for (const r of res) if (!t[r.person][r.frame]) t[r.person][r.frame] = r.pose; return t;
}

// ---------- সংখ্যাগত সহায়ক (numpy/scipy-র সমতুল্য) ----------
const median = (a: number[]) => { const b = [...a].sort((x, y) => x - y), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };
const percentile = (a: number[], q: number) => { const b = [...a].sort((x, y) => x - y), r = (q / 100) * (b.length - 1), lo = Math.floor(r), hi = Math.ceil(r); return b[lo] + (b[hi] - b[lo]) * (r - lo); };
function fillGaps(v: number[]): number[] {
  const ok: number[] = []; v.forEach((x, i) => { if (Number.isFinite(x)) ok.push(i); });
  if (ok.length < 2) return v.map((x) => (Number.isFinite(x) ? x : ok.length ? v[ok[0]] : 0));
  return v.map((x, i) => {
    if (Number.isFinite(x)) return x;
    if (i <= ok[0]) return v[ok[0]]; if (i >= ok[ok.length - 1]) return v[ok[ok.length - 1]];
    let hi = ok.findIndex((j) => j > i), lo = hi - 1; const a = ok[lo], b = ok[hi];
    return v[a] + ((v[b] - v[a]) * (i - a)) / (b - a);
  });
}
function gauss(v: number[], sigma: number): number[] {
  const r = Math.floor(4 * sigma + 0.5), w: number[] = []; let s = 0;
  for (let k = -r; k <= r; k++) { const g = Math.exp((-0.5 * k * k) / (sigma * sigma)); w.push(g); s += g; }
  const n = v.length;
  return v.map((_, i) => { let a = 0; for (let k = -r; k <= r; k++) a += w[k + r] * v[Math.min(n - 1, Math.max(0, i + k))]; return a / s; });
}
function unwrap(v: number[]): number[] {
  const o = [v[0]]; let off = 0;
  for (let i = 1; i < v.length; i++) { let d = v[i] - v[i - 1]; if (d > Math.PI) off -= 2 * Math.PI * Math.ceil((d - Math.PI) / (2 * Math.PI)); else if (d < -Math.PI) off += 2 * Math.PI * Math.ceil((-d - Math.PI) / (2 * Math.PI)); o.push(v[i] + off); }
  return o;
}
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// ---------- ৩–৪) জয়েন্ট → রিগের কোণ (ভিডিওর পিক্সেলে হিসাব, ফলাফল রিগের একক) ----------
export type Raw = { ch: Record<Ch, number[]>; k: number; ground: number };
export function rawChannels(track: Track, vw: number, vh: number): Raw {
  const N = track.length;
  // প্রতিটি জয়েন্টের x,y: কম-দৃশ্যমান হলে ফাঁক, তারপর সময়ে ভরে মসৃণ (σ=১.৬)
  const P: number[][][] = [];
  for (let j = 0; j < 33; j++) {
    const xs: number[] = [], ys: number[] = [];
    for (let i = 0; i < N; i++) { const p = track[i]; const ok = p && p[j * 3 + 2] >= 0.35; xs.push(ok ? p![j * 3] : NaN); ys.push(ok ? p![j * 3 + 1] : NaN); }
    P.push([gauss(fillGaps(xs), 1.6).map((x) => x * vw), gauss(fillGaps(ys), 1.6).map((y) => y * vh)]);
  }
  const pt = (j: number, i: number) => [P[j][0][i], P[j][1][i]];
  const hip = (i: number) => [(P[LH][0][i] + P[RH][0][i]) / 2, (P[LH][1][i] + P[RH][1][i]) / 2];
  const sh = (i: number) => [(P[LS][0][i] + P[RS][0][i]) / 2, (P[LS][1][i] + P[RS][1][i]) / 2];
  const torso = median(Array.from({ length: N }, (_, i) => dist(sh(i), hip(i))));
  const kscale = torso / 93;
  const legs = Array.from({ length: N }, (_, i) => [dist(pt(LH, i), pt(LA, i)), dist(pt(RH, i), pt(RA, i))]).flat();
  const legL = percentile(legs, 90);
  const hipY = median(Array.from({ length: N }, (_, i) => hip(i)[1]));
  const ang = (a: number[], b: number[], sg: number) => Math.atan2(sg * (b[0] - a[0]), b[1] - a[1]);
  const rec: Record<Ch, number[]> = { aL0: [], aL1: [], aR0: [], aR1: [], gL: [], gR: [], lfL: [], lfR: [], tilt: [], x: [], y: [] };
  let cur = false;
  for (let i = 0; i < N; i++) {
    const d = P[LS][0][i] - P[RS][0][i];
    if (Math.abs(d) > 0.04 * torso) cur = d > 0;
    const S = (a: number, b: number): [number, number] => (cur ? [b, a] : [a, b]);  // (পর্দার বাঁ, পর্দার ডান)
    const [l, r] = S(LS, RS), [el, er] = S(LE, RE), [wl, wr] = S(LW, RW), [hl, hr] = S(LH, RH), [al, ar] = S(LA, RA);
    rec.aL0.push(ang(pt(l, i), pt(el, i), -1)); rec.aL1.push(ang(pt(el, i), pt(wl, i), -1));
    rec.aR0.push(ang(pt(r, i), pt(er, i), 1)); rec.aR1.push(ang(pt(er, i), pt(wr, i), 1));
    for (const [nm, h, a] of [["L", hl, al], ["R", hr, ar]] as const) {
      const v = [pt(a, i)[0] - pt(h, i)[0], pt(a, i)[1] - pt(h, i)[1]];
      rec[("g" + nm) as Ch].push(Math.atan2(v[0], v[1])); rec[("lf" + nm) as Ch].push(Math.min(35, Math.max(0, 1 - Math.hypot(v[0], v[1]) / legL) * 102));
    }
    const hp = hip(i), s = sh(i);
    rec.tilt.push(Math.max(-0.15, Math.min(0.15, ((P[NOSE][0][i] - s[0]) / kscale / 40) * 0.6)));
    rec.x.push(hp[0]); rec.y.push(hp[1] - hipY);
  }
  const out = {} as Record<Ch, number[]>;
  for (const c of CH) out[c] = gauss(["aL0", "aL1", "aR0", "aR1", "gL", "gR"].includes(c) ? unwrap(rec[c]) : rec[c], 1.2);
  const ground = median(Array.from({ length: N }, (_, i) => Math.max(P[LA][1][i], P[RA][1][i])));
  return { ch: out, k: kscale, ground };
}

// দর্শনীয় করতে হাতের নড়া বাড়ানো (গড় ভঙ্গির চারপাশে), মুখ ফেরানো, মঞ্চের একক
const upMedian = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
export function buildMocap(track: Track, vw: number, vh: number, opts: { fps: number; face: 1 | -1; env?: number[]; armGain?: [number, number] }): Mocap {
  const raw = rawChannels(track, vw, vh), N = track.length, [g0, g1] = opts.armGain ?? [2.4, 1.8], face = opts.face;
  const amp = (a: number[], gain: number) => { const w = a.map(wrap), m = upMedian(w); return w.map((x) => Math.max(-0.6, Math.min(3.1, m + gain * wrap(x - m)))); };
  const T = (a: number[], sa: number) => a.map((x) => Math.atan2(face * sa * Math.sin(x), Math.cos(x)));
  const G = (a: number[]) => a.map((x) => Math.atan2(face * Math.sin(x), Math.cos(x)));
  const fy = STAGE_H / vh, pw = vw * fy, x0 = (STAGE_W - pw) / 2;     // ভিডিও মঞ্চে মাঝখানে, উচ্চতা ভরে
  const c = raw.ch;
  const ch: Record<Ch, number[]> = {
    aL0: T(amp(c.aL0, g0), -1), aL1: T(amp(c.aL1, g1), -1), aR0: T(amp(c.aR0, g0), 1), aR1: T(amp(c.aR1, g1), 1),
    gL: G(c.gL), gR: G(c.gR), lfL: c.lfL, lfR: c.lfR, tilt: c.tilt,
    x: c.x.map((v) => x0 + v * fy), y: c.y.map((v) => (raw.ground + v) * fy),
  };
  return { fps: opts.fps, n: N, face, scale: raw.k * fy, ch, env: opts.env ?? [] };
}

// ---------- সময় অনুযায়ী মান নেওয়া (রেন্ডার ও এক্সপোর্ট দুটোই এটা ব্যবহার করে) ----------
export function sampleMocap(m: Mocap, t: number): Record<Ch, number> & { mouthLevel: number } {
  const f = Math.max(0, Math.min(m.n - 1, t * m.fps)), i = Math.floor(f), j = Math.min(m.n - 1, i + 1), u = f - i;
  const o = {} as Record<Ch, number>; for (const c of CH) o[c] = m.ch[c][i] * (1 - u) + m.ch[c][j] * u;
  const e = m.env.length ? m.env[Math.min(m.env.length - 1, Math.round(t * m.fps))] ?? 0 : 0;
  return { ...o, mouthLevel: e };
}
// রিগের ঐচ্ছিক mc ওভাররাইড (human.ts: Pose.mc)
export function mocapPose(m: Mocap, t: number, prop?: string): { mc: Record<string, any>; mouthLevel: number } {
  const s = sampleMocap(m, t);
  return { mouthLevel: s.mouthLevel, mc: { L: { a: [s.aL0, s.aL1] }, R: { a: [s.aR0, s.aR1] }, lgA: [s.gL, s.gR], liftL: s.lfL, liftR: s.lfR, bob: 0, sway: 0, tilt: s.tilt, expr: "smile", eyes: "open", noHold: true, ...(prop ? { prop } : {}) } };
}
// আওয়াজের জোর → ঠোঁটের আকৃতি (অ্যাপের নিজের নিয়মের মতো: নীরবে বন্ধ, জোরে বেশি খোলা)
const SHAPES = ["A", "E", "O", "A", "U", "E"] as const;
export function mocapMouth(level: number, t: number): { shape: "A" | "E" | "O" | "U" | "M"; open: number } | null {
  if (level < 0.12) return { shape: "M", open: 0 };
  return { shape: SHAPES[Math.floor(t / 0.12) % 6], open: Math.min(1, level * 1.5) };
}

// ---------- দুজনকে আলাদা রাখা (বহু-অংশ শনাক্তকরণের ফল থেকে) ----------
// frames[i] = ওই ফ্রেমে পাওয়া সব "ঠিক" ভঙ্গি (বাঁ-ডান নিয়মহীন)। ফল: [বাঁ জনের ট্র্যাক, ডান জনের ট্র্যাক]।
// নিয়ম: দুজন একই জায়গায় চাপবে না; আগের ফ্রেমের কাছের জনকে একই মানুষ ধরা; এক জন পাওয়া গেলে কাছের "স্লটে" বসে।
const hipC = (p: Pose33) => [(p[69] + p[72]) / 2, (p[70] + p[73]) / 2];
const poseScore = (p: Pose33) => [0, 11, 12, 23, 24, 25, 26, 27, 28].reduce((a, j) => a + p[j * 3 + 2], 0) / 9;
export function assignSlots(frames: Pose33[][], aspect = 1.78): [Track, Track] {
  const N = frames.length; const tr: [Track, Track] = [new Array(N).fill(null), new Array(N).fill(null)];
  const last: (Pose33 | null)[] = [null, null];
  const dist = (a: Pose33, b: Pose33) => { const x = hipC(a), y = hipC(b); return Math.hypot(x[0] - y[0], (x[1] - y[1]) * aspect); };
  for (let i = 0; i < N; i++) {
    // একই মানুষের পুনরাবৃত্তি বাদ (সবচেয়ে ভালো স্কোর রেখে)
    const keep: Pose33[] = [];
    for (const p of [...frames[i]].sort((a, b) => poseScore(b) - poseScore(a))) if (keep.every((q) => dist(p, q) > 0.12)) keep.push(p);
    const c = keep.slice(0, 3).sort((a, b) => hipC(a)[0] - hipC(b)[0]);
    if (c.length >= 2) {
      let best: { cost: number; a: Pose33; b: Pose33 } | null = null;
      for (let a = 0; a < c.length; a++) for (let b = a + 1; b < c.length; b++) {
        let cost = -(poseScore(c[a]) + poseScore(c[b]));
        for (const [s, p] of [[0, c[a]], [1, c[b]]] as const) { const l = last[s]; if (l) cost += 3 * Math.hypot(hipC(p)[0] - hipC(l)[0], hipC(p)[1] - hipC(l)[1]); }
        if (!best || cost < best.cost) best = { cost, a: c[a], b: c[b] };
      }
      tr[0][i] = best!.a; tr[1][i] = best!.b;
    } else if (c.length === 1) {
      const p = c[0]; const d = [0, 1].map((s) => (last[s] ? Math.hypot(hipC(p)[0] - hipC(last[s]!)[0], hipC(p)[1] - hipC(last[s]!)[1]) : 9));
      const s = Math.min(d[0], d[1]) < 9 ? (d[0] <= d[1] ? 0 : 1) : hipC(p)[0] < 0.5 ? 0 : 1;
      tr[s][i] = p;
    }
    for (const s of [0, 1]) if (tr[s][i]) last[s] = tr[s][i];
  }
  return tr;
}
