/**
 * Provides the shell window id to app trees mounted inside a WindowFrame.
 * Used by multi-instance apps (Drive) to scope cross-window navigation.
 */
import { createContext, useContext } from "react";

const WindowIdContext = createContext<string | null>(null);

export const WindowIdProvider = WindowIdContext.Provider;

export function useWindowId(): string | null {
  return useContext(WindowIdContext);
}
