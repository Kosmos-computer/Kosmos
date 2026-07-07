/**
 * Kamiji Island companion sprite — coral circle with dot eyes.
 * Adapted from kamiji-demo for Arco's FaceRigEngine contract.
 */
import type { FaceExpression, FaceRigEngine, FaceSpeakingState, Viseme } from "../types";

export class KamijiDemoEngine implements FaceRigEngine {
  private root: HTMLDivElement | null = null;

  mount(container: HTMLElement): void {
    const root = document.createElement("div");
    root.className = "arco-kamiji-demo";
    root.dataset.expression = "neutral";
    root.dataset.speaking = "idle";
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", "Coral companion");
    root.innerHTML = `
      <div class="arco-kamiji-demo__sprite">
        <div class="arco-kamiji-demo__eyes">
          <div class="arco-kamiji-demo__eye"></div>
          <div class="arco-kamiji-demo__eye"></div>
        </div>
        <div class="arco-kamiji-demo__mouth"></div>
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
    // Amplitude-driven for v1.
  }
}
