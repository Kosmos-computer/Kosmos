import { useState } from "react";
import { ArcoLogo } from "@brand/ArcoLogo";
import { arcoDocsUrl, demoUrl, navPillLinks, siteMeta } from "../content/site-content";
import clay from "../styles/clay.module.css";
import { ChunkyButton } from "./ChunkyButton";
import styles from "./SiteHeader.module.css";

type HeaderLink = { label: string; href: string };

type SiteHeaderProps = {
  links?: readonly HeaderLink[];
  homeHref?: string;
};

export function SiteHeader({ links = navPillLinks, homeHref = "#" }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <a className={styles.brand} href={homeHref} aria-label={`${siteMeta.name} home`}>
          <ArcoLogo className={styles.logo} title="Kosmos" />
        </a>

        <nav className={styles.navDesktop} aria-label="Primary">
          <div className={clay.clayPill}>
            <div className={styles.navLinks}>
              {links.map((link) => (
                <a key={link.href} className={styles.navLink} href={link.href}>
                  {link.label}
                </a>
              ))}
              <a className={styles.navLink} href={arcoDocsUrl}>
                Docs
              </a>
            </div>
            <ChunkyButton href={demoUrl} className={styles.navCta}>
              Try demo
            </ChunkyButton>
          </div>
        </nav>

        <button
          type="button"
          className={`${clay.chunkyBtn} ${clay.chunkyBtnSecondary} ${styles.menuBtn}`}
          aria-expanded={menuOpen}
          aria-controls="site-mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu <span aria-hidden="true">=</span>
        </button>
      </div>

      {menuOpen ? (
        <nav id="site-mobile-nav" className={styles.mobileNav} aria-label="Mobile">
          {links.map((link) => (
            <a
              key={link.href}
              className={styles.mobileLink}
              href={link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <a className={styles.mobileLink} href={arcoDocsUrl} onClick={() => setMenuOpen(false)}>
            Docs
          </a>
          <ChunkyButton href={demoUrl} size="large" className={styles.mobileCta}>
            Try demo
          </ChunkyButton>
        </nav>
      ) : null}
    </header>
  );
}
