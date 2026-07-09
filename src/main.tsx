import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { bootstrapPlatformShell } from "./os/bootstrapPlatformShell";
import { waitForI18n } from "./i18n";

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
import "./styles/calendar.css";
import "./styles/contacts.css";
import "./styles/maps.css";
import "./styles/search.css";
import "./styles/media-player.css";
import "./styles/music.css";
import "./styles/video.css";
import "./styles/meet.css";
import "./styles/podcast.css";
import "./styles/downloads.css";
import "./styles/pay.css";
import "./styles/groups.css";
import "./styles/messenger.css";
import "./styles/social.css";
import "./styles/connections.css";
import "./styles/sheets.css";
import "./styles/memory.css";
import "./styles/agents.css";
import "./styles/longformer.css";
import "./styles/kamiji.css";
import "./styles/generator.css";
import "./styles/imagegen.css";
import "./styles/auth.css";
import "./styles/server-connect.css";
import "./styles/os.css";
import "./styles/command-palette.css";
import "./styles/bento.css";
import "./styles/bento-themes.css";
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

async function bootstrap() {
  await bootstrapPlatformShell();
  await waitForI18n();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
