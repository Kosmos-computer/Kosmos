import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
/**
 * STUB: Renders Longformer SettingsWorkspace section content using Arco patterns.
 */
import { Check, ChevronRight } from "lucide-react";
import { ListItem } from "../../components/patterns";
import {
  SettingsDivider,
  SettingsEmpty,
  SettingsPage,
  SettingsRow,
  SettingsRowActions,
  SettingsSection,
  SettingsStack,
  SettingsSubhead,
} from "../../components/patterns";
import { Button, Switch } from "../../components/ui";
import { SettingsStubNotice } from "./SettingsStubNotice";
import { WallpaperSettings } from "./WallpaperSettings";
import type {
  StubSettingsContentSection,
  StubSettingsFieldRow,
  StubSettingsLinkRow,
  StubSettingsStanding,
  StubSettingsToggleRow,
} from "./settingsStubTypes";
import type { SettingsStubViewModel } from "./useSettingsStub";

function renderStandingDescription(standing: StubSettingsStanding) {
  const parts = standing.description.split(/(\[\[link\d+\]\])/g);
  let linkIndex = 0;

  return parts.map((part, index) => {
    const match = part.match(/^\[\[link(\d+)\]\]$/);
    if (match) {
      const label = standing.linkLabels?.[linkIndex] ?? "Learn more";
      linkIndex += 1;
      return (
        <button key={`link-${index}`} type="button" className="arco-settings-stub-standing__link">
          {label}
        </button>
      );
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
}

function StubFieldRow({
  row,
  revealed,
  onReveal,
}: {
  row: StubSettingsFieldRow;
  revealed: boolean;
  onReveal: () => void;
}) {
  const displayValue = row.masked && !revealed ? (row.maskedDisplay ?? row.value) : row.value;

  return (
    <SettingsRow>
      <div className="arco-settings-row__label">{row.label}</div>
      <div className="arco-settings-row__control">
        {displayValue ? <span>{displayValue}</span> : null}
        {row.actions?.length ? (
          <SettingsRowActions>
            {row.actions.map((action) => {
              if (action.type === "reveal" && !revealed) {
                return (
                  <Button key={`${row.id}-reveal`} variant="ghost" onClick={onReveal}>
                    {action.label ?? "Reveal"}
                  </Button>
                );
              }
              if (action.type === "edit") {
                return (
                  <Button key={`${row.id}-edit`} variant="default">
                    {action.label ?? "Edit"}
                  </Button>
                );
              }
              return null;
            })}
          </SettingsRowActions>
        ) : null}
      </div>
    </SettingsRow>
  );
}

function StubLinkRow({ row }: { row: StubSettingsLinkRow }) {
  return (
    <ListItem
      className="arco-settings-stub-link"
      label={row.label}
      description={row.hint}
      trailing={
        <>
          {row.value ? <span className="arco-settings-stub-link__value">{row.value}</span> : null}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
        </>
      }
    />
  );
}

function StubToggleRow({
  row,
  enabled,
  onChange,
}: {
  row: StubSettingsToggleRow;
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="arco-settings-toggle-row">
      <div className="arco-settings-toggle-row__label">{row.label}</div>
      <div className="arco-settings-toggle-row__body">
        {row.description ? <p className="arco-settings-toggle-row__desc">{row.description}</p> : null}
      </div>
      <Switch checked={enabled} onChange={(event) => onChange(event.target.checked)} aria-label={row.label} />
    </div>
  );
}

function StubStandingCard({ standing }: { standing: StubSettingsStanding }) {
  return (
    <button type="button" className={`arco-settings-stub-standing arco-settings-stub-standing--${standing.status}`}>
      <span className="arco-settings-stub-standing__icon" aria-hidden="true">
        <Check size={18} strokeWidth={2} />
      </span>
      <span className="arco-settings-stub-standing__body">
        <span className="arco-settings-stub-standing__title">{standing.title}</span>
        <span className="arco-settings-stub-standing__desc">{renderStandingDescription(standing)}</span>
      </span>
      <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
}

export interface SettingsStubSectionProps {
  section: StubSettingsContentSection;
  stub: SettingsStubViewModel;
  showTitle?: boolean;
  showNotice?: boolean;
}

export function SettingsStubSection({
  section,
  stub,
  showTitle = true,
  showNotice = true,
}: SettingsStubSectionProps) {
  const hasContent =
    Boolean(section.fields?.length) ||
    Boolean(section.links?.length) ||
    Boolean(section.toggles?.length) ||
    Boolean(section.standing) ||
    section.id === "wallpaper";

  return (
    <SettingsPage>
      {showNotice ? <SettingsStubNotice /> : null}
      <SettingsSection intro={section.intro}>
        {showTitle ? <SettingsSubhead>{section.title}</SettingsSubhead> : null}
        {section.id === "wallpaper" ? <WallpaperSettings /> : null}
        {section.fields?.length || section.links?.length || section.toggles?.length ? (
          <SettingsStack>
            {section.fields?.map((row) => (
              <StubFieldRow
                key={row.id}
                row={row}
                revealed={stub.revealedFields.has(row.id)}
                onReveal={() => stub.revealField(row.id)}
              />
            ))}
            {section.links?.map((row) => (
              <StubLinkRow key={row.id} row={row} />
            ))}
            {section.toggles?.map((row) => (
              <StubToggleRow
                key={row.id}
                row={row}
                enabled={stub.toggleStates[row.id] ?? row.enabled}
                onChange={(next) => stub.setToggle(row.id, next)}
              />
            ))}
          </SettingsStack>
        ) : null}
        {section.standing ? <StubStandingCard standing={section.standing} /> : null}
        {!hasContent ? <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_NO_SETTINGS_IN_THIS_SECTION_YET} /></SettingsEmpty> : null}
      </SettingsSection>
    </SettingsPage>
  );
}

export function SettingsStubPane({
  sectionIds,
  stub,
  showNotice = true,
}: {
  sectionIds: StubSettingsContentSection["id"][];
  stub: SettingsStubViewModel;
  showNotice?: boolean;
}) {
  const sections = sectionIds
    .map((id) => stub.sectionFor(id))
    .filter((section): section is StubSettingsContentSection => section !== undefined);

  if (sections.length === 0) {
    return (
      <SettingsPage>
        <SettingsStubNotice />
        <SettingsEmpty><T k={I18nKey.APPS$SETTINGS_SECTION_NOT_FOUND} /></SettingsEmpty>
      </SettingsPage>
    );
  }

  const showMultiTitle = sections.length > 1;

  return (
    <>
      {sections.map((section, index) => (
        <div key={section.id}>
          {index > 0 ? <SettingsDivider /> : null}
          <SettingsStubSection
            section={section}
            stub={stub}
            showTitle={showMultiTitle}
            showNotice={showNotice && index === 0}
          />
        </div>
      ))}
    </>
  );
}
