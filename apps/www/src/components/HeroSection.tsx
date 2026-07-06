import { demoUrl, siteMeta } from "../content/site-content";
import shared from "../styles/shared.module.css";
import { HeroAppPreview } from "./HeroAppPreview";
import styles from "./HeroSection.module.css";

export function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={shared.section}>
        <div className={styles.content}>
          <h1 className={styles.title}>{siteMeta.tagline}</h1>
          <p className={styles.description}>{siteMeta.description}</p>
          <div className={styles.actions}>
            <a className={shared.buttonPrimary} href={demoUrl}>
              Try the demo
              <span aria-hidden="true">→</span>
            </a>
            <a className={shared.buttonSecondary} href="#architecture">
              Read the architecture
            </a>
          </div>
        </div>
      </div>

      <div className={styles.previewWrap}>
        <HeroAppPreview />
      </div>
    </section>
  );
}
