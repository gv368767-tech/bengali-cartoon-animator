import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import HomeScreen from "./src/screens/HomeScreen";
import EditorScreen from "./src/screens/EditorScreen";
import LibraryScreen from "./src/screens/LibraryScreen";
import type { Movie } from "./src/lib/scene";

export default function App() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [lib, setLib] = useState(false);
  return (
    <>
      <StatusBar style="light" />
      {movie ? <EditorScreen key={movie.id} initial={movie} onBack={() => setMovie(null)} />
        : lib ? <LibraryScreen onBack={() => setLib(false)} />
        : <HomeScreen onOpen={setMovie} onLibrary={() => setLib(true)} />}
    </>
  );
}
