import { arcoDocsUrl, demoUrl, siteMeta } from "../content/site-content";
import { ChunkyButton } from "./ChunkyButton";
import { JourneyConstellation } from "./JourneyConstellation";
import styles from "./CTASection.module.css";

type CTAAction = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
  external?: boolean;
};

type CTASectionProps = {
  title?: string;
  body?: string;
  actions?: readonly CTAAction[];
  journey?: boolean;
};

const defaultActions: readonly CTAAction[] = [
  { label: "Launch Kosmos demo", href: demoUrl, variant: "primary" },
  { label: "Read Arco docs", href: arcoDocsUrl, variant: "secondary" },
];

export function CTASection({
  title = "Start your journey",
  body = "We would like to start a project with you — spin up the Kosmos prototype and explore the integrated AI workspace.",
  actions = defaultActions,
  journey = true,
}: CTASectionProps) {
  if (journey) {
    return (
      <section className={styles.journeySection}>
        <JourneyConstellation />
        <div className={styles.journeyContent}>
          <h2 className={styles.journeyTitle}>{title}</h2>
          <p className={styles.journeyBody}>{body}</p>
          <div className={styles.journeyActions}>
            {actions.map((action) => (
              <ChunkyButton
                key={action.href}
                href={action.href}
                variant={action.variant === "secondary" ? "secondary" : "primary"}
                size={action.variant === "primary" ? "large" : "default"}
                external={action.external}
              >
                {action.label}
              </ChunkyButton>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.body}>{body}</p>
        <div className={styles.actions}>
          {actions.map((action) => (
            <ChunkyButton
              key={action.href}
              href={action.href}
              variant={action.variant === "secondary" ? "secondary" : "primary"}
              external={action.external}
            >
              {action.label}
            </ChunkyButton>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <p className={styles.footerBrand}>{siteMeta.name}</p>
        <p className={styles.footerCopy}>
          Generative AI OS · Arco-Prototype-2 monorepo
        </p>
        <nav className={styles.footerNav} aria-label="Footer">
          <a href={arcoDocsUrl}>Arco docs</a>
          <a href="/spec.html">Arco spec</a>
          <a href={demoUrl}>Try demo</a>
        </nav>
      </div>
    </footer>
  );
}
