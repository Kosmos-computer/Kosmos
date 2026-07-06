/**
 * Drive — a thin UI over the OS file store (os.files@1).
 *
 * Pure contract client, no private storage: every read/write is an intent
 * through the SDK bridge, so the agent, other apps, and future editor apps
 * all see the same documents. Live updates arrive over the manifest-gated
 * "files.changed" event — Drive re-queries instead of trusting payloads.
 */
import { createAppClient } from "/app-sdk.js";
import { icon, mountDataIcons } from "./icons.js";

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
let dragEntryId = null; // entry id while a row drag is in progress
let openMenu = null; // currently open row menu panel

const SEARCH_SLOT = {
  id: "search",
  kind: "search",
  placeholder: "Search documents…",
  label: "Search documents",
};

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const errorEl = document.getElementById("error");
const crumbsEl = document.getElementById("breadcrumbs");
const fileDialog = document.getElementById("file-dialog");
const fileTitle = document.getElementById("file-dialog-title");
const fileMeta = document.getElementById("file-dialog-meta");
const fileContent = document.getElementById("file-content");
const moveDialog = document.getElementById("move-dialog");
const moveList = document.getElementById("move-list");

const NAV = {
  files: document.getElementById("nav-files"),
  starred: document.getElementById("nav-starred"),
  trash: document.getElementById("nav-trash"),
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

function entryIconName(entry) {
  if (entry.mimeType === FOLDER_MIME) return "folder";
  if (entry.mimeType.startsWith("image/")) return "image";
  return "file-text";
}

function entryIcon(entry, { size = 15 } = {}) {
  const el = icon(entryIconName(entry), { size, className: entry.mimeType === FOLDER_MIME ? "drv-icon--accent" : "" });
  return el;
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function render() {
  for (const [id, el] of Object.entries(NAV)) {
    el.classList.toggle("drv-nav-item--active", view === id || (view === "search" && id === "files"));
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
    sep.appendChild(icon("chevron-right", { size: 14 }));
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
  const canDrag = view !== "trash";

  for (const entry of entries) {
    const row = document.createElement("div");
    row.className = "drv-row";
    row.setAttribute("role", "listitem");
    row.dataset.entryId = entry.id;

    if (canDrag) {
      row.draggable = true;
      row.addEventListener("dragstart", (event) => {
        if (event.target.closest(".drv-row__menu")) {
          event.preventDefault();
          return;
        }
        dragEntryId = entry.id;
        event.dataTransfer.setData("application/x-drive-entry", entry.id);
        event.dataTransfer.effectAllowed = "move";
        row.classList.add("drv-row--dragging");
      });
      row.addEventListener("dragend", () => {
        dragEntryId = null;
        row.classList.remove("drv-row--dragging");
        clearDropTargets();
      });
    }

    if (entry.mimeType === FOLDER_MIME && canDrag) {
      row.addEventListener("dragover", (event) => {
        if (!dragEntryId || dragEntryId === entry.id) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      });
      row.addEventListener("dragenter", (event) => {
        if (!dragEntryId || dragEntryId === entry.id) return;
        event.preventDefault();
        row.classList.add("drv-row--drop-target");
      });
      row.addEventListener("dragleave", (event) => {
        if (row.contains(event.relatedTarget)) return;
        row.classList.remove("drv-row--drop-target");
      });
      row.addEventListener("drop", (event) => {
        event.preventDefault();
        row.classList.remove("drv-row--drop-target");
        void dropEntryOnFolder(entry.id);
      });
    }

    const main = document.createElement("button");
    main.type = "button";
    main.className = "drv-row__main";
    main.addEventListener("click", () => openEntry(entry));

    const iconEl = document.createElement("span");
    iconEl.className = "drv-row__icon";
    iconEl.appendChild(entryIcon(entry));
    main.appendChild(iconEl);

    const name = document.createElement("span");
    name.className = "drv-row__name";
    name.textContent = entry.name;
    if (entry.starred) {
      const star = document.createElement("span");
      star.className = "drv-row__star";
      star.appendChild(icon("star", { size: 12, filled: true }));
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
    row.appendChild(buildRowMenu(entry));
    listEl.appendChild(row);
  }
}

function clearDropTargets() {
  for (const row of listEl.querySelectorAll(".drv-row--drop-target")) {
    row.classList.remove("drv-row--drop-target");
  }
}

async function dropEntryOnFolder(targetFolderId) {
  const sourceId = dragEntryId;
  if (!sourceId || sourceId === targetFolderId) return;
  const dragged = entries.find((each) => each.id === sourceId);
  if (dragged?.parentId === targetFolderId) return;
  dragEntryId = null;
  await invoke("files.move", { id: sourceId, parentId: targetFolderId });
}

function getMenuItems(entry) {
  if (view === "trash") {
    return [
      {
        label: "Restore",
        fn: () => invoke("files.restore", { id: entry.id }),
      },
      {
        label: "Delete forever",
        danger: true,
        fn: async () => {
          if (confirm(`Permanently delete "${entry.name}"? This cannot be undone.`)) {
            await invoke("files.delete", { id: entry.id });
          }
        },
      },
    ];
  }

  return [
    {
      label: entry.starred ? "Unstar" : "Star",
      fn: () => invoke("files.star", { id: entry.id, starred: !entry.starred }),
    },
    {
      label: "Rename",
      fn: async () => {
        const name = prompt("Rename to:", entry.name);
        if (name && name.trim() && name !== entry.name) {
          await invoke("files.rename", { id: entry.id, name: name.trim() });
        }
      },
    },
    {
      label: "Move to folder",
      fn: () => openMoveDialog(entry),
    },
    {
      label: "Move to trash",
      danger: true,
      fn: () => invoke("files.trash", { id: entry.id }),
    },
  ];
}

function closeOpenMenu() {
  if (!openMenu) return;
  openMenu.hidden = true;
  openMenu.style.top = "";
  openMenu.style.right = "";
  openMenu.closest(".drv-row__menu")?.querySelector("button")?.setAttribute("aria-expanded", "false");
  openMenu = null;
}

function positionRowMenu(trigger, menu) {
  const rect = trigger.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
}

function buildRowMenu(entry) {
  const wrap = document.createElement("div");
  wrap.className = "drv-row__menu";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "drv-btn drv-btn--ghost drv-btn--icon";
  trigger.setAttribute("aria-label", "More actions");
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  trigger.appendChild(icon("ellipsis-vertical", { size: 14 }));

  const menu = document.createElement("div");
  menu.className = "drv-menu";
  menu.setAttribute("role", "menu");
  menu.hidden = true;

  for (const item of getMenuItems(entry)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = ["drv-menu__item", item.danger ? "drv-menu__item--danger" : ""]
      .filter(Boolean)
      .join(" ");
    btn.setAttribute("role", "menuitem");
    btn.textContent = item.label;
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      closeOpenMenu();
      void item.fn();
    });
    menu.appendChild(btn);
  }

  trigger.addEventListener("mousedown", (event) => event.stopPropagation());
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !menu.hidden;
    closeOpenMenu();
    if (!isOpen) {
      positionRowMenu(trigger, menu);
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      openMenu = menu;
    }
  });

  wrap.appendChild(trigger);
  wrap.appendChild(menu);
  return wrap;
}

function clearSearch() {
  searchQuery = "";
  os.shell.toolbar.set([SEARCH_SLOT]);
}

function applySearch(query) {
  const q = query.trim();
  if (q) {
    view = "search";
    searchQuery = q;
  } else {
    view = "files";
    searchQuery = "";
  }
  void refresh();
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
  clearSearch();
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
  const addOption = (iconName, label, targetId) => {
    if (targetId === entry.parentId || targetId === entry.id) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "drv-move-option";
    btn.appendChild(icon(iconName, { size: 15, className: "drv-icon--accent" }));
    btn.appendChild(document.createTextNode(label));
    btn.addEventListener("click", async () => {
      moveDialog.close();
      await invoke("files.move", { id: entry.id, parentId: targetId });
    });
    moveList.appendChild(btn);
  };

  addOption("folder", "My files (root)", null);
  try {
    // One level of folders is enough for a v1 picker; deep trees can be
    // navigated by moving in steps.
    const rootEntries = await os.intents.invoke("files.list", {});
    for (const each of rootEntries) {
      if (each.mimeType === FOLDER_MIME) addOption("folder", each.name, each.id);
    }
  } catch (err) {
    showError(err.message);
  }
  moveDialog.showModal();
}

document.getElementById("move-cancel").addEventListener("click", () => moveDialog.close());

// ── Toolbar ───────────────────────────────────────────────────────────────────

NAV.files.addEventListener("click", () => openFolder(null, []));
NAV.starred.addEventListener("click", () => {
  view = "starred";
  clearSearch();
  void refresh();
});
NAV.trash.addEventListener("click", () => {
  view = "trash";
  clearSearch();
  void refresh();
});

let searchTimer;
os.shell.toolbar.onInput("search", (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => applySearch(value), 250);
});

os.shell.toolbar.set([SEARCH_SLOT]);

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

document.addEventListener("click", (event) => {
  if (event.target.closest(".drv-row__menu")) return;
  closeOpenMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeOpenMenu();
});
listEl.addEventListener("scroll", closeOpenMenu, { passive: true });
window.addEventListener("resize", closeOpenMenu);

mountDataIcons();
void refresh();
