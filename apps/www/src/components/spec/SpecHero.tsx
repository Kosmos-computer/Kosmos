import { specMeta } from "../../content/spec-content";
import shared from "../../styles/shared.module.css";
import styles from "./SpecHero.module.css";

const stats = [
  { value: "8", label: "Key decisions" },
  { value: "4", label: "Component tiers" },
  { value: "59 → 1", label: "Blocks → registry" },
  { value: "5", label: "Roadmap phases" },
] as const;

export function SpecHero() {
  return (
    <section className={styles.hero}>
      <div className={shared.sectionNarrow}>
        <div className={styles.content}>
          <p className={styles.eyebrow}>{specMeta.eyebrow}</p>
          <h1 className={styles.title}>{specMeta.title}</h1>
          <p className={styles.description}>{specMeta.description}</p>
          <div className={styles.actions}>
            <a className={shared.buttonPrimary} href="#roadmap">
              Jump to the roadmap
              <span aria-hidden="true">→</span>
            </a>
            <a className={shared.buttonSecondary} href="#decisions">
              Read the decisions
            </a>
          </div>
          <p className={styles.positioning}>
            &ldquo;{specMeta.positioning}&rdquo;
          </p>
        </div>
      </div>

      <div className={styles.statsWrap}>
        <dl className={styles.stats}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.stat}>
              <dd className={styles.statValue}>{stat.value}</dd>
              <dt className={styles.statLabel}>{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
