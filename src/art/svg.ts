import { Shape } from "./shapes";
let gid = 0;
const op = (o?: number) => (o === undefined ? "" : ` opacity="${o}"`);
export function shapesToSvg(shapes: Shape[]): { defs: string; body: string } {
  let defs = "", body = "";
  for (const s of shapes) {
    switch (s.t) {
      case "rect": body += `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.r ?? 0}" fill="${s.fill}"${op(s.op)}/>`; break;
      case "circle": body += `<circle cx="${s.x}" cy="${s.y}" r="${s.r}" fill="${s.fill ?? "none"}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.sw ?? 2}"` : ""}${op(s.op)}/>`; break;
      case "ellipse": body += `<ellipse cx="${s.x}" cy="${s.y}" rx="${s.rx}" ry="${s.ry}" fill="${s.fill}"${op(s.op)}/>`; break;
      case "line": body += `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${s.color}" stroke-width="${s.w}" stroke-linecap="round"${op(s.op)}/>`; break;
      case "path": body += `<path d="${s.d}" fill="${s.fill ?? "none"}"${s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.sw ?? 3}" stroke-linecap="round" stroke-linejoin="round"` : ""}${op(s.op)}/>`; break;
      case "poly": body += `<polygon points="${s.pts.join(" ")}" fill="${s.fill}"${op(s.op)}/>`; break;
      case "img": break; // ছবি-অংশ শুধু স্ক্রিন/MP4-এ
      case "grad": { const id = "g" + gid++; defs += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.c1}"/><stop offset="1" stop-color="${s.c2}"/></linearGradient>`; body += `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" fill="url(#${id})"/>`; }
    }
  }
  return { defs, body };
}
