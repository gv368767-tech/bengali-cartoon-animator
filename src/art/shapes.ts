// সব ছবি এই সরল আকারের তালিকা (Shape list) দিয়ে আঁকা — অফলাইন, কোনো ছবির ফাইল লাগে না।
export type Shape =
  | { t: "rect"; x: number; y: number; w: number; h: number; r?: number; fill: string; op?: number }
  | { t: "circle"; x: number; y: number; r: number; fill?: string; stroke?: string; sw?: number; op?: number }
  | { t: "ellipse"; x: number; y: number; rx: number; ry: number; fill: string; op?: number }
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; w: number; color: string; op?: number }
  | { t: "path"; d: string; fill?: string; stroke?: string; sw?: number; op?: number }
  | { t: "poly"; pts: number[]; fill: string; op?: number }
  | { t: "grad"; x: number; y: number; w: number; h: number; c1: string; c2: string };

export type Action = "auto" | "stand" | "walk" | "run" | "jump" | "sit" | "dance" | "wave" | "fly";
export type Pose = { action: Exclude<Action, "auto">; phase: number; talk: number; blink: boolean };

export const R = (x: number, y: number, w: number, h: number, fill: string, r = 0, op?: number): Shape => ({ t: "rect", x, y, w, h, r, fill, op });
export const C = (x: number, y: number, r: number, fill: string, op?: number): Shape => ({ t: "circle", x, y, r, fill, op });
export const CS = (x: number, y: number, r: number, stroke: string, sw: number): Shape => ({ t: "circle", x, y, r, stroke, sw });
export const E = (x: number, y: number, rx: number, ry: number, fill: string, op?: number): Shape => ({ t: "ellipse", x, y, rx, ry, fill, op });
export const L = (x1: number, y1: number, x2: number, y2: number, w: number, color: string, op?: number): Shape => ({ t: "line", x1, y1, x2, y2, w, color, op });
export const PA = (d: string, fill?: string, stroke?: string, sw = 3, op?: number): Shape => ({ t: "path", d, fill, stroke, sw, op });
export const PO = (pts: number[], fill: string, op?: number): Shape => ({ t: "poly", pts, fill, op });
export const G = (x: number, y: number, w: number, h: number, c1: string, c2: string): Shape => ({ t: "grad", x, y, w, h, c1, c2 });

export const DARK = "#2b2b33";
export const sin = Math.sin, cos = Math.cos, abs = Math.abs, PI = Math.PI;
export const f = (n: number) => Math.round(n * 10) / 10;

export function wheel(x: number, y: number, r: number, phase: number, tire = "#2b2b33", rim = "#c9ced6"): Shape[] {
  const s: Shape[] = [C(x, y, r, tire), C(x, y, r * 0.62, rim)];
  for (let i = 0; i < 3; i++) {
    const a = phase + (i * PI) / 3;
    s.push(L(x - cos(a) * r * 0.6, y - sin(a) * r * 0.6, x + cos(a) * r * 0.6, y + sin(a) * r * 0.6, Math.max(2, r * 0.07), "#7b8190"));
  }
  s.push(C(x, y, r * 0.14, "#555b69"));
  return s;
}
