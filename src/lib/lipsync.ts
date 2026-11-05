// বাংলা (ও ইংরেজি) লেখা থেকে ঠোঁটের আকৃতি — কোনো অনলাইন সেবা ছাড়া, অক্ষর দেখে।
import type { Mouth } from "../art/shapes";

type Tok = { m: Mouth; w: number };
const IND: Record<string, Mouth["shape"]> = { "অ": "O", "আ": "A", "ই": "E", "ঈ": "E", "উ": "U", "ঊ": "U", "ঋ": "E", "এ": "E", "ঐ": "E", "ও": "O", "ঔ": "O" };
const SIGN: Record<string, Mouth["shape"]> = { "া": "A", "ি": "E", "ী": "E", "ু": "U", "ূ": "U", "ৃ": "E", "ে": "E", "ৈ": "E", "ো": "O", "ৌ": "O" };
const LAB = new Set(["প", "ফ", "ব", "ভ", "ম", "p", "b", "m", "f", "v", "w"]);
const LAT: Record<string, Mouth["shape"]> = { a: "A", e: "E", i: "E", o: "O", u: "U" };
const isBnCons = (c: string) => c >= "ক" && c <= "হ" || c === "ড়" || c === "ঢ়" || c === "য়";

export function tokenize(text: string): Tok[] {
  const ch = Array.from(text.normalize("NFC"));
  const out: Tok[] = [];
  for (let i = 0; i < ch.length; i++) {
    const c = ch[i], n = ch[i + 1];
    if (IND[c]) out.push({ m: { shape: IND[c], open: 1 }, w: 1.1 });
    else if (SIGN[c]) out.push({ m: { shape: SIGN[c], open: 1 }, w: 1.1 });
    else if (isBnCons(c)) {
      out.push({ m: LAB.has(c) ? { shape: "M", open: 0 } : { shape: "C", open: 0.35 }, w: 0.5 });
      if (!n || (!(n in SIGN) && n !== "্" && !isBnCons(n) && n !== "ং" && n !== "ঁ" && n !== "ঃ")) out.push({ m: { shape: "O", open: 0.7 }, w: 0.8 });
      else if (isBnCons(n)) out.push({ m: { shape: "O", open: 0.6 }, w: 0.7 });
    } else if (c === "ং" || c === "ঁ" || c === "ঃ") out.push({ m: { shape: "U", open: 0.4 }, w: 0.5 });
    else if (c === "্" || c === "়") continue;
    else if (/\s/.test(c) || /[.,!?;:।\-"'()]/.test(c)) out.push({ m: { shape: "M", open: 0 }, w: /[.,!?;:।]/.test(c) ? 1.2 : 0.6 });
    else if (/[a-z]/i.test(c)) { const l = c.toLowerCase(); out.push(LAT[l] ? { m: { shape: LAT[l], open: 1 }, w: 1 } : LAB.has(l) ? { m: { shape: "M", open: 0 }, w: 0.5 } : { m: { shape: "C", open: 0.35 }, w: 0.5 }); }
  }
  return out;
}

const cache = new Map<string, { toks: Tok[]; total: number }>();
function prep(text: string) {
  let c = cache.get(text);
  if (!c) { const toks = tokenize(text); c = { toks, total: toks.reduce((a, t) => a + t.w, 0) || 1 }; if (cache.size > 60) cache.clear(); cache.set(text, c); }
  return c;
}
/** localT: সংলাপ শুরুর পর কত সেকেন্ড; dur: সংলাপের দৈর্ঘ্য */
export function mouthAt(text: string, localT: number, dur: number): Mouth | null {
  if (localT < 0 || localT > dur || !text.trim()) return null;
  const { toks, total } = prep(text);
  const pos = (localT / dur) * total;
  let acc = 0;
  for (const tk of toks) {
    if (pos <= acc + tk.w) {
      const u = (pos - acc) / tk.w;
      const env = tk.m.open === 0 ? 0 : tk.m.open * (0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, Math.max(0, u))));
      return { shape: tk.m.shape, open: env };
    }
    acc += tk.w;
  }
  return { shape: "M", open: 0 };
}
