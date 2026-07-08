/**
 * Warp-speed starfield — ported from SpaceRadio's HeroWarp canvas effect.
 * Square streak caps (not round); particles fly toward the viewer with subtle
 * mouse parallax. Tuned down for an always-on OS desktop (no click-to-boost).
 */
import { useEffect, useRef } from "react";
import type { Theme } from "../osStore";

const PARTICLE_NUM_DESKTOP = 220;
const PARTICLE_NUM_MOBILE = 120;
const PARTICLE_BASE_RADIUS = 0.45;
const FL = 500;
const DEFAULT_SPEED = 1.6;

interface Particle {
  x: number;
  y: number;
  z: number;
  pastZ: number;
}

function createParticle(): Particle {
  return { x: 0, y: 0, z: 0, pastZ: 0 };
}

function randomizeParticle(p: Particle, width: number, height: number) {
  p.x = Math.random() * width;
  p.y = Math.random() * height;
  p.z = Math.random() * 1500 + 500;
  p.pastZ = p.z;
  return p;
}

function readDesktopBg(theme: Theme): string {
  const styles = getComputedStyle(document.documentElement);
  const token = styles.getPropertyValue("--arco-bg-desktop").trim();
  if (token) return token;
  return theme === "light" ? "#e8ecf4" : "#0b0d12";
}

export function StarfieldWallpaper({ theme }: { theme: Theme }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    const particleNum = mobile ? PARTICLE_NUM_MOBILE : PARTICLE_NUM_DESKTOP;
    const context = canvas.getContext("2d");
    if (!context) return;

    let canvasWidth = 0;
    let canvasHeight = 0;
    let centerX = 0;
    let centerY = 0;
    let mouseX = 0;
    let mouseY = 0;
    const speed = reduced ? DEFAULT_SPEED * 0.35 : DEFAULT_SPEED;
    let frame = 0;
    let running = true;
    let warmed = false;

    const particles: Particle[] = Array.from({ length: particleNum }, () => createParticle());

    const resize = () => {
      canvasWidth = container.clientWidth;
      canvasHeight = container.clientHeight;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      centerX = canvasWidth * 0.5;
      centerY = canvasHeight * 0.5;
      mouseX = centerX;
      mouseY = centerY;

      for (const p of particles) {
        randomizeParticle(p, canvasWidth, canvasHeight);
      }
      warmed = false;
    };

    const setMouseFromEvent = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      mouseX = clientX - rect.left;
      mouseY = clientY - rect.top;
    };

    const onMouseMove = (e: MouseEvent) => setMouseFromEvent(e.clientX, e.clientY);

    const loop = () => {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      if (canvasWidth <= 0 || canvasHeight <= 0) return;

      context.save();
      context.fillStyle = readDesktopBg(theme);
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.restore();

      if (!warmed) {
        for (const p of particles) {
          p.pastZ = p.z;
          p.z -= speed;
          if (p.z <= 0) randomizeParticle(p, canvasWidth, canvasHeight);
        }
        warmed = true;
        return;
      }

      const starColor = theme === "light" ? "rgb(40, 55, 90)" : "rgb(255, 255, 255)";
      context.fillStyle = starColor;
      context.beginPath();

      for (let i = 0; i < particleNum; i++) {
        const p = particles[i];
        p.pastZ = p.z;
        p.z -= speed;

        if (p.z <= 0) {
          randomizeParticle(p, canvasWidth, canvasHeight);
          continue;
        }

        const cx = centerX - (mouseX - centerX) * 0.65;
        const cy = centerY - (mouseY - centerY) * 0.65;

        const rx = p.x - cx;
        const ry = p.y - cy;

        const f = FL / p.z;
        const x = cx + rx * f;
        const y = cy + ry * f;
        const r = PARTICLE_BASE_RADIUS * f;

        const pf = FL / p.pastZ;
        const px = cx + rx * pf;
        const py = cy + ry * pf;

        const dx = x - px;
        const dy = y - py;
        const len = Math.hypot(dx, dy);

        if (len < 0.001) {
          context.rect(x - r, y - r, r * 2, r * 2);
          continue;
        }

        const halfW = Math.max(r, 0.5);
        const nx = (-dy / len) * halfW;
        const ny = (dx / len) * halfW;

        context.moveTo(px + nx, py + ny);
        context.lineTo(x + nx, y + ny);
        context.lineTo(x - nx, y - ny);
        context.lineTo(px - nx, py - ny);
        context.closePath();
      }

      context.fill();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    window.addEventListener("mousemove", onMouseMove);

    let startId = 0;
    if (!reduced) {
      startId = window.setTimeout(() => loop(), 0);
    } else {
      context.fillStyle = readDesktopBg(theme);
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    return () => {
      clearTimeout(startId);
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [theme]);

  return (
    <div ref={containerRef} className="arco-wallpaper__effect arco-wallpaper__effect--starfield" aria-hidden>
      <canvas ref={canvasRef} />
    </div>
  );
}
