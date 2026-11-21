// সব পটভূমি: আগের ৮টি (backgrounds1) + নতুন (backgrounds2…)
import { BASE_BACKGROUNDS } from "./backgrounds1";
import { BACKGROUNDS2 } from "./backgrounds2";
export type { BgDef } from "./backgrounds1";
export { BG_W, BG_H } from "./backgrounds1";
export const BACKGROUNDS = [...BASE_BACKGROUNDS, ...BACKGROUNDS2];
