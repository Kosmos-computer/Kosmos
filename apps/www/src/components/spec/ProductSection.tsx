import {
  antiBloatRules,
  coreSeven,
  engines,
  portabilityLadder,
  primeDirective,
} from "../../content/spec-content";
import shared from "../../styles/shared.module.css";
import styles from "./ProductSection.module.css";

export function ProductSection() {
  return (
    <section id="product" className={styles.section}>
      <div className={shared.sectionHeader}>
        <p className={shared.sectionEyebrow}>Product build strategy</p>
        <h2 className={shared.sectionTitle}>
          The lean flagship app.{" "}
          <span className={shared.sectionTitleMuted}>
            The demo&rsquo;s 50 workspaces are a catalog, not a backlog.
          </span>
        </h2>
      </div>

      <div className={styles.directive}>
        <p className={styles.directiveLabel}>Prime directive</p>
        <p className={styles.directiveBody}>{primeDirective}</p>
        <div className={styles.coreSeven}>
          <span className={styles.coreSevenLabel}>Core seven</span>
          {coreSeven.map((workspace) => (
            <span key={workspace} className={styles.corePill}>
              {workspace}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.columns}>
        <div className={styles.enginesCard}>
          <h3 className={styles.cardTitle}>Engines we mount, not rebuild</h3>
          <ul className={styles.engineList}>
            {engines.map((engine) => (
              <li key={engine.engine} className={styles.engineRow}>
                <span className={styles.engineName}>{engine.engine}</span>
                <span className={styles.engineCapability}>{engine.capability}</span>
                <span className={styles.engineMode}>{engine.mode}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.sideStack}>
          <div className={styles.rulesCard}>
            <h3 className={styles.cardTitle}>Anti-bloat rules</h3>
            <ol className={styles.rulesList}>
              {antiBloatRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </div>

          <div className={styles.ladderCard}>
            <h3 className={styles.cardTitle}>The portability ladder</h3>
            <p className={styles.ladderIntro}>
              One manifest exports to every rung — build an app in Kosmos, use
              it in Claude.
            </p>
            <ol className={styles.ladderList}>
              {portabilityLadder.map((rung) => (
                <li key={rung.rung} className={styles.rung}>
                  <span className={styles.rungIndex}>{rung.rung}</span>
                  <div>
                    <p className={styles.rungLabel}>{rung.label}</p>
                    <p className={styles.rungDetail}>{rung.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
