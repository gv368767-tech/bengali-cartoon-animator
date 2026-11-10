// Windows ইন্টারফেসের স্বয়ংক্রিয় পরীক্ষা: সব ১৩ নতুন চরিত্র × সব অ্যানিমেশন আঁকা হয় কিনা, ত্রুটি নেই কিনা
import { chromium } from "playwright"; import { pathToFileURL } from "node:url"; import path from "node:path";
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] }); const p = await b.newPage({ viewport: { width: 1360, height: 860 } });
const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto(pathToFileURL(path.resolve("index.html")).href); await p.waitForTimeout(1500);
const r = await p.evaluate(async () => {
  const st = window.__studio, out = { chars: 0, frames: 0, bad: [] };
  const ids = st.ASSETS.filter((a) => a.cat === "style2" || a.cat === "human" || a.cat === "hindu").map((a) => a.id);
  for (const id of ids) { st.addAsset(id); const a = st.ASSETS.find((x) => x.id === id); out.chars++;
    for (const act of a.actions) { const sc = st.movie.scenes[0]; const o = sc.objects[sc.objects.length - 1]; st.movie.scenes[0].objects[sc.objects.length - 1] = st.S.setAction(o, 0, act); st.setT(0.7); out.frames++; } }
  await new Promise((r) => setTimeout(r, 800)); st.setT(1.0);
  const c = document.getElementById("stage").getContext("2d").getImageData(0, 0, 1280, 720).data; let nz = 0; for (let i = 3; i < c.length; i += 4) if (c[i] > 0) nz++;
  out.painted = nz; return out; });
console.log(JSON.stringify(r)); await p.screenshot({ path: "smoke.png" }); await b.close();
if (errs.length) { console.error("ত্রুটি:", errs.slice(0, 5)); process.exit(1); }
if (r.chars < 20 || r.frames < 100 || r.painted < 100000) { console.error("পরীক্ষা ব্যর্থ"); process.exit(1); }
console.log("✅ Windows UI পরীক্ষা পাস");
