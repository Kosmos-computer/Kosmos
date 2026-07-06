import {
  currentState,
  nonNegotiables,
  takeaway,
  type AssessmentVerdict,
} from "../../content/spec-content";
import shared from "../../styles/shared.module.css";
import styles from "./FoundationSection.module.css";

const verdictLabels: Record<AssessmentVerdict, string> = {
  keep: "Keep",
  warn: "Rework",
  gap: "Missing",
};

export function FoundationSection() {
  return (
    <section id="foundation" className={styles.section}>
      <div className={shared.card}>
        <div className={styles.header}>
          <p className={shared.sectionEyebrow}>Goals &amp; current state</p>
          <h2 className={styles.title}>
            Four non-negotiables.{" "}
            <span className={shared.sectionTitleMuted}>
              Every decision in this spec traces back to one of them.
            </span>
          </h2>
        </div>

        <div className={styles.grid}>
          {nonNegotiables.map((item, index) => (
            <article
              key={item.title}
              className={styles.cell}
              data-last-row={index >= nonNegotiables.length - 2 ? "true" : "false"}
            >
              <span className={styles.cellIndex}>{`0${index + 1}`}</span>
              <div>
                <h3 className={styles.cellTitle}>{item.title}</h3>
                <p className={styles.cellBody}>{item.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.assessment}>
          <h3 className={styles.assessmentTitle}>Where the kit stands today</h3>
          <ul className={styles.assessmentList}>
            {currentState.map((row) => (
              <li key={row.layer} className={styles.assessmentRow}>
                <span className={styles.assessmentLayer}>{row.layer}</span>
                <span className={styles.assessmentToday}>{row.today}</span>
                <span className={styles.assessmentNote}>{row.note}</span>
                <span className={styles.verdict} data-verdict={row.verdict}>
                  {verdictLabels[row.verdict]}
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.takeaway}>{takeaway}</p>
        </div>
      </div>
    </section>
  );
}
