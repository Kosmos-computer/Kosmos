import { arcoDocsUrl, demoUrl, siteMeta } from "../content/site-content";
import shared from "../styles/shared.module.css";
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
};

const defaultActions: readonly CTAAction[] = [
  { label: "Launch Kosmos demo", href: demoUrl, variant: "primary" },
  {
    label: "Read Arco docs",
    href: arcoDocsUrl,
    variant: "secondary",
  },
];

export function CTASection({
  title = "Build the integrated AI workspace",
  body = "Start with the Kosmos prototype, then follow the integration path — OpenClaw plugin, OpenHands embed, Arco streaming.",
  actions = defaultActions,
}: CTASectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.card}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.body}>{body}</p>
        <div className={styles.actions}>
          {actions.map((action) => (
            <a
              key={action.href}
              className={
                action.variant === "secondary"
                  ? shared.buttonSecondary
                  : shared.buttonPrimary
              }
              href={action.href}
              {...(action.external ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {action.label}
            </a>
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
