import { requireNativeModule } from "expo";

export type StudioExportNative = {
  begin(config: string): Promise<string>;
  setBackground(key: string, shapesJson: string): Promise<void>;
  drawFrames(framesJson: string): Promise<void>;
  finish(): Promise<string>;
  cancel(): Promise<void>;
  saveToGallery(path: string, displayName: string): Promise<string>;
};

let native: StudioExportNative | null = null;
try { native = requireNativeModule("StudioExport") as StudioExportNative; } catch { native = null; }
export default native; // Expo Go-তে null; আসল APK-তে কাজ করে
