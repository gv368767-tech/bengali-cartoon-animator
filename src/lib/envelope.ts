// অডিও ফাইলের আওয়াজের ওঠানামা (০..১) — ঠোঁট নড়ানোর জন্য। নেটিভ কোড একবার হিসাব করে এখানে জমা রাখে।
import type { Mouth } from "../art/shapes";

export const ENV_FPS = 20;
const cache = new Map<string, number[]>();
export const setEnvelope = (uri: string, env: number[]) => { cache.set(uri, env); };
export const getEnvelope = (uri: string) => cache.get(uri);
export const hasEnvelope = (uri: string) => cache.has(uri);

/** localT সেকেন্ডে আওয়াজের মাত্রা (মসৃণ) */
export function levelAt(uri: string, localT: number): number | null {
  const env = cache.get(uri);
  if (!env || localT < 0) return null;
  const x = localT * ENV_FPS, i = Math.floor(x);
  if (i >= env.length) return null;
  const a = env[i], b = env[Math.min(env.length - 1, i + 1)];
  return a + (b - a) * (x - i);
}

const SHAPES: Mouth["shape"][] = ["A", "E", "O", "A", "U", "E"];
/** আওয়াজ থেকে মুখ: বেশি জোরে বেশি হাঁ; নীরবতায় বন্ধ। আকৃতি সময়ের সাথে ঘোরে। */
export function mouthFromLevel(level: number, localT: number): Mouth {
  if (level < 0.06) return { shape: "M", open: 0 };
  const idx = Math.floor(localT / 0.12) % SHAPES.length;
  return { shape: SHAPES[idx], open: Math.min(1, level * 1.5) };
}
