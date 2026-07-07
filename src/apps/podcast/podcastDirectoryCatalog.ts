import {
  PODCAST_DIRECTORY,
  directoryEntriesByCategory,
  filterDirectoryEntries,
  type PodcastDirectoryCategory,
  type PodcastDirectoryEntry,
} from "@shared/podcastDirectory";
import type { PodcastArtTone } from "./types";

const ART_TONES: PodcastArtTone[] = [
  "rose",
  "orange",
  "amber",
  "lime",
  "green",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "purple",
  "pink",
];

export function directoryArtTone(label: string): PodcastArtTone {
  let hash = 0;
  for (const char of label) hash = (hash + char.charCodeAt(0)) % ART_TONES.length;
  return ART_TONES[hash] ?? "teal";
}

export function filterPodcastDirectory(
  query: string,
  category: PodcastDirectoryCategory | "all",
): PodcastDirectoryEntry[] {
  return filterDirectoryEntries(PODCAST_DIRECTORY, query, category);
}

export function groupedPodcastDirectory(
  entries: PodcastDirectoryEntry[],
): Map<PodcastDirectoryCategory, PodcastDirectoryEntry[]> {
  return directoryEntriesByCategory(entries);
}

export { PODCAST_DIRECTORY, PODCAST_DIRECTORY_CATEGORIES } from "@shared/podcastDirectory";
