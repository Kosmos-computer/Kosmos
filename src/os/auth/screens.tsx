import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
/**
 * Auth screens — boot splash, first-run setup, login, and lock.
 *
 * All four are full-viewport layers rendered by AuthGate; the setup/login/
 * lock trio shares AuthCard (wallpaper backdrop + glass card) so they feel
 * like one surface morphing between states rather than separate pages.
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArcoLogo } from "../../components/ArcoLogo";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { SpriteWorkingMark } from "../../components/SpriteWorkingMark";
import { useDeployment } from "../../hooks/useDeployment";
import { useAuthStore } from "./authStore";
import { AuthWallpaperBackdrop } from "../wallpaper/AuthWallpaperBackdrop";

// ── Boot splash ──────────────────────────────────────────────────────────────

/** Decorative rainbow ribbon anchored to the bottom-left corner. */
function AuthRainbowCorner() {
  return (
    <div className="arco-auth-rainbow" aria-hidden>
      <span className="arco-auth-rainbow__segment arco-auth-rainbow__segment--red" />
      <span className="arco-auth-rainbow__segment arco-auth-rainbow__segment--orange" />
      <span className="arco-auth-rainbow__segment arco-auth-rainbow__segment--yellow" />
      <span className="arco-auth-rainbow__segment arco-auth-rainbow__segment--green" />
      <span className="arco-auth-rainbow__segment arco-auth-rainbow__segment--blue" />
    </div>
  );
}

/** Logo + loading bar; the bar's CSS animation is timed to MIN_BOOT_MS. */
export function BootScreen() {
  return (
    <div className="arco-boot" role="status" aria-label={i18n.t(I18nKey.OS_AUTH_ARCO_OS_IS_STARTING)}>
      <div className="arco-boot__logo">
        <SpriteWorkingMark className="arco-boot__mark" animation="boot" />
      </div>
      <div className="arco-boot__bar">
        <div className="arco-boot__bar-fill" />
      </div>
      <AuthRainbowCorner />
    </div>
  );
}

// ── Shared card scaffold ─────────────────────────────────────────────────────

/** Wallpaper-backed centered card used by setup, login, and lock. */
function AuthCard({
  branding,
  rainbowCorner = false,
  children,
}: {
  branding?: ReactNode;
  rainbowCorner?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="arco-authscreen">
      <AuthWallpaperBackdrop />
      <div className="arco-authscreen__stack">
        {branding ? <div className="arco-authscreen__branding">{branding}</div> : null}
        <div className="arco-authscreen__card">{children}</div>
      </div>
      {rainbowCorner ? <AuthRainbowCorner /> : null}
    </div>
  );
}

/** Error line bound to the auth store — shared by every form below. */
function AuthError() {
  const error = useAuthStore((s) => s.error);
  if (!error) return null;
  return <div className="arco-authscreen__error" role="alert">{error}</div>;
}

// ── First-run setup ──────────────────────────────────────────────────────────

/** Creates the owner account; only reachable while zero accounts exist. */
export function SetupScreen() {
  const setup = useAuthStore((s) => s.setup);
  const clearError = useAuthStore((s) => s.clearError);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setLocalError("Passwords do not match");
      return;
    }
    setLocalError(null);
    clearError();
    setBusy(true);
    await setup({ username, displayName: displayName || undefined, password });
    setBusy(false);
  };

  return (
    <AuthCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__mark" />
        <div className="arco-authscreen__title"><T k={I18nKey.OS_AUTH_WELCOME_TO_ARCO} /></div>
        <div className="arco-authscreen__subtitle"><T k={I18nKey.OS_AUTH_CREATE_THE_OWNER_ACCOUNT_TO_SECURE_THIS_INSTANCE} /></div>
      </div>
      <form className="arco-authscreen__form" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="arco-label" htmlFor="setup-username"><T k={I18nKey.OS_AUTH_USERNAME} /></label>
          <input
            id="setup-username"
            className="arco-input"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="arco-label" htmlFor="setup-display"><T k={I18nKey.OS_AUTH_DISPLAY_NAME_OPTIONAL} /></label>
          <input
            id="setup-display"
            className="arco-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div>
          <label className="arco-label" htmlFor="setup-password"><T k={I18nKey.OS_AUTH_PASSWORD} /></label>
          <input
            id="setup-password"
            className="arco-input"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="arco-label" htmlFor="setup-confirm"><T k={I18nKey.OS_AUTH_CONFIRM_PASSWORD} /></label>
          <input
            id="setup-confirm"
            className="arco-input"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        {localError && <div className="arco-authscreen__error" role="alert">{localError}</div>}
        <AuthError />
        <button className="arco-btn arco-btn--primary" type="submit" disabled={busy} style={{ justifyContent: "center" }}>
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}

// ── Login ────────────────────────────────────────────────────────────────────

export function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const clearError = useAuthStore((s) => s.clearError);
  const { deployment } = useDeployment();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setBusy(true);
    await login(username, password);
    setBusy(false);
  };

  return (
    <AuthCard branding={<ArcoLogo className="arco-authscreen__logo" />} rainbowCorner>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__lead"><T k={I18nKey.OS_AUTH_SIGN_IN_TO_CONTINUE} /></div>
      </div>
      <form className="arco-authscreen__form" onSubmit={(e) => void submit(e)}>
        <div>
          <label className="arco-label" htmlFor="login-username"><T k={I18nKey.OS_AUTH_USERNAME} /></label>
          <input
            id="login-username"
            className="arco-input"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="arco-label" htmlFor="login-password"><T k={I18nKey.OS_AUTH_PASSWORD} /></label>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <AuthError />
        <button className="arco-btn arco-btn--primary" type="submit" disabled={busy} style={{ justifyContent: "center" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="arco-authscreen__footer">
        <a className="arco-authscreen__link" href={deployment.signupUrl}>
          <T k={I18nKey.INSTALL$KOSMOS_CREATE_ACCOUNT} />
        </a>
      </div>
    </AuthCard>
  );
}

// ── Lock ─────────────────────────────────────────────────────────────────────

/**
 * Lock screen — the session survives, only the password gets you back in.
 * Shows identity (initial + name) per OS convention; "Sign out" escapes to
 * the login screen for a different user.
 */
export function LockScreen() {
  const user = useAuthStore((s) => s.user);
  const unlock = useAuthStore((s) => s.unlock);
  const logout = useAuthStore((s) => s.logout);
  const clearError = useAuthStore((s) => s.clearError);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Re-focus after a failed attempt so retyping is immediate.
  const error = useAuthStore((s) => s.error);
  useEffect(() => {
    if (error) inputRef.current?.focus();
  }, [error]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    setBusy(true);
    await unlock(password);
    setBusy(false);
    setPassword("");
  };

  const name = user?.displayName ?? "Locked";
  return (
    <AuthCard>
      <div className="arco-authscreen__header">
        <div className="arco-authscreen__avatar" aria-hidden>
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="arco-authscreen__title">{name}</div>
        <div className="arco-authscreen__subtitle"><T k={I18nKey.OS_AUTH_ENTER_YOUR_PASSWORD_TO_UNLOCK} /></div>
      </div>
      <form className="arco-authscreen__form" onSubmit={(e) => void submit(e)}>
        <PasswordInput
          ref={inputRef}
          aria-label={i18n.t(I18nKey.OS_AUTH_PASSWORD)}
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <AuthError />
        <button className="arco-btn arco-btn--primary" type="submit" disabled={busy} style={{ justifyContent: "center" }}>
          {busy ? "Unlocking…" : "Unlock"}
        </button>
      </form>
      <div className="arco-authscreen__footer">
        <button className="arco-authscreen__link" onClick={() => void logout()}><T k={I18nKey.OS_AUTH_NOT_YOU_SIGN_OUT} /></button>
      </div>
    </AuthCard>
  );
}
