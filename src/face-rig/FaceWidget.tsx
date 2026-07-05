/**
 * React wrapper that hosts a FaceRigEngine and keeps it wired to the voice
 * session for its lifetime. The engine choice is a prop so consumers can
 * swap rigs without touching the driver.
 */
import { useEffect, useRef } from "react";
import { CssFaceEngine } from "./CssFaceEngine";
import { VoiceFaceDriver } from "./VoiceFaceDriver";
import type { FaceRigEngine } from "./types";

export function FaceWidget({ createEngine }: { createEngine?: () => FaceRigEngine }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const createEngineRef = useRef(createEngine);
  createEngineRef.current = createEngine;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const engine = createEngineRef.current?.() ?? new CssFaceEngine();
    const driver = new VoiceFaceDriver(engine);
    engine.mount(container);
    driver.start();
    return () => {
      driver.stop();
      engine.unmount();
    };
  }, []);

  return <div ref={containerRef} className="arco-face-widget" />;
}
