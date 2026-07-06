import { Clock, Grid3X3, Home, Plus, Star, Users } from "lucide-react";
import { useMemo } from "react";
import { NavSidebar } from "../../components/patterns";
import type { SheetsLocation, Workbook } from "./types";

const LOCATIONS: { id: SheetsLocation; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "recent", label: "Recent", icon: Clock },
  { id: "starred", label: "Starred", icon: Star },
  { id: "shared", label: "Shared with me", icon: Users },
];

export function SheetsSidebar({
  workbooks,
  activeWorkbookId,
  location,
  onLocationChange,
  onSelectWorkbook,
  onNewWorkbook,
}: {
  workbooks: Workbook[];
  activeWorkbookId: string;
  location: SheetsLocation;
  onLocationChange: (location: SheetsLocation) => void;
  onSelectWorkbook: (workbookId: string) => void;
  onNewWorkbook?: () => void;
}) {
  const filteredWorkbooks = useMemo(() => {
    switch (location) {
      case "starred":
        return workbooks.filter((workbook) => workbook.starred);
      case "shared":
        return workbooks.filter((workbook) => workbook.shared);
      case "recent":
        return [...workbooks].slice(0, 6);
      default:
        return workbooks;
    }
  }, [location, workbooks]);

  const starredWorkbooks = workbooks.filter((workbook) => workbook.starred);

  const sections =
    location === "home"
      ? [
          ...(starredWorkbooks.length > 0
            ? [
                {
                  id: "starred",
                  title: "Starred",
                  items: starredWorkbooks.map((workbook) => ({
                    id: workbook.id,
                    label: workbook.title,
                    trailing: workbook.meta,
                    leading: <Grid3X3 size={15} strokeWidth={1.75} />,
                    active: workbook.id === activeWorkbookId,
                    onClick: () => onSelectWorkbook(workbook.id),
                  })),
                },
              ]
            : []),
          {
            id: "recent",
            title: "Recent spreadsheets",
            items: filteredWorkbooks.map((workbook) => ({
              id: workbook.id,
              label: workbook.title,
              trailing: workbook.shared ? workbook.owner ?? "Shared" : workbook.meta,
              leading: <Grid3X3 size={15} strokeWidth={1.75} />,
              active: workbook.id === activeWorkbookId,
              onClick: () => onSelectWorkbook(workbook.id),
            })),
          },
        ]
      : [
          {
            id: location,
            title: LOCATIONS.find((item) => item.id === location)?.label ?? "Spreadsheets",
            items: filteredWorkbooks.map((workbook) => ({
              id: workbook.id,
              label: workbook.title,
              trailing: workbook.meta,
              leading: <Grid3X3 size={15} strokeWidth={1.75} />,
              active: workbook.id === activeWorkbookId,
              onClick: () => onSelectWorkbook(workbook.id),
            })),
          },
        ];

  return (
    <NavSidebar
      primaryAction={
        onNewWorkbook
          ? { label: "New spreadsheet", icon: Plus, onClick: onNewWorkbook }
          : undefined
      }
      quickLinks={LOCATIONS.map((item) => {
        const Icon = item.icon;
        return {
          id: item.id,
          label: item.label,
          icon: Icon,
          active: location === item.id,
          onClick: () => onLocationChange(item.id),
        };
      })}
      sections={sections}
    />
  );
}
