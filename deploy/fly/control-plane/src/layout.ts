/**
 * Shared HTML shell for control-plane pages — Kosmos dark auth card over a
 * live starfield (same visual language as www splash / desktop sign-in).
 */

export function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
  <style>
    :root {
      color-scheme: dark;
      --bg: #0d0d0f;
      --surface: rgba(18, 21, 29, 0.72);
      --border: rgba(247, 245, 240, 0.12);
      --text: #f7f5f0;
      --muted: rgba(247, 245, 240, 0.62);
      --accent: #4f7cff;
      --accent-hover: #3f6aef;
      --danger: #ff8f8f;
      --ok: #7ddea6;
      --radius: 16px;
      --font-sans: "Instrument Sans", ui-sans-serif, system-ui, sans-serif;
      --font-serif: "Instrument Serif", Georgia, "Times New Roman", serif;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      display: grid;
      place-items: center;
      padding: 1.5rem;
      overflow-x: hidden;
    }
    .wallpaper {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background: var(--bg);
    }
    .wallpaper canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    .veil {
      position: fixed;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      background:
        radial-gradient(ellipse 80% 60% at 50% 40%, rgba(13, 13, 15, 0.15), rgba(13, 13, 15, 0.72) 70%, rgba(13, 13, 15, 0.88));
    }
    .shell {
      position: relative;
      z-index: 2;
      width: min(420px, 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }
    .brand {
      margin: 0;
      font-family: var(--font-serif);
      font-weight: 400;
      font-size: clamp(2.5rem, 10vw, 3.5rem);
      line-height: 0.95;
      letter-spacing: -0.03em;
      color: var(--text);
      text-shadow: 0 0 80px rgba(255, 255, 255, 0.12);
    }
    main.card {
      width: 100%;
      padding: 2rem 1.5rem;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: var(--surface);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      box-shadow:
        0 24px 80px rgba(0, 0, 0, 0.45),
        0 1px 0 rgba(255, 255, 255, 0.04) inset;
    }
    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.35rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      text-align: center;
    }
    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.5;
      font-size: 0.95rem;
      text-align: center;
    }
    form { margin-top: 0.5rem; text-align: left; }
    label {
      display: block;
      margin: 1rem 0 0.35rem;
      font-size: 0.85rem;
      font-weight: 500;
      color: rgba(247, 245, 240, 0.78);
    }
    input {
      width: 100%;
      padding: 0.75rem 0.85rem;
      border-radius: 10px;
      border: 1px solid rgba(247, 245, 240, 0.14);
      background: rgba(13, 13, 15, 0.65);
      color: inherit;
      font: inherit;
      font-size: 0.95rem;
    }
    input::placeholder { color: rgba(247, 245, 240, 0.35); }
    input:focus {
      outline: none;
      border-color: rgba(79, 124, 255, 0.7);
      box-shadow: 0 0 0 3px rgba(79, 124, 255, 0.2);
    }
    button[type="submit"], button.primary {
      margin-top: 1.35rem;
      width: 100%;
      padding: 0.9rem 1rem;
      border: 0;
      border-radius: 999px;
      background: var(--accent);
      color: white;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease;
    }
    button[type="submit"]:hover, button.primary:hover { background: var(--accent-hover); }
    button[type="submit"]:active, button.primary:active { transform: translateY(1px); }
    .hint {
      font-size: 0.85rem;
      margin-top: 0.4rem;
      color: var(--muted);
      text-align: left;
    }
    .hint.center, p.hint { text-align: center; }
    .error { color: var(--danger); margin-top: 1rem; text-align: center; }
    .ok { color: var(--ok); }
    a { color: #a8c4ff; }
    a:hover { color: #d0e0ff; }
    code {
      background: rgba(13, 13, 15, 0.7);
      padding: 0.12rem 0.4rem;
      border-radius: 6px;
      font-size: 0.86em;
      border: 1px solid rgba(247, 245, 240, 0.08);
    }
    @media (prefers-reduced-motion: reduce) {
      .wallpaper canvas { display: none; }
    }
  </style>
</head>
<body>
  <div class="wallpaper" id="wallpaper" aria-hidden="true"><canvas id="starfield"></canvas></div>
  <div class="veil" aria-hidden="true"></div>
  <div class="shell">
    <p class="brand">Kosmos</p>
    <main class="card">${body}</main>
  </div>
  <script>
(function () {
  const container = document.getElementById("wallpaper");
  const canvas = document.getElementById("starfield");
  if (!container || !canvas) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;
  const mobile = window.matchMedia("(max-width: 768px)").matches;
  const particleNum = mobile ? 120 : 220;
  const PARTICLE_BASE_RADIUS = 0.45;
  const FL = 500;
  const speed = 1.6;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let canvasWidth = 0, canvasHeight = 0, centerX = 0, centerY = 0;
  let targetMouseX = 0, targetMouseY = 0, mouseX = 0, mouseY = 0;
  let frame = 0, running = true, warmed = false;
  const particles = Array.from({ length: particleNum }, () => ({ x: 0, y: 0, z: 0, pastZ: 0 }));

  function randomize(p) {
    p.x = Math.random() * canvasWidth;
    p.y = Math.random() * canvasHeight;
    p.z = Math.random() * 1500 + 500;
    p.pastZ = p.z;
  }

  function resize() {
    canvasWidth = container.clientWidth;
    canvasHeight = container.clientHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    centerX = canvasWidth * 0.5;
    centerY = canvasHeight * 0.5;
    targetMouseX = mouseX = centerX;
    targetMouseY = mouseY = centerY;
    for (const p of particles) randomize(p);
    warmed = false;
  }

  function loop() {
    if (!running) return;
    frame = requestAnimationFrame(loop);
    if (canvasWidth <= 0 || canvasHeight <= 0) return;
    mouseX += (targetMouseX - mouseX) * 0.045;
    mouseY += (targetMouseY - mouseY) * 0.045;
    ctx.fillStyle = "#0d0d0f";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    if (!warmed) {
      for (const p of particles) {
        p.pastZ = p.z;
        p.z -= speed;
        if (p.z <= 0) randomize(p);
      }
      warmed = true;
      return;
    }
    const halfPi = Math.PI * 0.5;
    ctx.fillStyle = "rgb(255, 255, 255)";
    ctx.beginPath();
    for (let i = 0; i < particleNum; i++) {
      const p = particles[i];
      p.pastZ = p.z;
      p.z -= speed;
      if (p.z <= 0) { randomize(p); continue; }
      const cx = centerX - (mouseX - centerX) * 0.65;
      const cy = centerY - (mouseY - centerY) * 0.65;
      const rx = p.x - cx, ry = p.y - cy;
      const f = FL / p.z;
      const x = cx + rx * f, y = cy + ry * f, r = PARTICLE_BASE_RADIUS * f;
      const pf = FL / p.pastZ;
      const px = cx + rx * pf, py = cy + ry * pf, pr = PARTICLE_BASE_RADIUS * pf;
      const a = Math.atan2(py - y, px - x);
      const a1 = a + halfPi, a2 = a - halfPi;
      ctx.moveTo(px + pr * Math.cos(a1), py + pr * Math.sin(a1));
      ctx.arc(px, py, pr, a1, a2, true);
      ctx.lineTo(x + r * Math.cos(a2), y + r * Math.sin(a2));
      ctx.arc(x, y, r, a2, a1, true);
      ctx.closePath();
    }
    ctx.fill();
  }

  window.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    targetMouseX = e.clientX - rect.left;
    targetMouseY = e.clientY - rect.top;
  });
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  loop();
})();
  </script>
</body>
</html>`;
}
