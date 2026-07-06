import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { buildSphereCards } from "../content/sphere-content";
import clay from "../styles/clay.module.css";
import styles from "./JourneyConstellation.module.css";

gsap.registerPlugin(ScrollTrigger);

const SCATTER = [
  { top: "10%", left: "15%" },
  { top: "20%", left: "80%" },
  { top: "60%", left: "10%" },
  { top: "75%", left: "85%" },
  { top: "85%", left: "30%" },
  { top: "15%", left: "50%" },
] as const;

export function JourneyConstellation() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cards = buildSphereCards().slice(0, 6);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cardEls = root.querySelectorAll(`.${styles.card}`);
    const tween = gsap.to(cardEls, {
      y: -80,
      ease: "none",
      stagger: 0.08,
      scrollTrigger: {
        trigger: root.parentElement,
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <div ref={sectionRef} className={styles.constellation} aria-hidden>
      {SCATTER.map((pos, i) => {
        const card = cards[i];
        const rot = (i % 3 - 1) * 14;
        return (
          <div
            key={pos.top}
            className={`${clay.clayCard} ${styles.card}`}
            style={{ top: pos.top, left: pos.left, transform: `rotate(${rot}deg) scale(0.85)` }}
          >
            {"image" in card && card.image ? (
              <img className={styles.cardImage} src={card.image} alt="" loading="lazy" />
            ) : (
              <div className={styles.cardLabel}>{card.label}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
