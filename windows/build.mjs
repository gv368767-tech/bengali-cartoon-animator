import { build } from "esbuild"; import { cpSync, mkdirSync, rmSync } from "node:fs";
rmSync("dist", { recursive: true, force: true }); mkdirSync("dist", { recursive: true });
await build({ entryPoints: ["src/app.ts"], bundle: true, outfile: "dist/app.js", platform: "browser", target: "chrome120", format: "iife", loader: { ".webp": "empty" }, logLevel: "warning" });
cpSync("../assets/sprites", "dist/sprites", { recursive: true });
console.log("built");
