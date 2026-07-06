import { createContext, useContext, type ReactNode } from "react";
import { useBentoLiveData } from "./useBentoLiveData";
import type { BentoLiveSnapshot } from "./types";

const BentoLiveContext = createContext<BentoLiveSnapshot | null>(null);

export function BentoLiveProvider({ children }: { children: ReactNode }) {
  const live = useBentoLiveData();
  return <BentoLiveContext.Provider value={live}>{children}</BentoLiveContext.Provider>;
}

export function useBentoLiveSnapshot(): BentoLiveSnapshot {
  const live = useContext(BentoLiveContext);
  if (!live) {
    throw new Error("useBentoLiveSnapshot must be used within BentoLiveProvider");
  }
  return live;
}
