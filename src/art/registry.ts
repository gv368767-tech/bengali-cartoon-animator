import { Action, Pose, Shape } from "./shapes";
import { HUMANS, humanShapes } from "./human";
import { ANIMALS, quadShapes } from "./animal";
import { BIRDS, birdShapes } from "./bird";
import * as P from "./props";
import { ANIMS } from "./anim";
import { DEITY_LIST } from "./deity";
import { BACKGROUNDS } from "./backgrounds";

export type Cat = "bg" | "nature" | "human" | "animal" | "bird" | "object" | "hindu";
export type AssetDef = {
  id: string; name: string; cat: Cat;
  layer: "back" | "ground";           // back = সূর্য/মেঘ/পাহাড় (গভীরতা-স্কেল নেই)
  scale: number; defaultY: number;
  actions: Action[]; defaultAction: Exclude<Action, "auto">;
  shadow: number;                      // ছায়ার প্রস্থ (0 = নেই)
  side: boolean;                       // পাশ-মুখী (চলার দিকে ঘুরবে)
  talk: boolean;
  rig?: "human";                       // মানুষের হাড়-রিগ (সব অ্যানিমেশন/ভিউ/লিপ-সিঙ্ক)
  bounds: [number, number, number, number];
  build: (p: Pose) => Shape[];
};

const HA: Action[] = ANIMS.map((a) => a.id);
const human = (id: string, name: string, scale: number, top: number): AssetDef => ({
  id, name, cat: "human", layer: "ground", scale, defaultY: 600, actions: HA, defaultAction: "stand", shadow: 50, side: false, talk: true, rig: "human",
  bounds: [-80, top, 80, 8], build: (p) => humanShapes(HUMANS[id], p),
});
const animal = (id: string, name: string, scale: number): AssetDef => {
  const d = ANIMALS[id];
  return { id, name, cat: "animal", layer: "ground", scale, defaultY: 600, actions: ["stand", "walk", "run", "jump", "sit"], defaultAction: "stand", shadow: d.bodyRx * 1.05, side: true, talk: true,
    bounds: [-d.bodyRx - 60, d.hy - d.hr * 1.8, d.hx + d.hr * 2, 8], build: (p) => quadShapes(d, p) };
};
const bird = (id: string, name: string, scale: number): AssetDef => {
  const d = BIRDS[id];
  return { id, name, cat: "bird", layer: "ground", scale, defaultY: 300, actions: ["fly", "stand", "walk", "run"], defaultAction: "fly", shadow: 0, side: true, talk: true,
    bounds: [-100 * d.size, -140 * d.size, 60 * d.size, 8], build: (p) => birdShapes(d, p) };
};
const deity = (id: string, name: string, scale: number): AssetDef => ({
  id, name, cat: "hindu", layer: "ground", scale, defaultY: 600, actions: HA, defaultAction: "stand", shadow: 55, side: false, talk: true, rig: "human",
  bounds: [-120, -380, 120, 8], build: (p) => humanShapes(HUMANS[id], p),
});
const vahanaQ = (id: string, name: string, scale: number): AssetDef => ({ ...animal(id, name, scale), cat: "hindu" });
const vahanaB = (id: string, name: string, scale: number, def: "fly" | "stand" = "stand"): AssetDef => ({ ...bird(id, name, scale), cat: "hindu", defaultAction: def, defaultY: def === "fly" ? 300 : 600, shadow: def === "fly" ? 0 : 60 });
const prop = (id: string, name: string, cat: Cat, b: [number, number, number, number], build: (p: Pose) => Shape[], o: Partial<AssetDef> = {}): AssetDef => ({
  id, name, cat, layer: "ground", scale: 1, defaultY: 600, actions: ["stand"], defaultAction: "stand", shadow: 0, side: false, talk: false, bounds: b, build, ...o,
});

export const ASSETS: AssetDef[] = [
  // প্রকৃতি
  prop("tree", "গাছ", "nature", [-130, -320, 130, 8], P.tree, { shadow: 60, scale: 0.9 }),
  prop("flower", "ফুল", "nature", [-40, -125, 40, 8], P.flower, { scale: 0.9 }),
  prop("grass", "ঘাস", "nature", [-60, -70, 60, 8], P.grass),
  prop("mountain", "পাহাড়", "nature", [-240, -260, 270, 8], P.mountain, { layer: "back", scale: 1.3, defaultY: 430 }),
  prop("sun", "সূর্য", "nature", [-100, -100, 100, 100], P.sun, { layer: "back", scale: 0.9, defaultY: 110 }),
  prop("cloud", "মেঘ", "nature", [-120, -80, 120, 40], P.cloud, { layer: "back", scale: 1, defaultY: 100 }),
  // মানুষ
  human("boy", "ছেলে", 1, -320), human("girl", "মেয়ে", 1, -320), human("kid", "শিশু", 0.9, -350), human("man", "পুরুষ", 1.1, -320),
  human("woman", "মহিলা", 1.05, -330), human("elder", "বৃদ্ধ", 1.05, -320), human("farmer", "কৃষক", 1.1, -350), human("teacher", "শিক্ষক", 1.1, -320),
  // প্রাণী
  animal("cow", "গরু", 0.9), animal("goat", "ছাগল", 1), animal("dog", "কুকুর", 1), animal("cat", "বিড়াল", 1), animal("elephant", "হাতি", 0.85), animal("horse", "ঘোড়া", 0.95), animal("monkey", "বানর", 1),
  // পাখি
  bird("crow", "কাক", 1), bird("parrot", "টিয়া", 1), bird("pigeon", "কবুতর", 1), bird("duck", "হাঁস", 1), bird("hen", "মুরগি", 1),
  // হিন্দু দেবদেবী (শ্রদ্ধাপূর্ণ কার্টুন) ও তাঁদের বাহন
  ...DEITY_LIST.map((d) => deity(d.id, d.name, d.scale)),
  vahanaQ("lion", "সিংহ (দুর্গার বাহন)", 1), vahanaQ("mouse", "ইঁদুর (গণেশের বাহন)", 1.4), vahanaQ("bull", "নন্দী (শিবের বাহন)", 0.95),
  vahanaB("owl", "পেঁচা (লক্ষ্মীর বাহন)", 1.2), vahanaB("peacock", "ময়ূর (কার্তিকের বাহন)", 1.2), vahanaB("swan", "রাজহংস (সরস্বতীর বাহন)", 1.2), vahanaB("garuda", "গরুড় (বিষ্ণুর বাহন)", 1.1, "fly"),
  // বস্তু
  prop("car", "গাড়ি", "object", [-120, -125, 125, 8], P.car, { actions: ["stand", "walk"], shadow: 110, side: true, scale: 1 }),
  prop("bus", "বাস", "object", [-155, -135, 155, 8], P.bus, { actions: ["stand", "walk"], shadow: 150, side: true, scale: 0.95 }),
  prop("rickshaw", "রিকশা", "object", [-115, -175, 110, 8], P.rickshaw, { actions: ["stand", "walk"], shadow: 105, side: true }),
  prop("bicycle", "সাইকেল", "object", [-110, -115, 110, 8], P.bicycle, { actions: ["stand", "walk"], shadow: 95, side: true }),
  prop("boat", "নৌকা", "object", [-130, -120, 150, 20], P.boat, { actions: ["stand", "walk"], shadow: 0, side: true, scale: 1.1 }),
  prop("table", "টেবিল", "object", [-85, -120, 85, 8], P.table, { shadow: 80 }),
  prop("chair", "চেয়ার", "object", [-40, -138, 40, 8], P.chair, { shadow: 40 }),
  prop("bed", "খাট", "object", [-125, -115, 125, 8], P.bed, { shadow: 115 }),
  prop("sofa", "সোফা", "object", [-135, -115, 135, 8], P.sofa, { shadow: 120 }),
  prop("almirah", "আলমারি", "object", [-65, -200, 65, 8], P.almirah, { shadow: 55 }),
  prop("ball", "বল", "object", [-35, -90, 35, 8], P.ball, { actions: ["stand", "walk", "jump"], shadow: 28, scale: 1 }),
  prop("kite", "ঘুড়ি", "object", [-45, -190, 45, 10], P.kite, { layer: "back", defaultY: 300 }),
  prop("doll", "পুতুল", "object", [-35, -125, 35, 8], P.doll, { shadow: 22, actions: ["stand", "dance"], scale: 1.1 }),
  prop("train", "খেলনা ট্রেন", "object", [-135, -115, 135, 8], P.toyTrain, { actions: ["stand", "walk"], shadow: 120, side: true }),
  prop("lattu", "লাটিম", "object", [-35, -100, 35, 8], P.lattu, { actions: ["stand", "dance"], shadow: 22, scale: 1.2 }),
  prop("umbrella", "ছাতা", "object", [-95, -215, 95, 8], P.umbrella, { shadow: 0 }),
];

export const BG_ASSETS = BACKGROUNDS;
export const getAsset = (id: string) => ASSETS.find((a) => a.id === id);
export const getBg = (id: string) => BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
export const TOTAL_ASSETS = ASSETS.length + BACKGROUNDS.length;
export const CATS: { id: Cat; name: string }[] = [
  { id: "bg", name: "ব্যাকগ্রাউন্ড" }, { id: "human", name: "মানুষ" }, { id: "animal", name: "প্রাণী" },
  { id: "bird", name: "পাখি" }, { id: "nature", name: "প্রকৃতি" }, { id: "object", name: "বস্তু" }, { id: "hindu", name: "হিন্দু দেবদেবী" },
];
