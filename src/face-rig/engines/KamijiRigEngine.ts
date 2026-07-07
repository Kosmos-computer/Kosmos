/**
 * Kamiji rig avatar — circular face with accent-colored eyes and mouth.
 * Adapted from kamiji-rig for Arco's FaceRigEngine contract.
 */
import type { FaceExpression, FaceRigEngine, FaceSpeakingState, Viseme } from "../types";

export class KamijiRigEngine implements FaceRigEngine {
  private root: HTMLDivElement | null = null;

  mount(container: HTMLElement): void {
    const root = document.createElement("div");
    root.className = "arco-kamiji-rig";
    root.dataset.expression = "neutral";
    root.dataset.speaking = "idle";
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", "Round assistant face");
    root.innerHTML = `
      <div class="arco-kamiji-rig__face">
        <div class="arco-kamiji-rig__eyes">
          <div class="arco-kamiji-rig__eye"></div>
          <div class="arco-kamiji-rig__eye"></div>
        </div>
        <div class="arco-kamiji-rig__mouth"></div>
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
