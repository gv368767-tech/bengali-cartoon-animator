// একটি স্বচ্ছ-ব্যাকগ্রাউন্ড ছবিতে একাধিক চরিত্র থাকলে স্বচ্ছ ফাঁক দেখে আলাদা করা (শুদ্ধ গণনা — টেস্ট করা যায়)
export type Box = { x: number; y: number; w: number; h: number };
export const transparentFraction = (alpha: ArrayLike<number>, thr = 10) => { let n = 0; for (let i = 0; i < alpha.length; i++) if (alpha[i] < thr) n++; return n / Math.max(1, alpha.length); };
export function splitPersons(alpha: ArrayLike<number>, w: number, h: number, thr = 20, minGap = 0.015, minW = 0.04): Box[] {
  const col = new Uint32Array(w); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha[y * w + x] > thr) col[x]++;
  const runs: [number, number][] = []; let s = -1, lastOn = -1;
  for (let x = 0; x < w; x++) {
    if (col[x] > 0) { if (s < 0) s = x; else if (x - lastOn > Math.max(2, minGap * w)) { runs.push([s, lastOn]); s = x; } lastOn = x; }
  }
  if (s >= 0) runs.push([s, lastOn]);
  const out: Box[] = [];
  for (const [x0, x1] of runs) {
    if ((x1 - x0 + 1) < minW * w) continue;
    let y0 = h, y1 = -1; for (let y = 0; y < h; y++) for (let x = x0; x <= x1; x++) if (alpha[y * w + x] > thr) { if (y < y0) y0 = y; if (y > y1) y1 = y; break; }
    if (y1 >= y0) out.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
  }
  return out;
}
