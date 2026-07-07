/**
 * The default face: pure DOM + CSS, themed by --arco tokens (styles in
 * face-rig.css). Mouth openness rides a CSS custom property so the rAF-rate
 * updates from the driver never touch layout — only a transform.
 */
import type { FaceExpression, FaceRigEngine, FaceSpeakingState, Viseme } from "./types";

export class CssFaceEngine implements FaceRigEngine {
  private root: HTMLDivElement | null = null;

  mount(container: HTMLElement): void {
    const root = document.createElement("div");
    root.className = "arco-face";
    root.dataset.expression = "neutral";
    root.dataset.speaking = "idle";
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", "Minimal assistant face");
    root.innerHTML = `
      <div class="arco-face__head">
        <div class="arco-face__eye arco-face__eye--left"><div class="arco-face__pupil"></div></div>
        <div class="arco-face__eye arco-face__eye--right"><div class="arco-face__pupil"></div></div>
        <div class="arco-face__mouth"></div>
      </div>`;
    container.appendChild(root);
    this.root = root;
  }

  unmount(): void {
    this.root?.remove();
    this.root = null;
  }

  setSpeakingState(state: FaceSpeakingState): void {
    if (this.root) this.root.dataset.speaking = state;
  }

  setExpression(expression: FaceExpression): void {
    if (this.root) this.root.dataset.expression = expression;
  }

  setAudioLevel(level: number): void {
    this.root?.style.setProperty("--face-mouth-open", String(Math.min(1, Math.max(0, level))));
  }

  setViseme(_viseme: Viseme, _weight: number): void {
    // v1 is amplitude-driven; viseme shaping arrives with a viseme driver.
  }
}
