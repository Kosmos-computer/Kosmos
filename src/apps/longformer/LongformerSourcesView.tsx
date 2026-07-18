import { Folder, HardDrive, Layers, Podcast, Video } from "lucide-react";
import { Button } from "../../components/ui";
import type { LongformerViewModel } from "./longformerStore";

type SourceAvailability = "available" | "coming_soon";

interface SourceOption {
  id: string;
  label: string;
  description: string;
  availability: SourceAvailability;
  icon: typeof HardDrive;
}

const SOURCE_OPTIONS: SourceOption[] = [
  {
    id: "local",
    label: "This computer",
    description: "Upload audio or video from your local drive.",
    availability: "available",
    icon: HardDrive,
  },
  {
    id: "files",
    label: "Arco Files",
    description: "Transcribe a file already stored in Files.",
    availability: "available",
    icon: Folder,
  },
  {
    id: "zoom",
    label: "Zoom",
    description: "Import cloud recordings after OAuth and sync are wired.",
    availability: "coming_soon",
    icon: Video,
  },
  {
    id: "meet",
    label: "Google Meet",
    description: "Needs Google OAuth plus Drive/Meet recording access.",
    availability: "coming_soon",
    icon: Video,
  },
  {
    id: "rss",
    label: "Podcast feeds",
    description: "Bridge Podcast RSS ingest into Longformer jobs.",
    availability: "coming_soon",
    icon: Podcast,
  },
  {
    id: "drive",
    label: "Google Drive",
    description: "Cloud Drive OAuth and folder watchers are not built yet.",
    availability: "coming_soon",
    icon: Folder,
  },
  {
    id: "memory",
    label: "App Memory",
    description: "Export memory recordings into transcription jobs.",
    availability: "coming_soon",
    icon: Layers,
  },
];

interface LongformerSourcesViewProps {
  vm: LongformerViewModel;
}

/** Source catalog — only local disk and Arco Files can ingest today. */
export function LongformerSourcesView({ vm }: LongformerSourcesViewProps) {
  return (
    <div className="arco-longformer-library">
      <header className="arco-longformer-library__header">
        <div>
          <h1 className="arco-longformer-library__title">Sources</h1>
          <p className="arco-longformer-placeholder__text">
            Transcription today accepts uploads from this computer or Arco Files. Meeting and cloud
            connectors are not connected yet.
          </p>
        </div>
      </header>

      <ul className="arco-longformer-sources">
        {SOURCE_OPTIONS.map((source) => {
          const Icon = source.icon;
          const available = source.availability === "available";
          return (
            <li key={source.id} className="arco-longformer-sources__item">
              <span className="arco-longformer-sources__icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <div className="arco-longformer-sources__copy">
                <div className="arco-longformer-sources__title-row">
                  <span className="arco-longformer-sources__name">{source.label}</span>
                  <span
                    className={`arco-longformer-sources__badge${
                      available ? " arco-longformer-sources__badge--ready" : ""
                    }`}
                  >
                    {available ? "Available" : "Coming soon"}
                  </span>
                </div>
                <p className="arco-longformer-sources__desc">{source.description}</p>
              </div>
              {source.id === "local" ? (
                <Button type="button" variant="primary" disabled={vm.uploading} onClick={vm.uploadFile}>
                  Choose file
                </Button>
              ) : null}
              {source.id === "files" ? (
                <Button
                  type="button"
                  variant="default"
                  disabled={vm.uploading}
                  onClick={vm.openDrivePicker}
                >
                  Browse Files
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
