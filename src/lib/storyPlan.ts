// গল্প → পরিকল্পনা (Plan). সম্পূর্ণ অফলাইন, নিয়ম ও শব্দভাণ্ডার-ভিত্তিক — কোনো AI/ক্লাউড নেই।
// বাংলা ও ইংরেজি গল্পের সাধারণ বাক্য বোঝে; জটিল/ইঙ্গিতপূর্ণ বাক্য বুঝবে না।
import type { Action } from "../art/shapes";

export type Role = { key: string; asset: string; look?: Record<string, string>; voice: "boy" | "girl" | "kid" | "man" | "woman" | "elder" | "elderF" | "deity" | "animal"; label: string };
export type Char = { id: string; name: string; role: Role };
export type Ride = "cycle" | "scooty" | "bike" | "car" | "bus" | "auto" | "truck";
export type Unit =
  | { kind: "narr"; text: string; chars: string[]; action?: Action; ride?: Ride; walk?: boolean; hold?: boolean; sfx?: string; bg?: string; mood?: string }
  | { kind: "say"; who: string; text: string; sfx?: string };
export type PlanScene = { bg: string; units: Unit[] };
export type StoryPlan = { chars: Char[]; scenes: PlanScene[]; mood: "happy" | "calm" | "adventure"; notes: string[]; units: number };

// ---------- শব্দভাণ্ডার ----------
const R = (key: string, asset: string, voice: Role["voice"], label: string, look?: Role["look"]): Role => ({ key, asset, voice, label, look });
const ROLE_WORDS: [string[], Role][] = [
  [["বৃদ্ধা", "দিদা", "ঠাকুমা", "দিদিমা", "ঠাম্মা", "grandmother", "granny"], R("elderF", "woman", "elderF", "বৃদ্ধা", { hair: "#eeeeee", top: "#8a6bbf", top2: "#a98bd6" })],
  [["বৃদ্ধ", "দাদু", "ঠাকুরদা", "দাদুভাই", "grandfather", "grandpa"], R("elder", "elder", "elder", "বৃদ্ধ")],
  [["শিশু", "বাচ্চা", "খোকা", "খুকি", "খোকন", "খুকু", "kid", "child", "baby"], R("kid", "kid", "kid", "শিশু")],
  [["ছেলে", "বালক", "ভাই", "boy"], R("boy", "boy", "boy", "ছেলে")],
  [["মেয়ে", "বালিকা", "বোন", "girl"], R("girl", "girl", "girl", "মেয়ে")],
  [["কৃষক", "চাষি", "চাষী", "farmer"], R("farmer", "farmer", "man", "কৃষক")],
  [["শিক্ষক", "স্যার", "মাস্টার", "teacher"], R("teacher", "teacher", "man", "শিক্ষক")],
  [["শিক্ষিকা", "দিদিমণি"], R("teacherF", "woman", "woman", "শিক্ষিকা")],
  [["পুরোহিত", "পূজারি", "পূজারী", "ব্রাহ্মণ", "priest"], R("priest", "priest", "man", "পুরোহিত")],
  [["ফলওয়ালা", "ফলবিক্রেতা", "ফল-বিক্রেতা"], R("fruit", "fruit_seller", "man", "ফল বিক্রেতা")],
  [["সবজিওয়ালা", "সবজিবিক্রেতা"], R("veg", "veg_seller", "woman", "সবজি বিক্রেতা")],
  [["মাছওয়ালা", "জেলে", "মাছবিক্রেতা"], R("fish", "fish_seller", "man", "মাছ বিক্রেতা")],
  [["দোকানদার", "shopkeeper"], R("shop", "shopkeeper", "man", "দোকানদার")],
  [["গায়ক", "singer"], R("singer", "singer", "man", "গায়ক")],
  [["গায়িকা"], R("singerF", "singer_f", "woman", "গায়িকা")],
  [["ভক্ত"], R("bhakta", "bhakta", "elder", "ভক্ত")],
  [["ক্রেতা", "customer"], R("customer", "customer", "man", "ক্রেতা")],
  [["পুরুষ", "লোক", "বাবা", "ভদ্রলোক", "কাকা", "মামা", "man", "father", "dad"], R("man", "man", "man", "পুরুষ")],
  [["মহিলা", "মা", "মাসি", "পিসি", "বউ", "কাকিমা", "মামি", "woman", "mother", "mom"], R("woman", "woman", "woman", "মহিলা")],
  [["গরু", "cow"], R("cow", "cow", "animal", "গরু")], [["ছাগল", "goat"], R("goat", "goat", "animal", "ছাগল")],
  [["কুকুর", "dog"], R("dog", "dog", "animal", "কুকুর")], [["বিড়াল", "cat"], R("cat", "cat", "animal", "বিড়াল")],
  [["হাতি", "elephant"], R("elephant", "elephant", "animal", "হাতি")], [["ঘোড়া", "horse"], R("horse", "horse", "animal", "ঘোড়া")],
  [["বানর", "বাঁদর", "monkey"], R("monkey", "monkey", "animal", "বানর")], [["সিংহ", "lion"], R("lion", "lion", "animal", "সিংহ")],
  [["ইঁদুর", "ইদুর", "mouse"], R("mouse", "mouse", "animal", "ইঁদুর")], [["ষাঁড়", "বলদ", "bull"], R("bull", "bull", "animal", "ষাঁড়")],
  [["কাক", "crow"], R("crow", "crow", "animal", "কাক")], [["টিয়া", "টিয়াপাখি", "parrot"], R("parrot", "parrot", "animal", "টিয়া")],
  [["কবুতর", "pigeon"], R("pigeon", "pigeon", "animal", "কবুতর")], [["হাঁস", "duck"], R("duck", "duck", "animal", "হাঁস")],
  [["মুরগি", "মুরগী", "hen"], R("hen", "hen", "animal", "মুরগি")], [["পেঁচা", "owl"], R("owl", "owl", "animal", "পেঁচা")],
  [["ময়ূর", "peacock"], R("peacock", "peacock", "animal", "ময়ূর")], [["রাজহংস"], R("swan", "swan", "animal", "রাজহংস")],
  [["গণেশ", "গনেশ", "গজানন", "ganesha", "ganesh"], R("ganesha", "ganesha", "deity", "গণেশ")], [["শিব", "মহাদেব", "shiva"], R("shiva", "shiva", "deity", "শিব")],
  [["দুর্গা", "durga"], R("durga", "durga", "deity", "দুর্গা")], [["লক্ষ্মী", "লক্ষী", "lakshmi"], R("lakshmi", "lakshmi", "deity", "লক্ষ্মী")],
  [["সরস্বতী", "saraswati"], R("saraswati", "saraswati", "deity", "সরস্বতী")], [["কৃষ্ণ", "krishna"], R("krishna", "krishna", "deity", "কৃষ্ণ")],
  [["রাম", "rama"], R("rama", "rama", "deity", "রাম")], [["হনুমান", "hanuman"], R("hanuman", "hanuman", "deity", "হনুমান")],
  [["কালী", "কালি", "kali"], R("kali", "kali", "deity", "কালী")], [["কার্তিক", "kartik"], R("kartik", "kartik", "deity", "কার্তিক")],
  [["বিষ্ণু", "vishnu"], R("vishnu", "vishnu", "deity", "বিষ্ণু")],
];
const BG_WORDS: [string[], string][] = [
  [["ঘাট", "ঘাটে", "ghat"], "bg_ghat"], [["ফলের বাজার"], "bg_fruitmarket"], [["রান্নাঘর", "kitchen"], "bg_kitchen"], [["শোবার ঘর", "bedroom"], "bg_bedroom"],
  [["মণ্ডপ", "পূজামণ্ডপ", "pandal"], "bg_pandal"], [["মন্দির", "temple"], "bg_temple"], [["নদী", "নদীর", "river"], "bg_river"], [["বাজার", "market", "bazaar"], "bg_bazaar"],
  [["হাসপাতাল", "hospital"], "bg_hospital"], [["স্টেশন", "station"], "bg_station"], [["বাসস্ট্যান্ড", "bus stand"], "bg_busstand"], [["সমুদ্র", "সৈকত", "sea", "beach"], "bg_sea"],
  [["বিয়ে", "বিয়েবাড়ি", "wedding"], "bg_wedding"], [["মেলা", "fair"], "bg_fair"], [["পাহাড়", "mountain", "hill"], "bg_mountain"], [["খামার", "ক্ষেত", "খেত", "farm"], "bg_farm"],
  [["অফিস", "office"], "bg_office"], [["কলেজ", "college"], "bg_college"], [["স্কুল", "বিদ্যালয়", "school"], "bg_school"], [["পার্ক", "বাগান", "park", "garden"], "bg_park"],
  [["বন", "জঙ্গল", "অরণ্য", "forest", "jungle"], "bg_jungle"], [["মাঠ", "field"], "bg_field"], [["দোকান", "shop", "store"], "bg_shop"],
  [["রাস্তা", "পথ", "road", "street"], "bg_road"], [["শহর", "city", "town"], "bg_city"], [["গ্রাম", "village"], "bg_village"],
  [["বাড়ি", "বাড়িতে", "ঘর", "ঘরে", "home", "house", "room"], "bg_room"], [["বৃষ্টি", "rain"], "bg_rain"], [["সন্ধ্যা", "সূর্যাস্ত", "dusk", "sunset"], "bg_dusk"], [["রাত", "রাতে", "night"], "bg_nightcity"],
];
const ACT_WORDS: [string[], Action][] = [
  [["প্রণাম", "pranam"], "pranam"], [["আরতি", "arti"], "arti"], [["পূজা", "পুজো", "পুজা", "pooja", "puja", "worship"], "pooja"], [["নমস্কার", "namaste"], "namaste"],
  [["আশীর্বাদ", "bless"], "bless"], [["হাততালি", "clap"], "clap"], [["হাত ধর", "hand in hand", "holding hands"], "holdhand"],
  [["দৌড়", "ছুট", "run", "ran"], "run"], [["নাচ", "dance", "danced"], "dance"], [["গান", "গাইল", "গাইছে", "গাইতে", "sing", "sang"], "sing"],
  [["কাঁদ", "কান্না", "cry", "cried", "wept"], "cry"], [["হাস", "হেসে", "laugh", "smiled"], "laugh"], [["রাগ", "চটে", "angry"], "angry"], [["ভয়", "scared", "afraid"], "scared"],
  [["লাফ", "jump"], "jump"], [["ঘুম", "sleep", "slept"], "sleep"], [["খেল", "খায়", "খাচ্ছ", "খাওয়া", "ate", "eat"], "eat"], [["রান্না", "cook"], "cook"],
  [["ওজন", "weigh"], "weigh"], [["বিক্রি", "বেচ", "sell", "sold"], "sell"], [["কিনল", "কিনে", "কেনা", "কিনতে", "কেনাকাটা", "bought", "buy"], "pay"],
  [["পড়াল", "পড়াচ্ছ", "teach"], "teach"], [["লিখল", "লিখছ", "লিখে", "wrote", "write"], "write"], [["ভাবল", "ভাবছ", "চিন্তা", "think", "thought"], "think"],
  [["হাত নাড়", "হাত নেড়ে", "wave", "waved"], "wave"], [["বসল", "বসে", "বসলেন", "বসেছিল", "বসতে", "sat", "sit", "seated"], "sit"], [["দাঁড়াল", "দাঁড়িয়ে", "দাঁড়িয়েছিল", "stood", "stand"], "stand"],
  [["হাঁটল", "হাঁটছ", "হাঁটতে", "হাঁটে", "হেঁটে", "চলল", "চলছ", "গেল", "গেলেন", "এল", "এলেন", "এসে", "গিয়ে", "walk", "walked", "went", "came"], "walk"],
];
const RIDE_WORDS: [string[], Ride][] = [
  [["সাইকেল", "bicycle", "cycle"], "cycle"], [["স্কুটি", "স্কুটার", "scooty", "scooter"], "scooty"], [["মোটরসাইকেল", "বাইক", "bike", "motorcycle"], "bike"],
  [["ট্রাক", "truck"], "truck"], [["অটো", "auto"], "auto"], [["বাস", "bus"], "bus"], [["গাড়ি", "গাড়িতে", "car"], "car"],
];
const DRIVE = ["চালা", "চালিয়ে", "চড়", "চলল", "ride", "rode", "drive", "drove"];
const SPEECH = ["বলল", "বলে", "বললেন", "বলেন", "বলতে", "জিজ্ঞেস", "জিজ্ঞাসা", "চেঁচিয়ে", "চেঁচাল", "উত্তর", "বলে উঠল", "ডাকল", "ডাকলেন", "said", "asked", "shouted", "replied", "cried"];
const SAD = ["দুঃখ", "কান্না", "কাঁদ", "মন খারাপ", "হারিয়ে", "হারাল", "sad", "lost"];
const ADV = ["দৌড়", "বিপদ", "ভয়", "যুদ্ধ", "অভিযান", "খুঁজ", "adventure", "chase"];
const SFX_WORDS: [string[], string][] = [[["ঘণ্টা", "ঘন্টা", "bell"], "bell"], [["হাসল", "হেসে", "হাসি", "laugh"], "laugh"], [["অবাক", "আরে", "surprise"], "surprise"], [["টাকা", "দাম", "ding"], "ding"]];
const GROUP = ["দুজন", "দুজনে", "দুজনেই", "সবাই", "সকলে", "সকলেই", "তারা", "তাঁরা", "both", "everyone", "they", "all"];
const STOP = new Set(["সে", "তিনি", "তারা", "তাঁরা", "আমি", "তুমি", "আমরা", "এই", "ওই", "তার", "তাঁর", "এক", "একটি", "একদিন", "ছোট", "বড়", "খুব", "আর", "কিন্তু", "তখন", "এবং", "the", "a", "an", "he", "she", "they", "it"]);
const SUFFIX = ["গুলো", "গুলি", "দের", "েরা", "রা", "টি", "টা", "ের", "কে", "র", "ে", "য়", "ও", "ই", "তে", "ত"];

// ---------- ছোট সহায়ক ----------
const norm = (t: string) => t.normalize("NFC").replace(/[‌‍]/g, "");
export const tokens = (s: string): string[] => norm(s).toLowerCase().split(/[\s,;:!?।.“”"'‘’«»()\-–—…]+/u).filter(Boolean);
const variants = (w: string): string[] => { const o = [w]; for (const s of SUFFIX) if (w.length > s.length + 1 && w.endsWith(s)) o.push(w.slice(0, -s.length)); return o; };
const hasWord = (toks: string[], words: string[]) => toks.some((t) => variants(t).some((v) => words.includes(v)));
const hasStem = (text: string, stems: string[]) => stems.some((s) => text.includes(s));
const wordsIn = (text: string, set: string[]) => set.some((s) => (/^[a-z ]+$/i.test(s) ? new RegExp(`\\b${s}\\b`, "i").test(text) : text.includes(s)));

function roleOfToken(t: string): Role | null {
  const vs = variants(t);
  for (const [ws, r] of ROLE_WORDS) if (vs.some((v) => ws.includes(v))) return r;
  return null;
}
export function bgOf(text: string): string | null {
  const T = norm(text).toLowerCase();
  for (const [ws, bg] of BG_WORDS) if (ws.some((w) => (/^[a-z ]+$/.test(w) ? new RegExp(`\\b${w}\\b`).test(T) : T.includes(w)))) return bg;
  return null;
}
export function actionOf(text: string): Action | null {
  const T = norm(text).toLowerCase();
  for (const [ws, a] of ACT_WORDS) if (ws.some((w) => (/^[a-z ]+$/.test(w) ? new RegExp(`\\b${w}\\b`).test(T) : T.includes(w)))) return a;
  return null;
}
export function rideOf(text: string): Ride | null {
  const T = norm(text).toLowerCase(); const toks = tokens(T);
  if (!hasStem(T, DRIVE) && !wordsIn(T, DRIVE)) return null;
  for (const [ws, r] of RIDE_WORDS) if (toks.some((t) => variants(t).some((v) => ws.includes(v))) || ws.some((w) => T.includes(w) && w.length > 3)) return r;
  return null;
}

// ---------- মূল বিশ্লেষণ ----------
type Seg = { quote: boolean; text: string };
function segments(text: string): Seg[] {
  const out: Seg[] = []; const re = /“([^”]+)”|"([^"]+)"|‘([^’]{2,})’|«([^»]+)»/g; let last = 0, m: RegExpExecArray | null;
  const t = norm(text);
  while ((m = re.exec(t))) { if (m.index > last) out.push({ quote: false, text: t.slice(last, m.index) }); out.push({ quote: true, text: (m[1] ?? m[2] ?? m[3] ?? m[4]).trim() }); last = m.index + m[0].length; }
  if (last < t.length) out.push({ quote: false, text: t.slice(last) });
  return out;
}
const sentences = (s: string): string[] => s.split(/(?<=[।.!?\n])\s+|\n+/u).map((x) => x.trim()).filter((x) => x.replace(/[।.!?,\s]/g, "").length > 0);

export function planStory(raw: string): StoryPlan {
  const notes: string[] = [];
  const text = norm(raw).trim();
  const chars: Char[] = []; const names = new Map<string, string>();         // নাম → char id
  const seen = new Map<string, number>();
  // ১) নাম শনাক্ত: "X নামের ছেলে", "ছেলেটির নাম X", "named X"
  const intro: { name: string; role: Role }[] = [];
  for (const m of text.matchAll(/([^\s,।!?"“”]+)\s+(?:নামের|নামে|নামক)\s+(?:একটি\s+|একজন\s+|এক\s+|ছোট্ট\s+|ছোট\s+)*([^\s,।!?"“”]+)/gu)) { const r = roleOfToken(m[2]); if (r && !STOP.has(m[1])) intro.push({ name: m[1], role: r }); }
  for (const m of text.matchAll(/([^\s,।!?"“”]+)\s+(?:নাম)\s+([^\s,।!?"“”]+)/gu)) { const base = m[1].replace(/(?:টির|টার|র|ের)$/u, ""); const r = roleOfToken(base) ?? roleOfToken(m[1]); if (r && !STOP.has(m[2])) intro.push({ name: m[2], role: r }); }
  for (const m of text.matchAll(/(?:named|called)\s+([A-Za-z]+)/g)) { const before = text.slice(Math.max(0, m.index! - 30), m.index!); const r = tokens(before).reverse().map(roleOfToken).find(Boolean); if (r) intro.push({ name: m[1], role: r }); }
  const addChar = (name: string, role: Role): Char => {
    const n = (seen.get(role.key) ?? 0) + 1; seen.set(role.key, n);
    const look = n > 1 ? { ...(role.look ?? {}), top: ["#e63946", "#2a9d8f", "#f4a261", "#6a4c93", "#2b6cb0"][n % 5] } : role.look;
    const c: Char = { id: "c" + chars.length, name, role: { ...role, look } }; chars.push(c); return c;
  };
  for (const i of intro) { if (!names.has(i.name)) { const c = addChar(i.name, i.role); names.set(i.name, c.id); } }
  const byRole = (r: Role): Char => { const c = chars.find((x) => x.role.key === r.key && !intro.some((i) => i.name === x.name && false)); return c ?? addChar(r.label, r); };

  const units: Unit[] = []; let last: string | null = null, prev: string | null = null;
  const mentioned = (s: string): string[] => {
    const out: string[] = [];
    for (const t of tokens(s)) { const raw = variants(t);
      if (raw.some((v) => GROUP.includes(v))) { for (const c of chars.filter((x) => x.role.voice !== "animal").slice(0, 4)) if (!out.includes(c.id)) out.push(c.id); continue; } const nm = [...names.keys()].find((n) => raw.includes(n.toLowerCase())); if (nm) { const id = names.get(nm)!; if (!out.includes(id)) out.push(id); continue; }
      if (STOP.has(t)) continue; const r = roleOfToken(t); if (r) { const c = byRole(r); if (!out.includes(c.id)) out.push(c.id); } }
    return out;
  };
  const segs = segments(text);
  segs.forEach((seg, si) => {
    if (seg.quote) {
      // বক্তা-নির্দেশক বাক্য: কমা/কোলনে শেষ হলে পরের উদ্ধৃতির, "।" ইত্যাদিতে শেষ হলে আগের উদ্ধৃতির
      const prevT = segs[si - 1] && !segs[si - 1].quote ? segs[si - 1].text : "", nextT = segs[si + 1] && !segs[si + 1].quote ? segs[si + 1].text : "";
      const lastFrag = (prevT.split(/[।.!?]/).pop() ?? "").trim();
      const prevOwns = /[,:]\s*$/.test(prevT.trim()) && lastFrag.length > 0;
      const nextOwns = !(/[,:]\s*$/.test(nextT.trim()) && !/[।.!?]/.test(nextT));
      const cands: string[] = []; if (prevOwns) cands.push(lastFrag); if (nextOwns) cands.push(nextT.split(/[।.!?]/)[0]); if (!prevOwns) cands.push(lastFrag);
      let who: string | null = null;
      for (const ctx of cands) { if (hasStem(norm(ctx), SPEECH) || wordsIn(norm(ctx).toLowerCase(), SPEECH)) { const vi = SPEECH.map((w) => norm(ctx).indexOf(w)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? ctx.length;
        const before = mentioned(norm(ctx).slice(0, vi)); const ids = before.length ? [before[before.length - 1]] : mentioned(ctx); if (ids.length) { who = ids[0]; break; } if (ctx === lastFrag && last) { who = last; break; } } }
      if (!who) { const others = chars.map((c) => c.id).filter((i) => i !== last); who = others.length ? (prev && prev !== last && others.includes(prev) ? prev : others[0]) : last; }
      if (!who) who = byRole(ROLE_WORDS.find((r) => r[1].key === "boy")![1]).id;
      prev = last; last = who;
      const sfx = SFX_WORDS.find(([ws]) => wordsIn(seg.text, ws))?.[1];
      units.push({ kind: "say", who, text: seg.text.replace(/[\s,;:]+$/u, ""), sfx });
      return;
    }
    for (const s of sentences(seg.text)) {
      const ids = mentioned(s);
      const skip = ids.length === 0 && !bgOf(s) && !actionOf(s) && tokens(s).length < 3;
      if (skip) continue;
      // শুধু বক্তা-নির্দেশক বাক্য ("... বলল টুকাই।") — আলাদা দৃশ্য নয়
      if (hasStem(s, SPEECH) && !actionOf(s.replace(/বল[^\s]*|জিজ্ঞ[^\s]*|চেঁচ[^\s]*/gu, "")) && !bgOf(s) && segs[si - 1]?.quote && s.length < 40) { if (ids[0]) { prev = last; last = ids[0]; } continue; }
      if (segs[si + 1]?.quote && /[,:]\s*$/.test(seg.text.trim()) && s === sentences(seg.text).pop() && (hasStem(s, SPEECH) || wordsIn(norm(s).toLowerCase(), SPEECH) || hasStem(s, ["ভাবল", "ভাবলেন"]))) { if (ids[0]) { prev = last; last = ids[0]; } continue; }
      const ride = rideOf(s); const act = ride ? "walk" : actionOf(s);
      if (ids.length) { prev = last; last = ids[0]; }
      const chs = ids.length ? ids : last ? [last] : [];
      units.push({ kind: "narr", text: s, chars: chs, action: (act ?? undefined) as Action | undefined, ride: ride ?? undefined, walk: act === "walk" || !!ride, bg: bgOf(s) ?? undefined, sfx: SFX_WORDS.find(([ws]) => wordsIn(s, ws))?.[1], mood: hasStem(s, SAD) ? "calm" : hasStem(s, ADV) ? "adventure" : undefined });
    }
  });
  if (!units.length) throw new Error("গল্পে কোনো বাক্য বা চরিত্র পাওয়া যায়নি। অন্তত কয়েকটি বাক্য লিখুন।");
  if (!chars.length) { addChar("ছেলে", ROLE_WORDS.find((r) => r[1].key === "boy")![1]); notes.push("গল্পে চরিত্র চেনা যায়নি; একটি ছেলে বসানো হয়েছে। 'ছেলে/মেয়ে/বৃদ্ধ…' এর মতো শব্দ লিখলে সঠিক চরিত্র আসবে।"); }
  for (const u of units) if (u.kind === "narr" && u.chars.length === 0) u.chars = [chars[0].id];

  // ২) দৃশ্যে ভাগ — পটভূমি বদলালে, বা ~৩০ সেকেন্ড হলে
  const first = units.map((u) => (u.kind === "narr" ? u.bg : undefined)).find(Boolean) ?? bgOf(text) ?? "bg_village";
  const scenes: PlanScene[] = []; let cur: PlanScene = { bg: first, units: [] }; let len = 0;
  for (const u of units) {
    const est = u.kind === "say" ? Math.max(1.8, u.text.length * 0.09) : Math.max(2.2, u.text.length * 0.07);
    const nb = u.kind === "narr" ? u.bg : undefined;
    if (cur.units.length && ((nb && nb !== cur.bg) || len + est > 30)) { scenes.push(cur); cur = { bg: nb ?? cur.bg, units: [] }; len = 0; }
    if (nb && !cur.units.length) cur.bg = nb;
    cur.units.push(u); len += est;
  }
  if (cur.units.length) scenes.push(cur);
  const all = units.map((u) => (u.kind === "narr" ? u.mood : undefined));
  const nCalm = all.filter((x) => x === "calm").length, nAdv = all.filter((x) => x === "adventure").length;
  const mood: StoryPlan["mood"] = nCalm >= 2 && nCalm >= nAdv ? "calm" : nAdv >= 2 ? "adventure" : "happy";
  if (!/[ঀ-৿]/.test(text) && !/[a-z]/i.test(text)) notes.push("এই ভাষা এখনো বোঝা যায় না — শুধু বাংলা ও ইংরেজি।");
  return { chars, scenes, mood, notes, units: units.length };
}
