import {
  adoptionPillars,
  scorecard,
  scorecardStatusLabels,
} from "../../content/spec-content";
import shared from "../../styles/shared.module.css";
import styles from "./AdoptionSection.module.css";

export function AdoptionSection() {
  const partialCount = scorecard.filter((item) => item.status === "partial").length;

  return (
    <section id="adoption" className={styles.section}>
      <div className={shared.sectionHeader}>
        <p className={shared.sectionEyebrow}>Adoption &amp; standardization</p>
        <h2 className={shared.sectionTitle}>
          A library gets used.{" "}
          <span className={shared.sectionTitleMuted}>
            A standard gets implemented by other people.
          </span>
        </h2>
      </div>

      <div className={styles.pillars}>
        {adoptionPillars.map((pillar) => (
          <article key={pillar.title} className={styles.pillar}>
            <h3 className={styles.pillarTitle}>{pillar.title}</h3>
            <p className={styles.pillarBody}>{pillar.body}</p>
          </article>
        ))}
      </div>

      <div className={styles.scorecard}>
        <div className={styles.scorecardHeader}>
          <h3 className={styles.scorecardTitle}>Standard-readiness scorecard</h3>
          <p className={styles.scorecardMeta}>
            {partialCount} of {scorecard.length} underway — the honest baseline this
            roadmap works against.
          </p>
        </div>
        <ul className={styles.scorecardList}>
          {scorecard.map((item) => (
            <li key={item.label} className={styles.scoreItem} data-status={item.status}>
              <span className={styles.scoreDot} aria-hidden="true" />
              <span className={styles.scoreLabel}>{item.label}</span>
              <span className={styles.scoreStatus}>
                {scorecardStatusLabels[item.status]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
