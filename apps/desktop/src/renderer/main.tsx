import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { installLocalApi } from "./localApi";
import { unlockSfx } from "./sound/sfx";

installLocalApi();

// Audio may start only after a real user gesture.
for (const type of ["pointerdown", "keydown"] as const)
  window.addEventListener(type, () => unlockSfx(), { capture: true });
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
