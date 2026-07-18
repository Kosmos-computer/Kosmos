import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui";

export interface DrivePathCrumb {
  label: string;
  onClick?: () => void;
}

export function DrivePathBar({
  crumbs,
  onBack,
}: {
  crumbs: DrivePathCrumb[];
  onBack?: () => void;
}) {
  const canGoBack = Boolean(onBack);
  const items = crumbs.length > 0 ? crumbs : [{ label: "My Drive" }];

  return (
    <div className="arco-drive-path">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Back"
        disabled={!canGoBack}
        onClick={onBack}
      >
        <ArrowLeft size={16} />
      </Button>
      <nav className="arco-drive-path__crumbs" aria-label="Folder path">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <span key={`${item.label}-${index}`} className="arco-drive-path__segment">
              {index > 0 ? (
                <ChevronRight size={13} className="arco-drive-path__sep" aria-hidden="true" />
              ) : null}
              {item.onClick && !isCurrent ? (
                <button type="button" className="arco-drive-path__crumb" onClick={item.onClick}>
                  {item.label}
                </button>
              ) : (
                <span className="arco-drive-path__crumb arco-drive-path__crumb--current">{item.label}</span>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
