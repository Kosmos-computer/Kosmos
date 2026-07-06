import { IsometricTile } from "./IsometricTile";
import { features } from "../content/site-content";
import shared from "../styles/shared.module.css";
import styles from "./FeatureSection.module.css";

export function FeatureSection() {
  return (
    <section className={styles.section}>
      <div className={shared.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            The integrated shell for AI-native work.{" "}
            <span className={shared.sectionTitleMuted}>
              You keep context. Agents keep building across workspaces.
            </span>
          </h2>
        </div>

        <div className={styles.grid}>
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={styles.cell}
              data-last-row={index >= features.length - 2 ? "true" : "false"}
            >
              <div className={styles.copy}>
                <h3 className={styles.cellTitle}>{feature.title}</h3>
                <p className={styles.cellBody}>{feature.description}</p>
                <a className={shared.linkArrow} href={feature.href}>
                  {feature.linkLabel}
                  <span aria-hidden="true">→</span>
                </a>
              </div>
              <IsometricTile variant={index} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
