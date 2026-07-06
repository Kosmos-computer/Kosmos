/**
 * Shared markdown pipeline — prose, widget fences, inline directives, and
 * optional openui-lang blocks (docs/rich-content-widgets-plan.md Phase 1–2).
 */
import { useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Renderer, type ActionEvent } from "@openuidev/react-lang";
import { ThemeProvider } from "@openuidev/react-ui";
import { openuiChatLibrary } from "@openuidev/react-ui/genui-lib";
import { validateWidgetSource } from "@shared/widgets/validate";
import { parseSegments, splitInlineWidgets } from "./parseSegments";
import { markdownComponents } from "./markdownComponents";
import { useOsStore } from "../../os/osStore";
import { WidgetFallback, WidgetView } from "./WidgetView";

export interface RichMarkdownOpenUiOptions {
  streaming?: boolean;
  onAction?: (event: ActionEvent) => void;
}

interface Props {
  text: string;
  className?: string;
  /** When omitted, openui-lang fences render as labeled code blocks. */
  openui?: RichMarkdownOpenUiOptions;
}

function MarkdownChunk({ content }: { content: string }) {
  const parts = splitInlineWidgets(content);
  return (
    <>
      {parts.map((part, i) =>
        part.kind === "text" ? (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {part.content}
          </ReactMarkdown>
        ) : (
          <WidgetSegment key={i} source={JSON.stringify(part.payload, null, 2)} />
        ),
      )}
    </>
  );
}

function WidgetSegment({ source, open }: { source: string; open?: boolean }) {
  if (open) {
    return (
      <div className="arco-widget arco-widget--streaming">
        <div className="arco-widget__error-label">Widget (streaming…)</div>
        <pre className="arco-richmd__pre">{source.trim() || "…"}</pre>
      </div>
    );
  }

  const result = validateWidgetSource(source);
  if (result.ok) {
    return <WidgetView instance={result.instance} def={result.def} />;
  }
  return (
    <WidgetFallback error={result.error} markdown={result.fallbackMarkdown} source={source} />
  );
}

export function RichMarkdown({ text, className = "arco-richmd", openui }: Props) {
  const segments = parseSegments(text);
  const osTheme = useOsStore((s) => s.theme);

  const handleAction = useCallback(
    (event: ActionEvent) => {
      if (event.type === "open_url" && typeof event.params?.url === "string") {
        window.open(event.params.url, "_blank", "noopener");
        return;
      }
      openui?.onAction?.(event);
    },
    [openui],
  );

  return (
    <div className={className}>
      {segments.map((segment, i) => {
        switch (segment.type) {
          case "markdown":
            return (
              <div key={i} className="arco-richmd__chunk">
                <MarkdownChunk content={segment.content} />
              </div>
            );
          case "widget":
            return (
              <div key={i} className="arco-richmd__chunk">
                <WidgetSegment source={segment.content} open={segment.open} />
              </div>
            );
          case "openui":
            if (openui) {
              return (
                <div key={i} className="arco-richmd__genui">
                  <ThemeProvider mode={osTheme}>
                    <Renderer
                      response={segment.content}
                      library={openuiChatLibrary}
                      isStreaming={segment.open && !!openui.streaming}
                      onAction={handleAction}
                    />
                  </ThemeProvider>
                </div>
              );
            }
            return (
              <div key={i} className="arco-richmd__chunk">
                <pre className="arco-richmd__pre">
                  <code className="language-openui-lang">{segment.content.trim()}</code>
                </pre>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export { parseSegments } from "./parseSegments";
