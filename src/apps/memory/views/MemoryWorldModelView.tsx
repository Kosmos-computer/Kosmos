import { I18nKey } from "../../../i18n/declaration";
import { T } from "../../../i18n/T";
/**
 * World Model explorer — AQAL quadrant grid, ethics principles with lineage,
 * and the integral ethical reasoning protocol. Prototype v0; see docs/world-model-plan.md.
 */
import { useMemo, useState } from "react";
import type {
  EthicalPrinciple,
  IdentityDocument,
  IdentitySection,
  IntegralQuadrant,
  WorldModelEdge,
  WorldModelNode,
} from "../types";
import { QUADRANT_LABELS } from "../worldModelData";

export interface MemoryWorldModelViewProps {
  worldview: IdentityDocument;
  integralMap: IdentityDocument;
  ethics: IdentityDocument;
  principles: EthicalPrinciple[];
  nodes: WorldModelNode[];
  edges: WorldModelEdge[];
}

const QUADRANTS: IntegralQuadrant[] = ["I", "We", "It", "Its"];

function sectionById(sections: IdentitySection[], id: string): IdentitySection | undefined {
  return sections.find((s) => s.id === id);
}

function allSections(props: MemoryWorldModelViewProps): IdentitySection[] {
  return [...props.worldview.sections, ...props.integralMap.sections, ...props.ethics.sections];
}

export function MemoryWorldModelView(props: MemoryWorldModelViewProps) {
  const [activeQuadrant, setActiveQuadrant] = useState<IntegralQuadrant | null>(null);
  const sections = allSections(props);

  const protocol = props.integralMap.sections.find((s) => s.id === "im-protocol");

  const filteredSections = useMemo(() => {
    if (!activeQuadrant) return [];
    return sections.filter((s) => s.quadrant === activeQuadrant);
  }, [activeQuadrant, sections]);

  const filteredPrinciples = useMemo(() => {
    if (!activeQuadrant) return props.principles;
    return props.principles.filter((p) => p.appliesIn?.includes(activeQuadrant));
  }, [activeQuadrant, props.principles]);

  function lineageLabel(sectionId: string): string {
    const section = sectionById(sections, sectionId);
    if (section) return section.heading;
    const node = props.nodes.find((n) => n.id === sectionId);
    return node?.label ?? sectionId;
  }

  return (
    <div className="arco-memory-view arco-memory-view--world-model">
      <header className="arco-memory-view__header">
        <h1 className="arco-memory-view__title"><T k={I18nKey.APPS$MEMORY_WORLD_MODEL} /></h1>
        <p className="arco-memory-view__subtitle"><T k={I18nKey.APPS$MEMORY_INTEGRAL_MAP_OF_WORLDVIEW_ETHICS_AND_REASONING_PROTOCOL_} /></p>
      </header>

      <section className="arco-memory-section">
        <h2 className="arco-memory-section__title"><T k={I18nKey.APPS$MEMORY_AQAL_QUADRANTS} /></h2>
        <p className="arco-memory-section__hint"><T k={I18nKey.APPS$MEMORY_SELECT_A_QUADRANT_TO_FILTER_SECTIONS_AND_PRINCIPLES_CLIC} /></p>
        <div className="arco-world-model__quadrants">
          {QUADRANTS.map((q) => (
            <button
              key={q}
              type="button"
              className={`arco-world-model__quadrant${activeQuadrant === q ? " arco-world-model__quadrant--active" : ""}`}
              onClick={() => setActiveQuadrant(activeQuadrant === q ? null : q)}
              aria-pressed={activeQuadrant === q}
            >
              <span className="arco-world-model__quadrant-label">{QUADRANT_LABELS[q].short}</span>
              <span className="arco-world-model__quadrant-full">{QUADRANT_LABELS[q].full}</span>
            </button>
          ))}
        </div>
      </section>

      {protocol ? (
        <section className="arco-memory-section">
          <h2 className="arco-memory-section__title"><T k={I18nKey.APPS$MEMORY_ETHICAL_REASONING_PROTOCOL} /></h2>
          <pre className="arco-world-model__protocol">{protocol.content}</pre>
        </section>
      ) : null}

      {activeQuadrant && filteredSections.length > 0 ? (
        <section className="arco-memory-section">
          <h2 className="arco-memory-section__title"><T k={I18nKey.APPS$MEMORY_SECTIONS_IN} />{QUADRANT_LABELS[activeQuadrant].full}
          </h2>
          <ul className="arco-memory-list">
            {filteredSections.map((section) => (
              <li key={section.id} className="arco-memory-list__row arco-memory-list__row--stacked">
                <span className="arco-memory-list__primary">{section.heading}</span>
                <span className="arco-memory-list__meta">
                  {section.domain ?? "—"} · {section.confidence ?? "—"}
                </span>
                <span className="arco-memory-list__preview">{section.content}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="arco-memory-section">
        <h2 className="arco-memory-section__title"><T k={I18nKey.APPS$MEMORY_ETHICS_PRINCIPLES} />{activeQuadrant ? ` (${QUADRANT_LABELS[activeQuadrant].short})` : ""}
        </h2>
        <ul className="arco-world-model__principles">
          {filteredPrinciples.map((principle) => (
            <li key={principle.id} className="arco-world-model__principle">
              <div className="arco-world-model__principle-head">
                <span className="arco-world-model__principle-priority">P{principle.priority}</span>
                <span className="arco-world-model__principle-statement">{principle.statement}</span>
              </div>
              {principle.derivedFrom.length > 0 ? (
                <div className="arco-world-model__lineage">
                  <span className="arco-world-model__lineage-label"><T k={I18nKey.APPS$MEMORY_DERIVED_FROM} /></span>
                  {principle.derivedFrom.map((id) => (
                    <span key={id} className="arco-world-model__lineage-chip">
                      {lineageLabel(id)}
                    </span>
                  ))}
                </div>
              ) : null}
              {principle.appliesIn && principle.appliesIn.length > 0 ? (
                <div className="arco-world-model__applies">
                  {principle.appliesIn.map((q) => (
                    <span key={q} className="arco-world-model__quadrant-chip">
                      {q}
                    </span>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="arco-memory-section">
        <h2 className="arco-memory-section__title"><T k={I18nKey.APPS$MEMORY_LINEAGE_GRAPH} /></h2>
        <ul className="arco-memory-list">
          {props.edges.map((edge) => {
            const from = props.nodes.find((n) => n.id === edge.fromId);
            const to = props.nodes.find((n) => n.id === edge.toId);
            return (
              <li key={edge.id} className="arco-memory-list__row">
                <span className="arco-memory-list__primary">
                  {from?.label ?? edge.fromId} → {to?.label ?? edge.toId}
                </span>
                <span className="arco-memory-list__meta">
                  {edge.relation} · {(edge.weight * 100).toFixed(0)}%
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
