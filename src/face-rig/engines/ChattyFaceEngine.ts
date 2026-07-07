/**
 * ChatRTK-style talking head — screen bezel, round eyes, teeth and tongue.
 * Adapted from chatty-face-plugin for Arco's FaceRigEngine contract.
 */
import type { FaceExpression, FaceRigEngine, FaceSpeakingState, Viseme } from "../types";

export class ChattyFaceEngine implements FaceRigEngine {
  private root: HTMLDivElement | null = null;

  mount(container: HTMLElement): void {
    const root = document.createElement("div");
    root.className = "arco-chatty-face";
    root.dataset.expression = "neutral";
    root.dataset.speaking = "idle";
    root.setAttribute("role", "img");
    root.setAttribute("aria-label", "Screen assistant face");
    root.innerHTML = `
      <div class="arco-chatty-face__screen">
        <div class="arco-chatty-face__face">
          <div class="arco-chatty-face__eye arco-chatty-face__eye--left"></div>
          <div class="arco-chatty-face__eye arco-chatty-face__eye--right"></div>
          <div class="arco-chatty-face__mouth">
            <div class="arco-chatty-face__teeth"></div>
            <div class="arco-chatty-face__tongue"></div>
          </div>
        </div>
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

  setViseme(viseme: Viseme, weight: number): void {
    if (!this.root || weight <= 0) return;
    this.root.dataset.viseme = viseme;
  }
}
