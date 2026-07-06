import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { buildSphereCards, sphereSlides } from "../content/sphere-content";
import clay from "../styles/clay.module.css";
import styles from "./PlatformSphere.module.css";

gsap.registerPlugin(ScrollTrigger);

const CARD_COUNT = buildSphereCards().length;

export function PlatformSphere() {
  const containerRef = useRef<HTMLElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const cards = buildSphereCards();

  useEffect(() => {
    const container = containerRef.current;
    const sphere = sphereRef.current;
    if (!container || !sphere) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const radius = window.innerWidth < 768 ? 180 : 320;

    const cardEls = sphere.querySelectorAll<HTMLElement>(`.${styles.card}`);
    cardEls.forEach((card, i) => {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / CARD_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);
      const rotY = Math.atan2(x, z) * (180 / Math.PI);
      const rotX = Math.asin(-y / radius) * (180 / Math.PI);
      card.style.transform = `translate3d(${x}px, ${y}px, ${z}px) rotateY(${rotY}deg) rotateX(${rotX}deg)`;
    });

    if (reduced) return;

    const tween = gsap.to(sphere, {
      rotateY: 720,
      rotateX: 35,
      ease: "none",
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => {
          const progress = self.progress;
          const textIndex = Math.min(
            sphereSlides.length - 1,
            Math.floor(progress * sphereSlides.length),
          );
          setActiveIndex(textIndex);

          const focusIndex = Math.floor(progress * CARD_COUNT);
          cardEls.forEach((card, idx) => {
            const active = Math.abs(idx - focusIndex) < 2;
            card.classList.toggle(styles.cardActive, active);
            card.classList.toggle(clay.clayCardActive, active);
          });
        },
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  const slide = sphereSlides[activeIndex];

  return (
    <section id="platform" ref={containerRef} className={styles.section}>
      <div className={styles.floatingText}>
        <h2 className={styles.dynamicTitle}>{slide.title}</h2>
        <p className={styles.dynamicDesc}>{slide.description}</p>
      </div>

      <div className={styles.scene}>
        <div className={styles.sphere} ref={sphereRef}>
          {cards.map((card, i) => (
            <div
              key={`${card.label}-${i}`}
              className={`${clay.clayCard} ${styles.card}`}
            >
              {"image" in card && card.image ? (
                <img
                  className={styles.cardImage}
                  src={card.image}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className={styles.cardLabel}>{card.label}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <svg className={styles.networkLines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <path d="M0,50 Q25,30 50,50 T100,50" stroke="rgba(0,0,0,0.06)" strokeWidth="0.2" fill="none" />
        <path d="M20,0 L80,100" stroke="rgba(0,0,0,0.04)" strokeWidth="0.2" fill="none" />
      </svg>
    </section>
  );
}
