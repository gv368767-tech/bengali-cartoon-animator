import { requireNativeModule } from "expo";

export type NativeProgress = { task: string; p: number; msg: string };
export type StudioExportNative = {
  begin(config: string): Promise<string>;
  setBackground(key: string, shapesJson: string): Promise<void>;
  setAtlases(pathsJson: string): Promise<void>;
  drawFrames(framesJson: string): Promise<void>;
  finish(): Promise<string>;
  cancel(): Promise<void>;
  saveToGallery(path: string, displayName: string): Promise<string>;
  detectPoses(path: string, fps: number, maxFrames: number): Promise<string>;
  detectCrops(path: string, fps: number, requests: string): Promise<string>;
  buildPlate(path: string, fps: number, tracks: string, outPath: string): Promise<string>;
  cartoonizeVideo(path: string, outPath: string, opts: string): Promise<string>;
  cancelNative(): Promise<void>;
  addListener?(name: "onNativeProgress", cb: (e: NativeProgress) => void): { remove(): void };
  analyzeAudio(path: string, fps: number): Promise<{ durationMs: number; envelope: number[] }>;
  synthesizeVoice(text: string, outPath: string, rate: number, pitch: number): Promise<{ path: string; durationMs: number; envelope: number[] }>;
};

let native: StudioExportNative | null = null;
try { native = requireNativeModule("StudioExport") as StudioExportNative; } catch { native = null; }
export default native; // Expo Go-তে null; আসল APK-তে কাজ করে
