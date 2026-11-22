import { requireNativeModule } from "expo";

export type StudioExportNative = {
  begin(config: string): Promise<string>;
  setBackground(key: string, shapesJson: string): Promise<void>;
  setAtlases(pathsJson: string): Promise<void>;
  drawFrames(framesJson: string): Promise<void>;
  finish(): Promise<string>;
  cancel(): Promise<void>;
  saveToGallery(path: string, displayName: string): Promise<string>;
  detectOpen(path: string, fps: number, maxFrames: number): Promise<string>;
  detectNext(start: number, count: number): Promise<string>;
  detectClose(): Promise<null>;
  detectCrops(path: string, fps: number, requests: string): Promise<string>;
  profile(path: string, fps: number, tracks: string): Promise<string>;
  cartoonImage(inPath: string, outPath: string, levels: number): Promise<string>;
  plateBegin(path: string, fps: number, tracks: string): Promise<string>;
  plateStep(count: number): Promise<number>;
  plateFinish(outPath: string): Promise<string>;
  plateClose(): Promise<null>;
  cartoonProbe(path: string): Promise<string>;
  cartoonFrames(path: string, start: number, count: number, fps: number, levels: number): Promise<number>;
  cartoonReset(): Promise<null>;
  analyzeAudio(path: string, fps: number): Promise<{ durationMs: number; envelope: number[] }>;
  synthesizeVoice(text: string, outPath: string, rate: number, pitch: number, variant: number): Promise<{ path: string; durationMs: number; envelope: number[] }>;
};

let native: StudioExportNative | null = null;
try { native = requireNativeModule("StudioExport") as StudioExportNative; } catch { native = null; }
export default native; // Expo Go-তে null; আসল APK-তে কাজ করে
