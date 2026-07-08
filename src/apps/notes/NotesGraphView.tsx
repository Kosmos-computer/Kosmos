import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { useMemo } from "react";
import { Link2 } from "lucide-react";
import { Badge } from "../../components/ui";
import { useForceLayout } from "./useForceLayout";
import type { NotesGraphEdge, NotesGraphNode } from "./types";

export interface NotesGraphViewProps {
  nodes: NotesGraphNode[];
  edges: NotesGraphEdge[];
  activeNoteId?: string;
  activeNoteTitle?: string;
  onNodeClick?: (noteId: string) => void;
  compact?: boolean;
}

function GraphCanvas({
  nodes,
  edges,
  activeNoteId,
  onNodeClick,
  compact,
}: {
  nodes: NotesGraphNode[];
  edges: NotesGraphEdge[];
  activeNoteId?: string;
  onNodeClick?: (noteId: string) => void;
  compact?: boolean;
}) {
  const layoutNodes = useForceLayout(nodes, edges, activeNoteId);

  const linkedIds = useMemo(() => {
    if (!activeNoteId) return new Set<string>();
    const ids = new Set<string>([activeNoteId]);
    for (const edge of edges) {
      if (edge.from === activeNoteId) ids.add(edge.to);
      if (edge.to === activeNoteId) ids.add(edge.from);
    }
    return ids;
  }, [edges, activeNoteId]);

  const maxConnections = Math.max(1, ...layoutNodes.map((node) => node.connections));

  return (
    <div
      className={["arco-notes-graph__canvas", compact ? "arco-notes-graph__canvas--compact" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-label={i18n.t(I18nKey.APPS$NOTES_NOTES_GRAPH_VISUALIZATION)}
    >
      <svg className="arco-notes-graph__edges" aria-hidden="true">
        {edges.map((edge) => {
          const from = layoutNodes.find((node) => node.id === edge.from);
          const to = layoutNodes.find((node) => node.id === edge.to);
          if (!from || !to) return null;
          const isActiveEdge = activeNoteId && (edge.from === activeNoteId || edge.to === activeNoteId);
          return (
            <line
              key={edge.id}
              x1={`${from.x}%`}
              y1={`${from.y}%`}
              x2={`${to.x}%`}
              y2={`${to.y}%`}
              className={[
                "arco-notes-graph__edge",
                isActiveEdge ? "arco-notes-graph__edge--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />
          );
        })}
      </svg>

      {layoutNodes.map((node) => {
        const isActive = node.id === activeNoteId;
        const isLinked = linkedIds.has(node.id);
        const isEvergreen = node.tags?.includes("evergreen");
        const size = 6 + (node.connections / maxConnections) * 10;

        return (
          <button
            key={node.id}
            type="button"
            className={[
              "arco-notes-graph__node",
              isActive ? "arco-notes-graph__node--active" : "",
              isLinked && !isActive ? "arco-notes-graph__node--linked" : "",
              isEvergreen ? "arco-notes-graph__node--evergreen" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ left: `${node.x}%`, top: `${node.y}%`, width: size, height: size }}
            title={node.label}
            aria-label={`${node.label}, ${node.connections} connections`}
            aria-current={isActive ? "true" : undefined}
            onClick={() => onNodeClick?.(node.id)}
          />
        );
      })}
    </div>
  );
}

/** Obsidian-style force-directed graph of note links and backlinks. */
export function NotesGraphView({
  nodes,
  edges,
  activeNoteId,
  activeNoteTitle,
  onNodeClick,
  compact = false,
}: NotesGraphViewProps) {
  const avgDegree = nodes.length > 0 ? (edges.length * 2) / nodes.length : 0;

  if (compact) {
    return (
      <div className="arco-notes-graph arco-notes-graph--compact">
        <header className="arco-notes-graph__compact-header">
          <span className="arco-notes-graph__compact-title"><T k={I18nKey.APPS$NOTES_GRAPH_OF} />{activeNoteTitle ?? "vault"}</span>
          <Badge>{nodes.length}<T k={I18nKey.APPS$NOTES_NOTES_2} /></Badge>
        </header>
        <GraphCanvas
          nodes={nodes}
          edges={edges}
          activeNoteId={activeNoteId}
          onNodeClick={onNodeClick}
          compact
        />
        <p className="arco-notes-graph__compact-hint"><T k={I18nKey.APPS$NOTES_CLICK_A_NODE_TO_OPEN_THAT_NOTE_GREEN_HIGHLIGHTS_SHOW_LIN} /></p>
      </div>
    );
  }

  return (
    <div className="arco-notes-graph arco-scroll">
      <header className="arco-notes-graph__header">
        <h1 className="arco-notes-graph__title"><T k={I18nKey.APPS$NOTES_GRAPH_VIEW} /></h1>
        <p className="arco-notes-graph__subtitle"><T k={I18nKey.APPS$NOTES_EXPLORE_CONNECTIONS_BETWEEN_NOTES_DERIVED_FROM_WIKILINKS} /></p>
      </header>

      <div className="arco-notes-graph__layout">
        <div className="arco-notes-graph__card">
          <GraphCanvas nodes={nodes} edges={edges} activeNoteId={activeNoteId} onNodeClick={onNodeClick} />
        </div>

        <aside className="arco-notes-graph__sidebar">
          <h2 className="arco-notes-graph__section-title"><T k={I18nKey.APPS$NOTES_VAULT_STATS} /></h2>
          <div className="arco-notes-graph__stats">
            <div className="arco-notes-graph__stat">
              <span className="arco-notes-graph__stat-value">{nodes.length}</span>
              <span className="arco-notes-graph__stat-label"><T k={I18nKey.APPS$NOTES_NOTES} /></span>
            </div>
            <div className="arco-notes-graph__stat">
              <span className="arco-notes-graph__stat-value">{edges.length}</span>
              <span className="arco-notes-graph__stat-label"><T k={I18nKey.APPS$NOTES_LINKS} /></span>
            </div>
            <div className="arco-notes-graph__stat">
              <span className="arco-notes-graph__stat-value">{avgDegree.toFixed(1)}</span>
              <span className="arco-notes-graph__stat-label"><T k={I18nKey.APPS$NOTES_AVG_DEGREE} /></span>
            </div>
          </div>

          <h2 className="arco-notes-graph__section-title"><T k={I18nKey.APPS$NOTES_NOTES} /></h2>
          <div className="arco-notes-graph__node-list">
            {nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                className={[
                  "arco-notes-graph__node-row",
                  node.id === activeNoteId ? "arco-notes-graph__node-row--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onNodeClick?.(node.id)}
              >
                <span
                  className={[
                    "arco-notes-graph__node-dot",
                    node.tags?.includes("evergreen") ? "arco-notes-graph__node-dot--evergreen" : "",
                    node.id === activeNoteId ? "arco-notes-graph__node-dot--active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
                <div className="arco-notes-graph__node-info">
                  <div className="arco-notes-graph__node-name">{node.label}</div>
                  <div className="arco-notes-graph__node-meta">{node.connections}<T k={I18nKey.APPS$NOTES_CONNECTIONS} /></div>
                </div>
                {node.tags?.[0] ? <Badge>{node.tags[0]}</Badge> : null}
              </button>
            ))}
          </div>

          <h2 className="arco-notes-graph__section-title"><T k={I18nKey.APPS$NOTES_RECENT_LINKS} /></h2>
          <div className="arco-notes-graph__edge-list">
            {edges.slice(0, 6).map((edge) => (
              <div key={edge.id} className="arco-notes-graph__edge-row">
                <Link2 size={12} aria-hidden="true" />
                <span>
                  {nodes.find((node) => node.id === edge.from)?.label ?? edge.from}
                  <span className="arco-notes-graph__edge-arrow"> → </span>
                  {nodes.find((node) => node.id === edge.to)?.label ?? edge.to}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
