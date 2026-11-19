import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import HomeScreen from "./src/screens/HomeScreen";
import EditorScreen from "./src/screens/EditorScreen";
import LibraryScreen from "./src/screens/LibraryScreen";
import DemoScreen from "./src/screens/DemoScreen";
import VideoCartoonScreen from "./src/screens/VideoCartoonScreen";
import * as FileSystem from "expo-file-system";
import { setVideoBgDir } from "./src/art/videoBg";

setVideoBgDir((FileSystem.documentDirectory ?? "") + "videobg/"); // ভিডিও-পটভূমির ফাইল রাখার ফোল্ডার
import type { Movie } from "./src/lib/scene";

export default function App() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [lib, setLib] = useState(false);
  const [demo, setDemo] = useState(false);
  const [vid, setVid] = useState(false);
  return (
    <>
      <StatusBar style="light" />
      {movie ? <EditorScreen key={movie.id} initial={movie} onBack={() => setMovie(null)} />
        : vid ? <VideoCartoonScreen onBack={() => setVid(false)} onOpen={(m) => { setVid(false); setMovie(m); }} />
        : demo ? <DemoScreen onBack={() => setDemo(false)} />
        : lib ? <LibraryScreen onBack={() => setLib(false)} />
        : <HomeScreen onOpen={setMovie} onLibrary={() => setLib(true)} onDemo={() => setDemo(true)} onVideo={() => setVid(true)} />}
    </>
  );
}
