import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import HomeScreen from "./src/screens/HomeScreen";
import EditorScreen from "./src/screens/EditorScreen";
import LibraryScreen from "./src/screens/LibraryScreen";
import DemoScreen from "./src/screens/DemoScreen";
import VideoCartoonScreen from "./src/screens/VideoCartoonScreen";
import StoryMakerScreen from "./src/screens/StoryMakerScreen";
import * as FileSystem from "expo-file-system";
import { setVideoBgDir } from "./src/art/videoBg";
import { loadUserChars } from "./src/lib/userChars";

setVideoBgDir((FileSystem.documentDirectory ?? "") + "videobg/"); // ভিডিও-পটভূমির ফাইল রাখার ফোল্ডার
import type { Movie } from "./src/lib/scene";

export default function App() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [lib, setLib] = useState(false);
  const [demo, setDemo] = useState(false);
  const [vid, setVid] = useState(false);
  const [story, setStory] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { loadUserChars().finally(() => setReady(true)); }, []);   // নিজের ছবির চরিত্রগুলো আগে নিবন্ধন, তারপর পর্দা
  return (
    <>
      <StatusBar style="light" />
      {!ready ? null : movie ? <EditorScreen key={movie.id} initial={movie} onBack={() => setMovie(null)} />
        : story ? <StoryMakerScreen onBack={() => setStory(false)} onOpen={(m) => { setStory(false); setMovie(m); }} />
        : vid ? <VideoCartoonScreen onBack={() => setVid(false)} onOpen={(m) => { setVid(false); setMovie(m); }} />
        : demo ? <DemoScreen onBack={() => setDemo(false)} />
        : lib ? <LibraryScreen onBack={() => setLib(false)} />
        : <HomeScreen onOpen={setMovie} onLibrary={() => setLib(true)} onDemo={() => setDemo(true)} onVideo={() => setVid(true)} onStory={() => setStory(true)} />}
    </>
  );
}
