// নিজের ছবি থেকে চরিত্র: ছবি বেছে নিলে (স্বচ্ছ PNG) অ্যাপ ফাঁক দেখে একাধিক চরিত্র আলাদা করে ফোনের ভেতরে রাখে।
import * as FileSystem from "expo-file-system";
import { AlphaType, ColorType, ImageFormat, Skia } from "@shopify/react-native-skia";
import { ASSETS, photoAssetOf } from "../art/registry";
import { PhotoDef } from "../art/photoChar";
import { setUserCharDir, userCharKey, userCharPath } from "../art/userPaths";
import { Box, splitPersons, transparentFraction } from "./photoSplit";

type Rec = { id: string; name: string; w: number; h: number };
const dirOf = () => (FileSystem.documentDirectory ?? "") + "userchars/";
const idxPath = () => dirOf() + "index.json";
let recs: Rec[] = [];
const toDef = (r: Rec): PhotoDef => ({ id: r.id, name: r.name, key: userCharKey(r.id), w: r.w, h: r.h });
const register = (r: Rec) => { const a = photoAssetOf(toDef(r), "photo"); const i = ASSETS.findIndex((x) => x.id === a.id); if (i >= 0) ASSETS[i] = a; else ASSETS.push(a); };

export async function loadUserChars(): Promise<number> {
  setUserCharDir(dirOf());
  try { const i = await FileSystem.getInfoAsync(idxPath()); if (!i.exists) return 0; recs = JSON.parse(await FileSystem.readAsStringAsync(idxPath())); recs.forEach(register); return recs.length; } catch { return 0; }
}
const save = async () => { await FileSystem.writeAsStringAsync(idxPath(), JSON.stringify(recs)); };

/** ছবি আমদানি: যত জন আলাদা চরিত্র পাওয়া যায় তত জনকে লাইব্রেরিতে যোগ করে */
export async function importCharacterImage(uri: string, baseName: string): Promise<{ added: Rec[]; notes: string[] }> {
  setUserCharDir(dirOf()); const di = await FileSystem.getInfoAsync(dirOf()); if (!di.exists) await FileSystem.makeDirectoryAsync(dirOf(), { intermediates: true });
  const data = await Skia.Data.fromURI(uri); let img = Skia.Image.MakeImageFromEncoded(data);
  if (!img) throw new Error("ছবিটি পড়া যায়নি। PNG বা JPG ছবি দিন।");
  const notes: string[] = [];
  // বড় ছবি ছোট করে নেওয়া (মেমরি বাঁচাতে)
  const MAXD = 2000; if (Math.max(img.width(), img.height()) > MAXD) { const k = MAXD / Math.max(img.width(), img.height()), W = Math.round(img.width() * k), H = Math.round(img.height() * k); const s = Skia.Surface.MakeOffscreen(W, H)!; s.getCanvas().scale(k, k); s.getCanvas().drawImage(img, 0, 0); s.flush(); img = s.makeImageSnapshot(); }
  const W = img.width(), H = img.height();
  const px = img.readPixels(0, 0, { width: W, height: H, colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul }) as Uint8Array | null;
  if (!px) throw new Error("ছবির পিক্সেল পড়া যায়নি।");
  const alpha = new Uint8Array(W * H); for (let i = 0; i < alpha.length; i++) alpha[i] = px[i * 4 + 3];
  if (transparentFraction(alpha) < 0.02) throw new Error("ছবির ব্যাকগ্রাউন্ড স্বচ্ছ (transparent) নয়। ব্যাকগ্রাউন্ড-ছাড়া PNG ছবি দিন — চরিত্র কেটে নেওয়া যায় না, আমি এটা নিজে বানাতে পারি না।");
  let boxes: Box[] = splitPersons(alpha, W, H);
  if (!boxes.length) throw new Error("ছবিতে কোনো চরিত্র পাওয়া যায়নি।");
  if (boxes.length > 1) notes.push(`ছবিতে ${boxes.length}টি আলাদা চরিত্র পাওয়া গেছে`);
  const added: Rec[] = [];
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i], k = Math.min(1, 700 / b.h), cw = Math.max(1, Math.round(b.w * k)), ch = Math.max(1, Math.round(b.h * k));
    const s = Skia.Surface.MakeOffscreen(cw, ch)!; const cv = s.getCanvas(); cv.scale(k, k); cv.drawImage(img, -b.x, -b.y); s.flush();
    const b64 = s.makeImageSnapshot().encodeToBase64(ImageFormat.PNG, 100);
    const id = "u_" + Date.now().toString(36) + i; await FileSystem.writeAsStringAsync(userCharPath(id), b64, { encoding: FileSystem.EncodingType.Base64 });
    const r: Rec = { id, name: boxes.length > 1 ? `${baseName} ${i + 1}` : baseName, w: cw, h: ch }; recs.push(r); register(r); added.push(r);
  }
  await save(); return { added, notes };
}
export async function deleteUserChar(id: string): Promise<void> {
  recs = recs.filter((r) => r.id !== id); await save(); try { await FileSystem.deleteAsync(userCharPath(id), { idempotent: true }); } catch { /* */ }
  const i = ASSETS.findIndex((a) => a.id === id); if (i >= 0) ASSETS.splice(i, 1);
}
export const userCharList = () => recs.slice();
