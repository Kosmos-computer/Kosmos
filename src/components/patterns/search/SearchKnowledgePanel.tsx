import type { SearchKnowledgePanel as SearchKnowledgePanelType } from "./searchTypes";

export interface SearchKnowledgePanelProps {
  panel: SearchKnowledgePanelType;
  onRelatedClick?: (term: string) => void;
}

export function SearchKnowledgePanel({ panel, onRelatedClick }: SearchKnowledgePanelProps) {
  return (
    <aside className="arco-search-knowledge" aria-label="Knowledge panel">
      {panel.imageUrl ? (
        <div className="arco-search-knowledge__hero">
          <img src={panel.imageUrl} alt="" />
        </div>
      ) : null}
      <div className="arco-search-knowledge__body">
        <h2>{panel.title}</h2>
        {panel.subtitle ? <p className="arco-search-knowledge__subtitle">{panel.subtitle}</p> : null}
        <p className="arco-search-knowledge__summary">{panel.summary}</p>
        {panel.facts && panel.facts.length > 0 ? (
          <dl className="arco-search-knowledge__facts">
            {panel.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {panel.related && panel.related.length > 0 ? (
          <div className="arco-search-knowledge__related">
            <h3>People also search for</h3>
            <ul>
              {panel.related.map((term) => (
                <li key={term}>
                  <button type="button" onClick={() => onRelatedClick?.(term)}>
                    {term}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
