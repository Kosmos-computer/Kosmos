/**
 * React wrapper that hosts a FaceRigEngine and keeps it wired to the voice
 * session for its lifetime. Reads the selected space rig from preferences
 * unless a custom createEngine factory is passed.
 */
import { useEffect, useRef } from "react";
import { createFaceRigEngine } from "./createFaceRigEngine";
import { useFacePreferencesStore } from "./facePreferencesStore";
import { VoiceFaceDriver } from "./VoiceFaceDriver";
import type { FaceRigEngine } from "./types";

export function FaceWidget({
  createEngine,
  className,
}: {
  createEngine?: () => FaceRigEngine;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const faceRigId = useFacePreferencesStore((s) => s.faceRigId);
  const createEngineRef = useRef(createEngine);
  createEngineRef.current = createEngine;
  const engineKey = createEngine ? "custom" : faceRigId;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const engine = createEngineRef.current?.() ?? createFaceRigEngine(faceRigId);
    const driver = new VoiceFaceDriver(engine);
    engine.mount(container);
    driver.start();
    return () => {
      driver.stop();
      engine.unmount();
    };
  }, [engineKey]);

  return (
    <div
      ref={containerRef}
      className={`arco-face-widget ${className ?? ""}`.trimEnd()}
      data-face-rig={createEngine ? undefined : faceRigId}
    />
  );
}
