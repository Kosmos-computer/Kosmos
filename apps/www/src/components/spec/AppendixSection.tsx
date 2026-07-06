import { decisionSummary } from "../../content/spec-content";
import shared from "../../styles/shared.module.css";
import styles from "./AppendixSection.module.css";

export function AppendixSection() {
  return (
    <section id="appendix" className={styles.section}>
      <div className={shared.sectionHeader}>
        <p className={shared.sectionEyebrow}>Appendix</p>
        <h2 className={shared.sectionTitle}>Every decision, one line each</h2>
      </div>

      <div className={shared.card}>
        <dl className={styles.list}>
          {decisionSummary.map((entry) => (
            <div key={entry.question} className={styles.row}>
              <dt className={styles.question}>{entry.question}</dt>
              <dd className={styles.decision}>{entry.decision}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
