/**
 * ComposerNotice — thin banner docked under the composer card (plan upsells,
 * context warnings, connection status). The card overlaps the notice's top
 * corner radius, so the notice reads as a strip sliding out from beneath it.
 */
import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ComposerNoticeTone = "neutral" | "info" | "warning" | "danger";

export interface ComposerNoticeProps {
  children: ReactNode;
  tone?: ComposerNoticeTone;
  icon?: LucideIcon;
  /** Inline text action, e.g. "New session". */
  actionLabel?: ReactNode;
  onAction?: () => void;
  /** When provided, renders a dismiss button. */
  onDismiss?: () => void;
}

export function ComposerNotice({
  children,
  tone = "neutral",
  icon: Icon,
  actionLabel,
  onAction,
  onDismiss,
}: ComposerNoticeProps) {
  return (
    <div role="status" className={`arco-composer__notice arco-composer__notice--${tone}`}>
      {Icon && (
        <span className="arco-composer__noticeicon" aria-hidden="true">
          <Icon size={13} />
        </span>
      )}
      <span className="arco-composer__noticemsg">{children}</span>
      {actionLabel && (
        <button type="button" className="arco-composer__noticeaction" onClick={onAction}>
          {actionLabel}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          className="arco-composer__noticedismiss"
          aria-label="Dismiss notification"
          onClick={onDismiss}
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
