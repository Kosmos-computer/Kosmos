import { faqItems } from "../content/site-content";
import shared from "../styles/shared.module.css";
import styles from "./FAQSection.module.css";

export function FAQSection() {
  return (
    <section id="faq" className={styles.section}>
      <div className={shared.sectionHeader}>
        <p className={shared.sectionEyebrow}>FAQ</p>
        <h2 className={shared.sectionTitle}>Common questions</h2>
      </div>

      <div className={styles.list}>
        {faqItems.map((item) => (
          <details key={item.question} className={styles.item}>
            <summary className={styles.question}>{item.question}</summary>
            <p className={styles.answer}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
