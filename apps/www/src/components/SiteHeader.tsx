import { ArcoLogo } from "@brand/ArcoLogo";
import { demoUrl, navLinks, siteMeta } from "../content/site-content";
import styles from "./SiteHeader.module.css";

type HeaderLink = { label: string; href: string };

type SiteHeaderProps = {
  links?: readonly HeaderLink[];
  homeHref?: string;
  primaryAction?: HeaderLink;
};

export function SiteHeader({
  links = navLinks,
  homeHref = "#",
  primaryAction = { label: "Architecture", href: "#architecture" },
}: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a className={styles.brand} href={homeHref} aria-label={`${siteMeta.name} home`}>
          <ArcoLogo className={styles.logo} title="Kosmos" />
        </a>

        <nav className={styles.nav} aria-label="Primary">
          <div className={styles.navPill}>
            {links.map((link) => (
              <a key={link.href} className={styles.navLink} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>
        </nav>

        <div className={styles.actions}>
          <a className={styles.buttonSoft} href={demoUrl}>
            Try demo
          </a>
          <a className={styles.buttonDark} href={primaryAction.href}>
            {primaryAction.label}
          </a>
        </div>
      </div>
    </header>
  );
}
