import { demoUrl, siteMeta } from "../content/site-content";
import clay from "../styles/clay.module.css";
import shared from "../styles/shared.module.css";
import { ChunkyButton } from "./ChunkyButton";
import { HeroAppPreview } from "./HeroAppPreview";
import styles from "./HeroSection.module.css";

export function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={shared.section}>
        <div className={styles.content}>
          <span className={clay.chunkyBadge}>✦ Generative AI OS</span>
          <h1 className={styles.title}>{siteMeta.tagline}</h1>
          <p className={styles.description}>{siteMeta.description}</p>
          <div className={styles.actions}>
            <ChunkyButton href={demoUrl}>Try the demo →</ChunkyButton>
            <ChunkyButton href="#architecture" variant="secondary">
              Read the architecture
            </ChunkyButton>
          </div>
        </div>
      </div>

      <div className={styles.previewWrap}>
        <HeroAppPreview />
      </div>
    </section>
  );
}
