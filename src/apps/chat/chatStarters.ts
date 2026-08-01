/**
 * Empty-state starters for Chat — OpenUI dock apps vs Studio code projects.
 * Adapted from agent-canvas non-repo suggestions, split by build mode.
 */
import type { ClientBuildMode } from "./turnContext";

export interface ChatStarter {
  label: string;
  prompt: string;
  buildMode: ClientBuildMode;
}

export const CHAT_STARTERS: ChatStarter[] = [
  {
    label: "Dock tracker",
    buildMode: "openui",
    prompt:
      "Build a Quick OS app: a simple reading list tracker I can pin to the dock. Add items with a title, mark done, and delete. Use SQLite for persistence.",
  },
  {
    label: "System monitor",
    buildMode: "openui",
    prompt:
      "Build a Quick OS app: a system monitor dashboard with CPU/memory KPIs and a table of top processes. Discover data with exec, save a script, then app_create.",
  },
  {
    label: "Vite React todo",
    buildMode: "code",
    prompt:
      "Build a Code project: a Vite React TypeScript todo app with localStorage. Scaffold vite-react, install, run, and register_webapp when the URL is healthy.",
  },
  {
    label: "FastAPI hello",
    buildMode: "code",
    prompt:
      "Build a Code project: a small FastAPI API with a /health endpoint. Scaffold python-fastapi, install deps, run uvicorn, and register_webapp.",
  },
];
