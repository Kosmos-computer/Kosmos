import type {
  IdentityDocument,
  MemoryCollection,
  MemoryEdge,
  MemoryWorkspaceData,
  RagChunkPreview,
  RagQueryTrace,
} from "../types";

export function MemoryPlaceholderView({ title, description }: { title: string; description: string }) {
  return (
    <div className="arco-memory-view arco-memory-view--placeholder">
      <h1 className="arco-memory-view__title">{title}</h1>
      <p className="arco-memory-view__subtitle">{description}</p>
      <p className="arco-memory-view__stub">Stub view — wired in Phase 2–3.</p>
    </div>
  );
}

export function MemoryGraphView({
  nodes,
  edges,
}: {
  nodes: MemoryWorkspaceData["graphNodes"];
  edges: MemoryEdge[];
}) {
  return (
    <div className="arco-memory-view">
      <header className="arco-memory-view__header">
        <h1 className="arco-memory-view__title">Knowledge graph</h1>
        <p className="arco-memory-view__subtitle">
          Relations between entities, concepts, and memory entries ({nodes.length} nodes, {edges.length} edges).
        </p>
      </header>
      <ul className="arco-memory-list">
        {edges.map((edge) => {
          const from = nodes.find((node) => node.id === edge.fromId)?.label ?? edge.fromId;
          const to = nodes.find((node) => node.id === edge.toId)?.label ?? edge.toId;
          return (
            <li key={edge.id} className="arco-memory-list__row">
              <span className="arco-memory-list__primary">
                {from} → {to}
              </span>
              <span className="arco-memory-list__meta">
                {edge.relation} · {(edge.weight * 100).toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MemoryRagView({
  queries,
  chunks,
}: {
  queries: RagQueryTrace[];
  chunks: RagChunkPreview[];
}) {
  return (
    <div className="arco-memory-view">
      <header className="arco-memory-view__header">
        <h1 className="arco-memory-view__title">RAG pipeline</h1>
        <p className="arco-memory-view__subtitle">Recent retrieval traces and top chunks.</p>
      </header>
      <section className="arco-memory-section">
        <h2 className="arco-memory-section__title">Recent queries</h2>
        <ul className="arco-memory-list">
          {queries.map((query) => (
            <li key={query.id} className="arco-memory-list__row arco-memory-list__row--stacked">
              <span className="arco-memory-list__primary">{query.query}</span>
              <span className="arco-memory-list__meta">
                {query.timestamp} · {query.latencyMs}ms · {query.chunksRetrieved} chunks
              </span>
              <span className="arco-memory-list__preview">{query.answerPreview}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="arco-memory-section">
        <h2 className="arco-memory-section__title">Sample chunks</h2>
        <ul className="arco-memory-list">
          {chunks.map((chunk) => (
            <li key={chunk.id} className="arco-memory-list__row arco-memory-list__row--stacked">
              <span className="arco-memory-list__primary">{chunk.source}</span>
              <span className="arco-memory-list__meta">
                score {(chunk.score * 100).toFixed(0)}% · {chunk.tokens} tokens
              </span>
              <span className="arco-memory-list__preview">{chunk.content}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function MemoryVectorView({ collections }: { collections: MemoryCollection[] }) {
  return (
    <div className="arco-memory-view">
      <header className="arco-memory-view__header">
        <h1 className="arco-memory-view__title">Vector database</h1>
        <p className="arco-memory-view__subtitle">Embedding collections powering semantic search and RAG.</p>
      </header>
      <ul className="arco-memory-list">
        {collections.map((collection) => (
          <li key={collection.id} className="arco-memory-list__row arco-memory-list__row--stacked">
            <span className="arco-memory-list__primary">{collection.name}</span>
            <span className="arco-memory-list__meta">
              {collection.vectorCount.toLocaleString()} vectors · {collection.dimensions}d · {collection.health} ·{" "}
              {collection.backendId}
            </span>
            {collection.description ? (
              <span className="arco-memory-list__preview">{collection.description}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MemoryIdentityView({ document }: { document: IdentityDocument }) {
  return (
    <div className="arco-memory-view">
      <header className="arco-memory-view__header">
        <h1 className="arco-memory-view__title">{document.title}</h1>
        <p className="arco-memory-view__subtitle">
          {document.filename} · v{document.version} · edited {document.lastEdited}
        </p>
      </header>
      {document.sections.map((section) => (
        <section key={section.id} className="arco-memory-section">
          <div className="arco-memory-section__head">
            <h2 className="arco-memory-section__title">{section.heading}</h2>
            {(section.quadrant || section.domain || section.confidence) && (
              <div className="arco-memory-section__badges">
                {section.quadrant ? (
                  <span className="arco-memory-section__badge">{section.quadrant}</span>
                ) : null}
                {section.domain ? (
                  <span className="arco-memory-section__badge">{section.domain}</span>
                ) : null}
                {section.confidence ? (
                  <span className="arco-memory-section__badge arco-memory-section__badge--confidence">
                    {section.confidence}
                  </span>
                ) : null}
              </div>
            )}
          </div>
          <p className="arco-memory-section__body">{section.content}</p>
        </section>
      ))}
    </div>
  );
}
