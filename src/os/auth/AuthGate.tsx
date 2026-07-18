/**
 * AuthGate — the shell's front door. Owns the boot splash, routes the auth
 * phase to a screen, and cross-fades between screens (boot → login → desktop,
 * desktop → lock, …). The desktop children render only when the session is
 * ready and unlocked, so no shell content is mounted behind the lock screen.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { idleLockTimeoutMs, useOsStore } from "../osStore";
import { useAuthStore, type AuthPhase } from "./authStore";
import { InstallFlow } from "./InstallFlow";
import { BootScreen, LockScreen, LoginScreen, OfflineScreen } from "./screens";

/** Boot splash lingers at least this long — matches the bar-fill animation. */
const MIN_BOOT_MS = 4000;
const BOOT_TEST_MS = 30_000;

function useBootTestMode(): boolean {
  const [enabled] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("boottest"),
  );
  return enabled;
}

/** Must match --arco-dur-xfade in auth.css. */
const XFADE_MS = 600;

type ScreenKey = "boot" | AuthPhase;

// ---------------------------------------------------------------------------
// Cross-fade switcher
//
// Rather than a transition library, we keep the outgoing screen mounted in a
// fading layer while the incoming one fades in above it, then drop the old
// layer. One `key` change = one cross-fade.
// ---------------------------------------------------------------------------

function FadeSwitch({ screenKey, children }: { screenKey: ScreenKey; children: ReactNode }) {
  const [prev, setPrev] = useState<{ key: ScreenKey; node: ReactNode } | null>(null);
  const lastRef = useRef<{ key: ScreenKey; node: ReactNode }>({ key: screenKey, node: children });

  if (lastRef.current.key !== screenKey) {
    // Key changed this render: snapshot the outgoing screen before replacing.
    setPrev(lastRef.current);
    lastRef.current = { key: screenKey, node: children };
  } else {
    lastRef.current.node = children;
  }

  useEffect(() => {
    if (!prev) return;
    const t = setTimeout(() => setPrev(null), XFADE_MS);
    return () => clearTimeout(t);
  }, [prev]);

  return (
    <div className="arco-authgate">
      <div key={screenKey} className="arco-fade arco-fade--in">
        {children}
      </div>
      {prev && (
        <div key={`out-${prev.key}`} className="arco-fade arco-fade--out" aria-hidden>
          {prev.node}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Idle auto-lock
//
// Cheap heartbeat: input events stamp a ref (no re-renders); a 30s interval
// compares against the idle budget and locks the session when exceeded.
// ---------------------------------------------------------------------------

function useIdleLock(enabled: boolean) {
  const lock = useAuthStore((s) => s.lock);
  const idleLockTimeout = useOsStore((s) => s.idleLockTimeout);
  const idleMs = idleLockTimeoutMs(idleLockTimeout);
  const lastActivity = useRef(Date.now());

  useEffect(() => {
    if (!enabled || idleMs == null) return;
    lastActivity.current = Date.now();
    const stamp = () => {
      lastActivity.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "wheel"] as const;
    for (const ev of events) window.addEventListener(ev, stamp, { passive: true });
    const timer = setInterval(() => {
      if (Date.now() - lastActivity.current >= idleMs) void lock();
    }, 30_000);
    return () => {
      for (const ev of events) window.removeEventListener(ev, stamp);
      clearInterval(timer);
    };
  }, [enabled, idleMs, lock]);
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

export function AuthGate({ children, standalone = false }: { children: ReactNode; standalone?: boolean }) {
  const phase = useAuthStore((s) => s.phase);
  const init = useAuthStore((s) => s.init);
  const showBootScreen = useOsStore((s) => s.showBootScreen);
  const [bootElapsed, setBootElapsed] = useState(false);
  const bootTest = useBootTestMode();
  const splashEnabled = !standalone && showBootScreen;
  const minBootMs = bootTest ? BOOT_TEST_MS : splashEnabled ? MIN_BOOT_MS : 0;

  useEffect(() => {
    void init();
    const t = setTimeout(() => setBootElapsed(true), minBootMs);
    return () => clearTimeout(t);
  }, [init, minBootMs]);

  useIdleLock(phase === "ready");

  // Hold the splash until both the minimum duration and the status fetch
  // finish — the bar completes, then the real screen cross-fades in.
  // ?boottest=1 keeps the boot splash up for previewing the sprite animation.
  // When the Appearance toggle is off, skip the splash and wait on a blank
  // gate until auth resolves to setup / login / locked / ready.
  const screen: ScreenKey =
    bootTest || (splashEnabled && (!bootElapsed || phase === "booting")) ? "boot" : phase;

  return (
    <FadeSwitch screenKey={screen}>
      {screen === "boot" && <BootScreen />}
      {screen === "setup" && <InstallFlow />}
      {screen === "login" && <LoginScreen />}
      {screen === "locked" && <LockScreen />}
      {screen === "offline" && <OfflineScreen />}
      {screen === "ready" && children}
    </FadeSwitch>
  );
}
