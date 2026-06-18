import { useState } from "react";
import { Onboarding } from "./components/Onboarding";
import { MainApp } from "./components/MainApp";

export default function App() {
  const [entered, setEntered] = useState(false);
  return entered ? <MainApp /> : <Onboarding onEnter={() => setEntered(true)} />;
}
