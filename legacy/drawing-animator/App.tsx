import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import HomeScreen from "./src/screens/HomeScreen";
import EditorScreen from "./src/screens/EditorScreen";
import type { Project } from "./src/lib/model";

export default function App() {
  const [project, setProject] = useState<Project | null>(null);
  return (
    <>
      <StatusBar style="light" />
      {project
        ? <EditorScreen key={project.id} initial={project} onExit={() => setProject(null)} />
        : <HomeScreen onOpen={setProject} />}
    </>
  );
}
