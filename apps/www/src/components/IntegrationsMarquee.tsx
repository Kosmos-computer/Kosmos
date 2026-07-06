import { integrations } from "../content/site-content";
import styles from "./IntegrationsMarquee.module.css";

export function IntegrationsMarquee() {
  const items = [...integrations, ...integrations];

  return (
    <section className={styles.section} aria-label="Supported engines">
      <p className={styles.label}>Composes with the runtimes you already run</p>
      <div className={styles.marquee}>
        <div className={styles.track}>
          {items.map((name, index) => (
            <span
              key={`${name}-${index}`}
              className={styles.item}
              aria-hidden={index >= integrations.length}
            >
              <span className={styles.badge} aria-hidden="true" />
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
