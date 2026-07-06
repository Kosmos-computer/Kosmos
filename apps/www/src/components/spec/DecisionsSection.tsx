import { decisions } from "../../content/spec-content";
import shared from "../../styles/shared.module.css";
import styles from "./DecisionsSection.module.css";

export function DecisionsSection() {
  return (
    <section id="decisions" className={styles.section}>
      <div className={shared.sectionHeader}>
        <p className={shared.sectionEyebrow}>Key decisions · D1–D8</p>
        <h2 className={shared.sectionTitle}>
          Eight decisions, one direction.{" "}
          <span className={shared.sectionTitleMuted}>
            Compose with the winning specs; own the component-contract layer.
          </span>
        </h2>
      </div>

      <div className={styles.grid}>
        {decisions.map((decision) => (
          <article key={decision.id} className={styles.card}>
            <header className={styles.cardHeader}>
              <span className={styles.cardId}>{decision.id}</span>
              <span className={styles.cardTopic}>{decision.topic}</span>
            </header>
            <h3 className={styles.cardTitle}>{decision.title}</h3>
            <p className={styles.cardOneLiner}>{decision.oneLiner}</p>
            <ul className={styles.cardPoints}>
              {decision.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
