// অ্যাটলাস ছবি একবার লোড করে মনে রাখে (অফলাইন, অ্যাপের ভেতরের ফাইল থেকে)
import { Skia, SkImage } from "@shopify/react-native-skia";
import { Image } from "react-native";
import { ATLAS } from "./sprites/images";

const cache = new Map<string, SkImage>(), pending = new Set<string>(), subs = new Set<() => void>();
export const onSpriteLoaded = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
export function atlasImage(k: string): SkImage | null {
  const hit = cache.get(k); if (hit) return hit;
  if (!pending.has(k) && ATLAS[k] != null) {
    pending.add(k);
    const uri = Image.resolveAssetSource(ATLAS[k]).uri;
    Skia.Data.fromURI(uri).then((d) => { const im = Skia.Image.MakeImageFromEncoded(d); if (im) cache.set(k, im); subs.forEach((f) => f()); }).catch(() => { pending.delete(k); });
  }
  return null;
}
