import { principles } from "../content/site-content";
import shared from "../styles/shared.module.css";
import styles from "./PrinciplesSection.module.css";

export function PrinciplesSection() {
  return (
    <section id="principles" className={styles.section}>
      <div className={shared.sectionHeader}>
        <p className={shared.sectionEyebrow}>Design principles</p>
        <h2 className={shared.sectionTitle}>
          How the shell stays coherent while engines evolve
        </h2>
      </div>

      <ol className={styles.list}>
        {principles.map((principle) => (
          <li key={principle.id} className={styles.item}>
            <span className={styles.id}>{principle.id}</span>
            <div>
              <h3 className={styles.title}>{principle.title}</h3>
              <p className={styles.body}>{principle.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
