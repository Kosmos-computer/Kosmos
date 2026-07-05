/**
 * Manifest icon names → Lucide components. A small allowlist rather than the
 * full lucide `icons` map, which would defeat tree-shaking and balloon the
 * bundle; unknown names fall back to the puzzle piece.
 */
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CalendarDays,
  FileText,
  Folder,
  Mail,
  Music,
  Presentation,
  Puzzle,
  Table,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  calendar: Calendar,
  "calendar-days": CalendarDays,
  mail: Mail,
  "file-text": FileText,
  table: Table,
  presentation: Presentation,
  folder: Folder,
  music: Music,
};

export function appIcon(name?: string): LucideIcon {
  return (name && ICONS[name]) || Puzzle;
}
