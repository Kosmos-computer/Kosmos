import {
  contractOutputs,
  contractSnippet,
  generationFlow,
  tiers,
} from "../../content/spec-content";
import shared from "../../styles/shared.module.css";
import styles from "./SpecArchitectureSection.module.css";

export function SpecArchitectureSection() {
  return (
    <section id="architecture" className={styles.section}>
      <div className={shared.sectionHeader}>
        <p className={shared.sectionEyebrow}>Architecture</p>
        <h2 className={shared.sectionTitle}>
          Four tiers, one contract.{" "}
          <span className={shared.sectionTitleMuted}>
            One block manifest drives everything — with zero drift.
          </span>
        </h2>
      </div>

      <div className={shared.card}>
        <div className={styles.tiers}>
          {tiers.map((tier) => (
            <div key={tier.tier} className={styles.tier}>
              <span className={styles.tierBadge}>{tier.tier}</span>
              <div>
                <h3 className={styles.tierName}>{tier.name}</h3>
                <p className={styles.tierDetail}>{tier.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.contract}>
          <div className={styles.codeCard}>
            <div className={styles.codeChrome}>
              <span className={styles.codeDot} />
              <span className={styles.codeDot} />
              <span className={styles.codeDot} />
              <span className={styles.codeLabel}>registry/statCards.tsx</span>
            </div>
            <pre className={styles.code}>
              <code>{contractSnippet}</code>
            </pre>
          </div>

          <div className={styles.outputs}>
            <p className={styles.outputsTitle}>From this one object, generated:</p>
            <ol className={styles.outputsList}>
              {contractOutputs.map((output, index) => (
                <li key={output.label} className={styles.output}>
                  <span className={styles.outputIndex}>{index + 1}</span>
                  <div>
                    <p className={styles.outputLabel}>{output.label}</p>
                    <p className={styles.outputDetail}>{output.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className={styles.flow}>
          <p className={styles.flowTitle}>AI generation flow</p>
          <ol className={styles.flowList}>
            {generationFlow.map((step, index) => (
              <li key={step.step} className={styles.flowStep}>
                <span className={styles.flowMarker}>{index + 1}</span>
                <h4 className={styles.flowLabel}>{step.step}</h4>
                <p className={styles.flowDetail}>{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
