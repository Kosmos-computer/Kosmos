import { roadmapPhases, roadmapStatusLabels } from "../../content/spec-content";
import shared from "../../styles/shared.module.css";
import styles from "./RoadmapSection.module.css";

export function RoadmapSection() {
  return (
    <section id="roadmap" className={styles.section}>
      <div className={shared.sectionHeader}>
        <p className={shared.sectionEyebrow}>Roadmap</p>
        <h2 className={shared.sectionTitle}>
          From prototype to standard.{" "}
          <span className={shared.sectionTitleMuted}>
            Each phase ships on its own; nothing waits on the endgame.
          </span>
        </h2>
      </div>

      <ol className={styles.timeline}>
        {roadmapPhases.map((phase) => (
          <li key={phase.id} className={styles.phase} data-status={phase.status}>
            <div className={styles.rail} aria-hidden="true">
              <span className={styles.dot} />
              <span className={styles.line} />
            </div>

            <article className={styles.card}>
              <header className={styles.cardHeader}>
                <span className={styles.marker}>{phase.marker}</span>
                <span className={styles.status}>
                  {roadmapStatusLabels[phase.status]}
                </span>
              </header>
              <h3 className={styles.cardTitle}>{phase.title}</h3>
              <p className={styles.timeframe}>{phase.timeframe}</p>
              <p className={styles.summary}>{phase.summary}</p>
              <ul className={styles.items}>
                {phase.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
