import { Folder, HardDrive, type LucideIcon } from "lucide-react";
import { Menu } from "../../components/Menu";
import { Button, type ButtonVariant } from "../../components/ui";

interface LongformerUploadMenuProps {
  label: string;
  onPickLocal: () => void;
  onPickDrive: () => void;
  icon?: LucideIcon;
  variant?: ButtonVariant;
  disabled?: boolean;
  className?: string;
  align?: "start" | "end";
}

/** Upload entry — choose a local disk file or a file from Arco Files. */
export function LongformerUploadMenu({
  label,
  onPickLocal,
  onPickDrive,
  icon: Icon,
  variant = "primary",
  disabled,
  className,
  align = "end",
}: LongformerUploadMenuProps) {
  return (
    <Menu
      aria-label={label}
      searchable={false}
      align={align}
      portal
      items={[
        {
          id: "local",
          label: "From this computer",
          description: "Choose audio or video from local drive",
          icon: HardDrive,
          onSelect: onPickLocal,
        },
        {
          id: "drive",
          label: "From Files",
          description: "Choose a file already in Arco Files",
          icon: Folder,
          onSelect: onPickDrive,
        },
      ]}
      trigger={
        <Button type="button" variant={variant} disabled={disabled} className={className}>
          {Icon ? <Icon size={14} strokeWidth={1.75} /> : null}
          {label}
        </Button>
      }
    />
  );
}
