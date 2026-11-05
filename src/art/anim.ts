// মানুষের অ্যানিমেশন তালিকা (প্যানেল ও সার্চের জন্য) + পাঁচটি ভিউ
import type { Action, View } from "./shapes";

export type AnimCat = "basic" | "gesture" | "emotion" | "work";
export type AnimDef = { id: Exclude<Action, "auto" | "fly">; bn: string; en: string; cat: AnimCat; kw: string[] };
export const ANIM_CATS: { id: AnimCat | "all"; bn: string }[] = [
  { id: "all", bn: "সব" }, { id: "basic", bn: "মৌলিক" }, { id: "gesture", bn: "অঙ্গভঙ্গি" }, { id: "emotion", bn: "আবেগ" }, { id: "work", bn: "কাজ" },
];
export const ANIMS: AnimDef[] = [
  { id: "stand", bn: "দাঁড়ানো", en: "Idle", cat: "basic", kw: ["অপেক্ষা", "স্থির", "wait", "stand"] },
  { id: "walk", bn: "হাঁটা", en: "Walk", cat: "basic", kw: ["চলা", "walking"] },
  { id: "run", bn: "দৌড়", en: "Run", cat: "basic", kw: ["দৌড়ানো", "running"] },
  { id: "jump", bn: "লাফ", en: "Jump", cat: "basic", kw: ["লাফানো", "jumping"] },
  { id: "sit", bn: "বসা", en: "Sitting", cat: "basic", kw: ["বসে", "sit"] },
  { id: "sleep", bn: "ঘুমানো", en: "Sleeping", cat: "basic", kw: ["ঘুম", "শোয়া", "sleep"] },
  { id: "dance", bn: "নাচ", en: "Dance", cat: "basic", kw: ["নাচা", "dancing"] },
  { id: "talk", bn: "কথা বলা", en: "Talking", cat: "gesture", kw: ["বলা", "সংলাপ", "speak", "lip sync"] },
  { id: "wave", bn: "হাত নাড়া", en: "Waving", cat: "gesture", kw: ["হ্যালো", "বিদায়", "hello", "bye"] },
  { id: "clap", bn: "হাততালি", en: "Clapping", cat: "gesture", kw: ["তালি", "applause"] },
  { id: "salute", bn: "স্যালুট", en: "Salute", cat: "gesture", kw: ["সালাম", "সেনা"] },
  { id: "point", bn: "আঙুল দেখানো", en: "Pointing", cat: "gesture", kw: ["দেখানো", "ইশারা"] },
  { id: "thumbsup", bn: "দারুণ!", en: "Thumbs Up", cat: "gesture", kw: ["ভালো", "লাইক", "good", "like"] },
  { id: "namaste", bn: "নমস্কার", en: "Greeting", cat: "gesture", kw: ["সালাম", "namaste", "welcome"] },
  { id: "bow", bn: "মাথা নত", en: "Bowing", cat: "gesture", kw: ["প্রণাম", "কুর্নিশ"] },
  { id: "shrug", bn: "জানি না", en: "Shrug", cat: "gesture", kw: ["কাঁধ ঝাঁকানো", "dont know"] },
  { id: "cheer", bn: "উল্লাস", en: "Cheering", cat: "gesture", kw: ["জয়", "আনন্দ", "hooray"] },
  { id: "angry", bn: "রাগ", en: "Angry", cat: "emotion", kw: ["রেগে", "ক্রোধ"] },
  { id: "laugh", bn: "হাসি", en: "Laughing", cat: "emotion", kw: ["হাসা", "মজা", "funny"] },
  { id: "cry", bn: "কান্না", en: "Crying", cat: "emotion", kw: ["কাঁদা", "দুঃখ", "sad"] },
  { id: "scared", bn: "ভয়", en: "Scared", cat: "emotion", kw: ["ভয় পাওয়া", "afraid"] },
  { id: "think", bn: "ভাবা", en: "Thinking", cat: "emotion", kw: ["চিন্তা", "ভাবনা"] },
  { id: "cook", bn: "রান্না", en: "Cooking", cat: "work", kw: ["রাঁধা", "chef", "kitchen"] },
  { id: "teach", bn: "পড়ানো", en: "Teaching", cat: "work", kw: ["শিক্ষা", "ক্লাস", "teacher", "board"] },
  { id: "carry", bn: "বহন", en: "Carrying", cat: "work", kw: ["বাক্স", "তোলা", "box", "lift"] },
  { id: "read", bn: "পড়া", en: "Reading", cat: "work", kw: ["বই", "book"] },
  { id: "write", bn: "লেখা", en: "Writing", cat: "work", kw: ["লিখছে", "খাতা"] },
  { id: "eat", bn: "খাওয়া", en: "Eating", cat: "work", kw: ["খাবার", "ভাত", "meal"] },
  { id: "drink", bn: "পানি পান", en: "Drinking", cat: "work", kw: ["পান", "জল", "water", "cup"] },
  { id: "phone", bn: "ফোনে কথা", en: "Phone Call", cat: "work", kw: ["মোবাইল", "call", "ফোন"] },
];
export const VIEWS: { id: View; bn: string; en: string }[] = [
  { id: "front", bn: "সামনে", en: "FRONT" }, { id: "q_front", bn: "৩/৪ সামনে", en: "3/4 FRONT" },
  { id: "q_back", bn: "৩/৪ পেছনে", en: "3/4 BACK" }, { id: "back", bn: "পেছন", en: "BACK" }, { id: "side", bn: "পাশ", en: "SIDE" },
];
export const animName = (id: string) => ANIMS.find((a) => a.id === id)?.bn ?? id;

export function searchAnims(q: string, cat: AnimCat | "all" = "all"): AnimDef[] {
  const s = q.trim().toLowerCase();
  return ANIMS.filter((a) => (cat === "all" || a.cat === cat) && (!s || a.bn.includes(s) || a.en.toLowerCase().includes(s) || a.id.includes(s) || a.kw.some((k) => k.toLowerCase().includes(s))));
}
