/**
 * STUB: Local-only state for Longformer-style settings sections.
 * Replace with useSettingsStore / API when profile & billing settings ship.
 */
import { useCallback, useMemo, useState } from "react";
import { SETTINGS_STUB_DATA } from "./settingsStubMock";
import type { StubSettingsContentSection, StubSettingsSectionId } from "./settingsStubTypes";

function initialToggleStates(): Record<string, boolean> {
  const entries: [string, boolean][] = [];
  for (const section of SETTINGS_STUB_DATA.sections) {
    for (const toggle of section.toggles ?? []) {
      entries.push([toggle.id, toggle.enabled]);
    }
  }
  return Object.fromEntries(entries);
}

export function useSettingsStub() {
  const [revealedFields, setRevealedFields] = useState<Set<string>>(() => new Set());
  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>(initialToggleStates);
  const [wallpaperUrl, setWallpaperUrl] = useState(
    () => SETTINGS_STUB_DATA.wallpaperPresets[0]?.url ?? "",
  );

  const sectionsById = useMemo(() => {
    const map = new Map<StubSettingsSectionId, StubSettingsContentSection>();
    for (const section of SETTINGS_STUB_DATA.sections) {
      map.set(section.id, section);
    }
    return map;
  }, []);

  const revealField = useCallback((fieldId: string) => {
    setRevealedFields((prev) => new Set([...prev, fieldId]));
  }, []);

  const setToggle = useCallback((toggleId: string, enabled: boolean) => {
    setToggleStates((prev) => ({ ...prev, [toggleId]: enabled }));
  }, []);

  const sectionFor = useCallback(
    (sectionId: StubSettingsSectionId) => sectionsById.get(sectionId),
    [sectionsById],
  );

  return {
    revealedFields,
    revealField,
    toggleStates,
    setToggle,
    wallpaperUrl,
    setWallpaperUrl,
    wallpaperPresets: SETTINGS_STUB_DATA.wallpaperPresets,
    sectionFor,
  };
}

export type SettingsStubViewModel = ReturnType<typeof useSettingsStub>;
