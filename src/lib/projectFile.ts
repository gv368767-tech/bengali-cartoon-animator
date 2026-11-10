// প্রজেক্ট আদান-প্রদানের ফাইল (.bcsproj) — Android ও Windows একই ফরম্যাট। শুধু স্থানীয় ফাইল, কোনো সার্ভার নেই।
import type { Movie } from "./scene";
export const PROJ_EXT = "bcsproj";
export function packProject(m: Movie): string { return JSON.stringify({ format: "bcsproj", v: 1, app: "bengali-cartoon-studio", movie: m }); }
export function unpackProject(txt: string): Movie {
  const o = JSON.parse(txt);
  const m = (o && o.format === "bcsproj" ? o.movie : o) as Movie;
  if (!m || m.kind !== "movie" || !Array.isArray(m.scenes) || !m.scenes.length) throw new Error("এটি বৈধ প্রজেক্ট ফাইল নয়");
  return m;
}
