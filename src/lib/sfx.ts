// অ্যাপের সাথে আসা সাউন্ড ইফেক্ট (নিজেরাই বানানো, কোনো কপিরাইট নেই)
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";

export const SFX = {
  bell: { name: "সাইকেলের ঘণ্টা", src: require("../../assets/sfx/bell.wav"), dur: 0.9 },
  surprise: { name: "অবাক", src: require("../../assets/sfx/surprise.wav"), dur: 0.7 },
  pop: { name: "পপ", src: require("../../assets/sfx/pop.wav"), dur: 0.2 },
  laugh: { name: "হাসির টুংটাং", src: require("../../assets/sfx/laugh.wav"), dur: 1.05 },
  ding: { name: "ডিং", src: require("../../assets/sfx/ding.wav"), dur: 0.8 },
} as const;
export type SfxId = keyof typeof SFX;

/** অ্যাপের ভেতরের ইফেক্টটি স্থায়ী ফোল্ডারে কপি করে uri দেয় (প্রজেক্টে ক্লিপ হিসেবে বসানোর জন্য) */
export async function sfxFile(id: SfxId): Promise<string> {
  const dir = (FileSystem.documentDirectory ?? "") + "audio/";
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = dir + "sfx_" + id + ".wav";
  if ((await FileSystem.getInfoAsync(dest)).exists) return dest;
  const a = Asset.fromModule(SFX[id].src); await a.downloadAsync();
  await FileSystem.copyAsync({ from: a.localUri ?? a.uri, to: dest });
  return dest;
}
