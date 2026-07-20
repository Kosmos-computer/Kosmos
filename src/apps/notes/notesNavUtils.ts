import type { DragEvent } from "react";
import type { NoteNavFolderNode, NoteNavNode, NoteNavPageNode, NoteNavSection } from "./types";

export type NavDropPosition = "before" | "after" | "inside";

export interface NavNodeLocation {
  sectionId: string;
  parentId: string | null;
  index: number;
}

function isFolder(node: NoteNavNode): node is NoteNavFolderNode {
  return node.type === "folder";
}

function cloneSections(sections: NoteNavSection[]): NoteNavSection[] {
  return sections.map((section) => ({
    ...section,
    items: cloneNodes(section.items),
  }));
}

function cloneNodes(nodes: NoteNavNode[]): NoteNavNode[] {
  return nodes.map((node) =>
    isFolder(node) ? { ...node, children: cloneNodes(node.children) } : { ...node },
  );
}

export function findNavNodeLocation(
  sections: readonly NoteNavSection[],
  nodeId: string,
): NavNodeLocation | null {
  for (const section of sections) {
    const found = findInNodes(section.items, nodeId, section.id, null);
    if (found) return found;
  }
  return null;
}

function findInNodes(
  nodes: readonly NoteNavNode[],
  nodeId: string,
  sectionId: string,
  parentId: string | null,
): NavNodeLocation | null {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.id === nodeId) {
      return { sectionId, parentId, index };
    }
    if (isFolder(node)) {
      const nested = findInNodes(node.children, nodeId, sectionId, node.id);
      if (nested) return nested;
    }
  }
  return null;
}

export function getNavNode(sections: readonly NoteNavSection[], nodeId: string): NoteNavNode | null {
  const location = findNavNodeLocation(sections, nodeId);
  if (!location) return null;
  const section = sections.find((entry) => entry.id === location.sectionId);
  if (!section) return null;
  const parent = location.parentId ? getNavNode(sections, location.parentId) : null;
  const siblings = parent && isFolder(parent) ? parent.children : section.items;
  return siblings[location.index] ?? null;
}

/** Folder labels from vault root to `folderId` (excludes the Drive root, which is not in the nav). */
export function folderPathLabels(
  sections: readonly NoteNavSection[],
  folderId: string | undefined,
): string[] {
  if (!folderId) return [];
  const labels: string[] = [];
  let currentId: string | null = folderId;
  while (currentId) {
    const node = getNavNode(sections, currentId);
    if (!node || !isFolder(node)) break;
    labels.unshift(node.label);
    currentId = findNavNodeLocation(sections, currentId)?.parentId ?? null;
  }
  return labels;
}

function isDescendant(sections: readonly NoteNavSection[], ancestorId: string, nodeId: string): boolean {
  const ancestor = getNavNode(sections, ancestorId);
  if (!ancestor || !isFolder(ancestor)) return false;
  for (const child of ancestor.children) {
    if (child.id === nodeId) return true;
    if (isFolder(child) && isDescendant(sections, child.id, nodeId)) return true;
  }
  return false;
}

function removeNodeAt(
  nodes: NoteNavNode[],
  nodeId: string,
): { nodes: NoteNavNode[]; removed: NoteNavNode | null } {
  let removed: NoteNavNode | null = null;
  const next = nodes.flatMap((node) => {
    if (node.id === nodeId) {
      removed = node;
      return [];
    }
    if (isFolder(node)) {
      const result = removeNodeAt(node.children, nodeId);
      if (result.removed) {
        removed = result.removed;
        return [{ ...node, children: result.nodes }];
      }
    }
    return [node];
  });
  return { nodes: next, removed };
}

function insertNodeAt(
  nodes: NoteNavNode[],
  parentId: string | null,
  index: number,
  node: NoteNavNode,
): NoteNavNode[] {
  if (parentId === null) {
    const next = [...nodes];
    next.splice(index, 0, node);
    return next;
  }
  return nodes.map((entry) => {
    if (!isFolder(entry)) return entry;
    if (entry.id === parentId) {
      const children = [...entry.children];
      children.splice(index, 0, node);
      return { ...entry, children, expanded: true };
    }
    return { ...entry, children: insertNodeAt(entry.children, parentId, index, node) };
  });
}

function mapNodes(
  nodes: NoteNavNode[],
  nodeId: string,
  mapper: (node: NoteNavNode) => NoteNavNode,
): NoteNavNode[] {
  return nodes.map((node) => {
    if (node.id === nodeId) return mapper(node);
    if (isFolder(node)) {
      return { ...node, children: mapNodes(node.children, nodeId, mapper) };
    }
    return node;
  });
}

function updateSectionItems(
  sections: NoteNavSection[],
  sectionId: string,
  updater: (items: NoteNavNode[]) => NoteNavNode[],
): NoteNavSection[] {
  return sections.map((section) =>
    section.id === sectionId ? { ...section, items: updater(section.items) } : section,
  );
}

export function moveNavNode(
  sections: NoteNavSection[],
  draggedId: string,
  targetId: string,
  position: NavDropPosition,
): NoteNavSection[] {
  if (draggedId === targetId) return sections;
  if (isDescendant(sections, draggedId, targetId)) return sections;

  const targetLocation = findNavNodeLocation(sections, targetId);
  if (!targetLocation) return sections;

  const next = cloneSections(sections);
  const sourceSection = next.find((section) => {
    const location = findNavNodeLocation([section], draggedId);
    return Boolean(location);
  });
  if (!sourceSection) return sections;

  const sourceLocation = findNavNodeLocation([sourceSection], draggedId);
  if (!sourceLocation) return sections;

  const sourceItemsResult = removeNodeAt(sourceSection.items, draggedId);
  if (!sourceItemsResult.removed) return sections;

  const targetSection = next.find((section) => section.id === targetLocation.sectionId);
  if (!targetSection) return sections;

  const targetNode = getNavNode(next, targetId);
  if (!targetNode) return sections;

  let insertSectionId = targetLocation.sectionId;
  let insertParentId = targetLocation.parentId;
  let insertIndex = targetLocation.index;

  if (position === "inside" && isFolder(targetNode)) {
    insertParentId = targetNode.id;
    insertIndex = targetNode.children.length;
  } else if (position === "after") {
    insertIndex = targetLocation.index + 1;
  } else {
    insertIndex = targetLocation.index;
  }

  if (
    sourceLocation.sectionId === insertSectionId &&
    sourceLocation.parentId === insertParentId &&
    sourceLocation.index < insertIndex
  ) {
    insertIndex -= 1;
  }

  const sectionAfterRemove = next.map((section) =>
    section.id === sourceSection.id ? { ...section, items: sourceItemsResult.nodes } : section,
  );

  return updateSectionItems(sectionAfterRemove, insertSectionId, (items) =>
    insertNodeAt(items, insertParentId, insertIndex, sourceItemsResult.removed!),
  );
}

export function toggleNavFolderExpanded(
  sections: NoteNavSection[],
  folderId: string,
): NoteNavSection[] {
  return sections.map((section) => ({
    ...section,
    items: mapNodes(section.items, folderId, (node) =>
      isFolder(node) ? { ...node, expanded: !node.expanded } : node,
    ),
  }));
}

export function createNavFolder(
  sections: NoteNavSection[],
  sectionId: string,
  parentId: string | null,
  label = "Untitled folder",
): { sections: NoteNavSection[]; folderId: string } {
  const folderId = `folder-${Date.now()}`;
  const folder: NoteNavFolderNode = {
    type: "folder",
    id: folderId,
    label,
    children: [],
    expanded: true,
  };

  if (parentId) {
    const parent = getNavNode(sections, parentId);
    if (!parent || !isFolder(parent)) return { sections, folderId };
    const next = sections.map((section) => ({
      ...section,
      items: mapNodes(section.items, parentId, (node) =>
        isFolder(node) ? { ...node, children: [...node.children, folder], expanded: true } : node,
      ),
    }));
    return { sections: next, folderId };
  }

  const next = updateSectionItems(sections, sectionId, (items) => [...items, folder]);
  return { sections: next, folderId };
}

export function createNavPage(
  sections: NoteNavSection[],
  sectionId: string,
  parentId: string | null,
  page: NoteNavPageNode,
): NoteNavSection[] {
  if (parentId) {
    return sections.map((section) => ({
      ...section,
      items: mapNodes(section.items, parentId, (node) =>
        isFolder(node) ? { ...node, children: [...node.children, page], expanded: true } : node,
      ),
    }));
  }
  return updateSectionItems(sections, sectionId, (items) => [...items, page]);
}

export function updateNavPageLabel(
  sections: NoteNavSection[],
  pageId: string,
  label: string,
): NoteNavSection[] {
  return sections.map((section) => ({
    ...section,
    items: mapNodes(section.items, pageId, (node) =>
      node.type === "page" ? { ...node, label } : node,
    ),
  }));
}

export function removeNavNode(sections: NoteNavSection[], nodeId: string): NoteNavSection[] {
  return sections.map((section) => ({
    ...section,
    items: removeNodeAt(section.items, nodeId).nodes,
  }));
}

export function duplicateNavPage(
  sections: NoteNavSection[],
  pageId: string,
  page: NoteNavPageNode,
): NoteNavSection[] {
  const location = findNavNodeLocation(sections, pageId);
  if (!location) return sections;
  const target = getNavNode(sections, pageId);
  if (!target || target.type !== "page") return sections;

  const next = cloneSections(sections);
  return updateSectionItems(next, location.sectionId, (items) =>
    insertNodeAt(items, location.parentId, location.index + 1, page),
  );
}

export function filterNavSections(
  sections: readonly NoteNavSection[],
  query: string,
): NoteNavSection[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return sections.map((section) => ({ ...section, items: cloneNodes(section.items) }));

  function filterNodes(nodes: readonly NoteNavNode[]): NoteNavNode[] {
    const filtered: NoteNavNode[] = [];
    for (const node of nodes) {
      if (node.type === "page") {
        if (node.label.toLowerCase().includes(normalized)) filtered.push({ ...node });
        continue;
      }
      const children = filterNodes(node.children);
      if (node.label.toLowerCase().includes(normalized) || children.length > 0) {
        filtered.push({ ...node, children, expanded: true });
      }
    }
    return filtered;
  }

  return sections.map((section) => ({
    ...section,
    items: filterNodes(section.items),
  }));
}

export function computeNavDropPosition(
  event: DragEvent<HTMLElement>,
  isFolderRow: boolean,
): NavDropPosition {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / rect.height;
  if (isFolderRow) {
    if (ratio < 0.25) return "before";
    if (ratio > 0.75) return "after";
    return "inside";
  }
  return ratio < 0.5 ? "before" : "after";
}
