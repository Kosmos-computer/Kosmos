import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// OpenUI component library styles (generated apps + inline chat UI).
import "@openuidev/react-ui/index.css";

// Arco shell styles.
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/os.css";
import "./styles/cursor.css";
import "./styles/apps.css";
import "./styles/studio.css";
import "./styles/adaptive.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
