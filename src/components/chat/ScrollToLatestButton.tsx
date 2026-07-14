/**
 * Circular jump control that floats above the composer when the thread is
 * scrolled away from the latest message. Clicking smooth-scrolls to the end.
 */
import { ArrowDown } from "lucide-react";
import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";

export interface ScrollToLatestButtonProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollToLatestButton({ visible, onClick }: ScrollToLatestButtonProps) {
  if (!visible) return null;

  return (
    <button
      type="button"
      className="arco-chat__jump-latest"
      onClick={onClick}
      aria-label={i18n.t(I18nKey.APPS$CHAT_SCROLL_TO_LATEST)}
    >
      <ArrowDown size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
