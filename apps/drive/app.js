/**
 * Drive — a thin UI over the OS file store (os.files@1).
 *
 * Pure contract client, no private storage: every read/write is an intent
 * through the SDK bridge, so the agent, other apps, and future editor apps
 * all see the same documents. Live updates arrive over the manifest-gated
 * "files.changed" event — Drive re-queries instead of trusting payloads.
 */
import { createAppClient } from "/app-sdk.js";

const os = createAppClient();

const FOLDER_MIME = "inode/directory";
/** Mime types the built-in text viewer can open. */
const TEXT_LIKE = /^(text\/|application\/(json|x-os-[a-z-]+\+json)$)/;

// ── State ─────────────────────────────────────────────────────────────────────

let view = "files"; // "files" | "starred" | "trash" | "search"
let folderId = null; // current folder (files view), null = root
let crumbs = []; // [{id, name}] path to the current folder, root excluded
let entries = [];
let searchQuery = "";
let openFileId = null; // id shown in the file dialog

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const errorEl = document.getElementById("error");
const crumbsEl = document.getElementById("breadcrumbs");
const searchEl = document.getElementById("search");
const fileDialog = document.getElementById("file-dialog");
const fileTitle = document.getElementById("file-dialog-title");
const fileMeta = document.getElementById("file-dialog-meta");
const fileContent = document.getElementById("file-content");
const moveDialog = document.getElementById("move-dialog");
const moveList = document.getElementById("move-list");

const TABS = {
  files: document.getElementById("tab-files"),
  starred: document.getElementById("tab-starred"),
  trash: document.getElementById("tab-trash"),
};

// ── Data ──────────────────────────────────────────────────────────────────────

async function refresh() {
  try {
    if (view === "search") {
      entries = await os.intents.invoke("files.search", { query: searchQuery });
    } else if (view === "starred") {
      entries = await os.intents.invoke("files.list", { starred: true });
    } else if (view === "trash") {
      entries = await os.intents.invoke("files.list", { trashed: true });
    } else {
      entries = await os.intents.invoke("files.list", { parentId: folderId });
    }
    showError(null);
  } catch (err) {
    entries = [];
    showError(err.message);
  }
  render();
}

function showError(message) {
  errorEl.hidden = !message;
  errorEl.textContent = message ?? "";
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatSize(bytes) {
  if (bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function iconFor(entry) {
  if (entry.mimeType === FOLDER_MIME) return "📁";
  if (entry.mimeType.startsWith("image/")) return "🖼️";
  if (entry.mimeType === "text/markdown") return "📝";
  return "📄";
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function render() {
  for (const [id, el] of Object.entries(TABS)) {
    el.classList.toggle("drv-tab--active", view === id || (view === "search" && id === "files"));
  }
  renderCrumbs();
  renderList();
}

function renderCrumbs() {
  crumbsEl.replaceChildren();
  if (view !== "files") {
    const label = document.createElement("span");
    label.className = "drv-crumbs__here";
    label.textContent =
      view === "starred" ? "Starred" : view === "trash" ? "Trash" : `Results for "${searchQuery}"`;
    crumbsEl.appendChild(label);
    return;
  }
  const root = document.createElement("button");
  root.type = "button";
  root.className = "drv-crumb";
  root.textContent = "My files";
  root.addEventListener("click", () => openFolder(null, []));
  crumbsEl.appendChild(root);
  crumbs.forEach((crumb, i) => {
    const sep = document.createElement("span");
    sep.className = "drv-crumbs__sep";
    sep.textContent = "›";
    crumbsEl.appendChild(sep);
    if (i === crumbs.length - 1) {
      const here = document.createElement("span");
      here.className = "drv-crumbs__here";
      here.textContent = crumb.name;
      crumbsEl.appendChild(here);
    } else {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "drv-crumb";
      btn.textContent = crumb.name;
      btn.addEventListener("click", () => openFolder(crumb.id, crumbs.slice(0, i + 1)));
      crumbsEl.appendChild(btn);
    }
  });
}

function renderList() {
  listEl.replaceChildren();
  emptyEl.hidden = entries.length > 0;

  for (const entry of entries) {
    const row = document.createElement("div");
    row.className = "drv-row";
    row.setAttribute("role", "listitem");

    const main = document.createElement("button");
    main.type = "button";
    main.className = "drv-row__main";
    main.addEventListener("click", () => openEntry(entry));

    const icon = document.createElement("span");
    icon.className = "drv-row__icon";
    icon.textContent = iconFor(entry);
    main.appendChild(icon);

    const name = document.createElement("span");
    name.className = "drv-row__name";
    name.textContent = entry.name;
    if (entry.starred) {
      const star = document.createElement("span");
      star.className = "drv-row__star";
      star.textContent = "★";
      name.appendChild(star);
    }
    main.appendChild(name);

    const meta = document.createElement("span");
    meta.className = "drv-row__meta";
    meta.textContent = [formatSize(entry.size), formatDate(entry.updatedAt)]
      .filter(Boolean)
      .join(" · ");
    main.appendChild(meta);

    row.appendChild(main);
    row.appendChild(buildActions(entry));
    listEl.appendChild(row);
  }
}

function buildActions(entry) {
  const actions = document.createElement("div");
  actions.className = "drv-row__actions";
  const add = (label, title, fn) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "drv-btn drv-btn--ghost";
    btn.textContent = label;
    btn.title = title;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      void fn();
    });
    actions.appendChild(btn);
  };

  if (view === "trash") {
    add("Restore", "Restore from trash", () => invoke("files.restore", { id: entry.id }));
    add("Delete", "Delete forever", async () => {
      if (confirm(`Permanently delete "${entry.name}"? This cannot be undone.`)) {
        await invoke("files.delete", { id: entry.id });
      }
    });
    return actions;
  }

  add(entry.starred ? "★" : "☆", entry.starred ? "Unstar" : "Star", () =>
    invoke("files.star", { id: entry.id, starred: !entry.starred }),
  );
  add("Rename", "Rename", async () => {
    const name = prompt("Rename to:", entry.name);
    if (name && name.trim() && name !== entry.name) {
      await invoke("files.rename", { id: entry.id, name: name.trim() });
    }
  });
  add("Move", "Move to folder", () => openMoveDialog(entry));
  add("🗑", "Move to trash", () => invoke("files.trash", { id: entry.id }));
  return actions;
}

async function invoke(intent, params) {
  try {
    await os.intents.invoke(intent, params);
    showError(null);
  } catch (err) {
    showError(err.message);
  }
  await refresh();
}

// ── Navigation & opening ──────────────────────────────────────────────────────

function openFolder(id, path) {
  view = "files";
  folderId = id;
  crumbs = path;
  searchEl.value = "";
  void refresh();
}

function openEntry(entry) {
  if (entry.mimeType === FOLDER_MIME) {
    if (view === "trash") return; // No navigating inside the trash.
    openFolder(entry.id, [...crumbs, { id: entry.id, name: entry.name }]);
    return;
  }
  if (TEXT_LIKE.test(entry.mimeType)) {
    void openTextFile(entry);
    return;
  }
  showError(`No viewer for ${entry.mimeType} yet.`);
}

async function openTextFile(entry) {
  try {
    const file = await os.intents.invoke("files.content.read", { id: entry.id });
    openFileId = entry.id;
    fileTitle.textContent = file.name;
    fileMeta.textContent = entry.mimeType;
    fileContent.value = file.content;
    fileDialog.showModal();
  } catch (err) {
    showError(err.message);
  }
}

document.getElementById("file-save").addEventListener("click", async () => {
  if (!openFileId) return;
  try {
    await os.intents.invoke("files.content.write", { id: openFileId, content: fileContent.value });
    fileDialog.close();
    await refresh();
  } catch (err) {
    showError(err.message);
    fileDialog.close();
  }
});
document.getElementById("file-cancel").addEventListener("click", () => fileDialog.close());

// ── Move dialog ───────────────────────────────────────────────────────────────

async function openMoveDialog(entry) {
  moveList.replaceChildren();
  const addOption = (label, targetId) => {
    if (targetId === entry.parentId || targetId === entry.id) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "drv-move-option";
    btn.textContent = label;
    btn.addEventListener("click", async () => {
      moveDialog.close();
      await invoke("files.move", { id: entry.id, parentId: targetId });
    });
    moveList.appendChild(btn);
  };

  addOption("📁 My files (root)", null);
  try {
    // One level of folders is enough for a v1 picker; deep trees can be
    // navigated by moving in steps.
    const rootEntries = await os.intents.invoke("files.list", {});
    for (const each of rootEntries) {
      if (each.mimeType === FOLDER_MIME) addOption(`📁 ${each.name}`, each.id);
    }
  } catch (err) {
    showError(err.message);
  }
  moveDialog.showModal();
}

document.getElementById("move-cancel").addEventListener("click", () => moveDialog.close());

// ── Toolbar ───────────────────────────────────────────────────────────────────

TABS.files.addEventListener("click", () => openFolder(null, []));
TABS.starred.addEventListener("click", () => {
  view = "starred";
  searchEl.value = "";
  void refresh();
});
TABS.trash.addEventListener("click", () => {
  view = "trash";
  searchEl.value = "";
  void refresh();
});

let searchTimer;
searchEl.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = searchEl.value.trim();
    if (q) {
      view = "search";
      searchQuery = q;
    } else {
      view = "files";
    }
    void refresh();
  }, 250);
});

document.getElementById("new-folder").addEventListener("click", async () => {
  const name = prompt("Folder name:");
  if (!name || !name.trim()) return;
  await invoke("files.create", {
    name: name.trim(),
    kind: "folder",
    parentId: view === "files" ? folderId : null,
  });
});

document.getElementById("new-file").addEventListener("click", async () => {
  const name = prompt("File name:", "Untitled.md");
  if (!name || !name.trim()) return;
  await invoke("files.create", {
    name: name.trim(),
    kind: "file",
    mimeType: name.trim().endsWith(".md") ? "text/markdown" : "text/plain",
    parentId: view === "files" ? folderId : null,
    content: "",
  });
});

// ── Live updates ──────────────────────────────────────────────────────────────

// Agent- and app-made changes announce files.changed; re-query rather than
// patching local state so the store stays the single source of truth.
os.events.on("files.changed", () => void refresh());

// ── Boot ──────────────────────────────────────────────────────────────────────

void refresh();
