import { I18nKey } from "../../i18n/declaration";
import { T } from "../../i18n/T";
/**
 * Error bubble with a three-line preview and View more/less for long messages.
 */
import { useLayoutEffect, useRef, useState } from "react";

export interface ChatErrorBlockProps {
  text: string;
}

export function ChatErrorBlock({ text }: ChatErrorBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    setExpanded(false);
  }, [text]);

  useLayoutEffect(() => {
    if (expanded) return;
    const el = textRef.current;
    if (!el) return;

    const measure = () => {
      setTruncated(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className="arco-chat__error">
      <p
        ref={textRef}
        className={`arco-chat__error-text${expanded ? "" : " arco-chat__error-text--clamped"}`}
      >
        {text}
      </p>
      {truncated && !expanded ? (
        <button type="button" className="arco-chat__error-toggle" onClick={() => setExpanded(true)}><T k={I18nKey.COMPONENTS$CHAT_VIEW_MORE} /></button>
      ) : null}
      {truncated && expanded ? (
        <button type="button" className="arco-chat__error-toggle" onClick={() => setExpanded(false)}><T k={I18nKey.COMPONENTS$CHAT_VIEW_LESS} /></button>
      ) : null}
    </div>
  );
}
