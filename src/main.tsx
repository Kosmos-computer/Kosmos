import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// OpenUI component library styles (generated apps + inline chat UI).
import "@openuidev/react-ui/index.css";

// Arco shell styles.
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/ui.css";
import "./styles/settings.css";
import "./styles/agent-blocks.css";
import "./styles/notes.css";
import "@arco/editor-kit/styles.css";
import "./styles/email.css";
import "./styles/files.css";
import "./styles/tasks.css";
import "./styles/contacts.css";
import "./styles/groups.css";
import "./styles/social.css";
import "./styles/connections.css";
import "./styles/sheets.css";
import "./styles/memory.css";
import "./styles/generator.css";
import "./styles/auth.css";
import "./styles/os.css";
import "./styles/bento.css";
import "./os/wallpaper/wallpaper.css";
import "./styles/cursor.css";
import "./styles/apps.css";
import "./styles/extensions.css";
import "./styles/composer.css";
import "./styles/studio.css";
import "./styles/startup.css";
import "./styles/onboarding.css";
import "./styles/adaptive.css";
import "./styles/richmarkdown.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
