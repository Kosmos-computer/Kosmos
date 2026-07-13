/**
 * Classic mail sign-in: email + password (IMAP/SMTP).
 * Optional Continue with Google when OAuth app credentials exist.
 */
import { useCallback, useState } from "react";
import type { MailOAuthStatus } from "@shared/mail";
import { I18nKey } from "../../i18n/declaration";
import i18n from "../../i18n/index";
import { T } from "../../i18n/T";
import { api } from "../../lib/api";
import { useCan } from "../../os/auth/authStore";
import { Button, Input, PasswordInput } from "../../components/ui";

export interface GmailOAuthSetupProps {
  oauth: MailOAuthStatus | null;
  onUpdated: (oauth: MailOAuthStatus) => void;
  onConnected: () => void;
  /** Compact card for Settings vs Email empty state. */
  variant?: "email" | "settings";
}

function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7 12.9 19.6C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l.1.1 6.2 5.2C39.2 37.1 44 31.5 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}

export function GmailOAuthSetup({
  oauth,
  onUpdated,
  onConnected,
  variant = "email",
}: GmailOAuthSetupProps) {
  const canManage = useCan("settings:write");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGoogleSetup, setShowGoogleSetup] = useState(false);

  const configured = oauth?.configured ?? false;
  const envConfigured = oauth?.envConfigured ?? false;
  const settingsStored = oauth?.settingsStored ?? false;
  const redirectUri = oauth?.redirectUri ?? "http://localhost:4600/api/mail/oauth/google/callback";
  const isEmail = variant === "email";
  const looksLikeGmail = /@(gmail|googlemail)\.com$/i.test(email.trim());

  const connectPassword = useCallback(async () => {
    if (!email.trim() || !password) return;
    setConnecting(true);
    setError(null);
    try {
      await api.connectMailPassword({ email: email.trim(), password });
      setPassword("");
      onConnected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setConnecting(false);
    }
  }, [email, onConnected, password]);

  const save = useCallback(async () => {
    if (!clientId.trim() && !settingsStored) return;
    if (!clientSecret.trim() && !settingsStored) return;
    if (!clientId.trim() && !clientSecret.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const next = await api.saveMailOAuthConfig({
        clientId: clientId.trim() || undefined,
        clientSecret: clientSecret.trim() || undefined,
      });
      setClientSecret("");
      onUpdated(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save Google OAuth settings");
    } finally {
      setSaving(false);
    }
  }, [clientId, clientSecret, onUpdated, settingsStored]);

  const clear = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      onUpdated(await api.clearMailOAuthConfig());
      setClientId("");
      setClientSecret("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear Google OAuth settings");
    } finally {
      setSaving(false);
    }
  }, [onUpdated]);

  if (variant === "settings") {
    return (
      <div className="arco-gmail-oauth arco-gmail-oauth--settings">
        <h2 className="arco-gmail-oauth__title">
          <T k={I18nKey.APPS$EMAIL_GMAIL} />
        </h2>
        <p className="arco-gmail-oauth__lead">
          <T k={I18nKey.APPS$EMAIL_OAUTH_OPTIONAL_GOOGLE} />
        </p>
        {configured ? (
          <p className="arco-gmail-oauth__status">
            {envConfigured ? (
              <T k={I18nKey.APPS$EMAIL_OAUTH_CONFIGURED_VIA_ENV} />
            ) : (
              <T k={I18nKey.APPS$EMAIL_OAUTH_CONFIGURED_VIA_SETTINGS} />
            )}
            {oauth?.clientIdHint ? (
              <>
                {" "}
                <code className="arco-code arco-code--xs">{oauth.clientIdHint}</code>
              </>
            ) : null}
          </p>
        ) : (
          <p className="arco-gmail-oauth__note">
            <T k={I18nKey.APPS$EMAIL_OAUTH_SETUP_INTRO} />
          </p>
        )}
        {canManage && !envConfigured ? (
          <>
            <p className="arco-gmail-oauth__redirect">
              <T k={I18nKey.APPS$EMAIL_OAUTH_ADD_REDIRECT_URI} />{" "}
              {/* eslint-disable-next-line i18next/no-literal-string -- OAuth redirect URL */}
              <code className="arco-code arco-code--xs">{redirectUri}</code>
            </p>
            <div className="arco-gmail-oauth__fields">
              <label className="arco-gmail-oauth__field">
                <span className="arco-gmail-oauth__field-label">
                  <T k={I18nKey.APPS$EMAIL_OAUTH_CLIENT_ID} />
                </span>
                <Input
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  placeholder={i18n.t(I18nKey.APPS$EMAIL_OAUTH_CLIENT_ID_PLACEHOLDER)}
                  width="full"
                  autoComplete="off"
                  disabled={saving}
                />
              </label>
              <label className="arco-gmail-oauth__field">
                <span className="arco-gmail-oauth__field-label">
                  <T k={I18nKey.APPS$EMAIL_OAUTH_CLIENT_SECRET} />
                </span>
                <PasswordInput
                  value={clientSecret}
                  onChange={(event) => setClientSecret(event.target.value)}
                  placeholder={
                    settingsStored
                      ? i18n.t(I18nKey.APPS$EMAIL_OAUTH_SECRET_KEEP)
                      : i18n.t(I18nKey.APPS$EMAIL_OAUTH_CLIENT_SECRET_PLACEHOLDER)
                  }
                  width="full"
                  autoComplete="off"
                  disabled={saving}
                />
              </label>
              {error ? <p className="arco-gmail-oauth__error">{error}</p> : null}
              <div className="arco-gmail-oauth__actions">
                <Button
                  variant="primary"
                  disabled={
                    saving ||
                    (!clientId.trim() && !clientSecret.trim()) ||
                    (!settingsStored && (!clientId.trim() || !clientSecret.trim()))
                  }
                  onClick={() => void save()}
                >
                  <T k={I18nKey.APPS$EMAIL_OAUTH_SAVE} />
                </Button>
                {settingsStored ? (
                  <Button disabled={saving} onClick={() => void clear()}>
                    <T k={I18nKey.APPS$EMAIL_OAUTH_CLEAR} />
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
        {configured ? (
          <div className="arco-gmail-oauth__actions">
            <Button variant="primary" className="arco-gmail-oauth__google-btn" onClick={() => api.connectGmail()}>
              <GoogleMark />
              <T k={I18nKey.APPS$EMAIL_CONNECT_WITH_GOOGLE} />
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="arco-gmail-oauth arco-gmail-oauth--ready">
      <h2 className="arco-gmail-oauth__title">
        <T k={I18nKey.APPS$EMAIL_SIGN_IN} />
      </h2>
      <p className="arco-gmail-oauth__lead">
        <T k={I18nKey.APPS$EMAIL_SIGN_IN_LEAD} />
      </p>

      <div className="arco-gmail-oauth__fields">
        <label className="arco-gmail-oauth__field">
          <span className="arco-gmail-oauth__field-label">
            <T k={I18nKey.APPS$EMAIL_ADDRESS} />
          </span>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={i18n.t(I18nKey.APPS$EMAIL_ADDRESS_PLACEHOLDER)}
            width="full"
            autoComplete="username"
            disabled={connecting}
            onKeyDown={(event) => {
              if (event.key === "Enter") void connectPassword();
            }}
          />
        </label>
        <label className="arco-gmail-oauth__field">
          <span className="arco-gmail-oauth__field-label">
            <T k={I18nKey.APPS$EMAIL_PASSWORD} />
          </span>
          <PasswordInput
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={
              looksLikeGmail
                ? i18n.t(I18nKey.APPS$EMAIL_APP_PASSWORD_PLACEHOLDER)
                : i18n.t(I18nKey.APPS$EMAIL_PASSWORD_PLACEHOLDER)
            }
            width="full"
            autoComplete="current-password"
            disabled={connecting}
            onKeyDown={(event) => {
              if (event.key === "Enter") void connectPassword();
            }}
          />
        </label>

        <aside
          className={`arco-gmail-oauth__gmail-help${looksLikeGmail ? " arco-gmail-oauth__gmail-help--active" : ""}`}
          aria-label={i18n.t(I18nKey.APPS$EMAIL_GMAIL_APP_PASSWORD_TITLE)}
        >
          <p className="arco-gmail-oauth__gmail-help-title">
            <T k={I18nKey.APPS$EMAIL_GMAIL_APP_PASSWORD_TITLE} />
          </p>
          <p className="arco-gmail-oauth__gmail-help-lead">
            <T k={I18nKey.APPS$EMAIL_GMAIL_APP_PASSWORD_LEAD} />
          </p>
          <ol className="arco-gmail-oauth__gmail-help-steps">
            <li><T k={I18nKey.APPS$EMAIL_GMAIL_APP_PASSWORD_STEP_1} /></li>
            <li><T k={I18nKey.APPS$EMAIL_GMAIL_APP_PASSWORD_STEP_2} /></li>
            <li><T k={I18nKey.APPS$EMAIL_GMAIL_APP_PASSWORD_STEP_3} /></li>
            <li><T k={I18nKey.APPS$EMAIL_GMAIL_APP_PASSWORD_STEP_4} /></li>
          </ol>
          <a
            className="arco-gmail-oauth__gmail-help-link"
            href="https://myaccount.google.com/apppasswords"
            target="_blank"
            rel="noreferrer"
          >
            <T k={I18nKey.APPS$EMAIL_GMAIL_APP_PASSWORD_OPEN} />
          </a>
        </aside>

        {error ? <p className="arco-gmail-oauth__error">{error}</p> : null}
        <Button
          variant="primary"
          className="arco-gmail-oauth__google-btn"
          disabled={connecting || !email.trim() || !password}
          onClick={() => void connectPassword()}
        >
          {connecting ? <T k={I18nKey.APPS$EMAIL_SIGNING_IN} /> : <T k={I18nKey.APPS$EMAIL_SIGN_IN} />}
        </Button>
      </div>

      {configured ? (
        <>
          <p className="arco-gmail-oauth__divider">
            <T k={I18nKey.APPS$EMAIL_OR} />
          </p>
          <Button variant="default" className="arco-gmail-oauth__google-btn" onClick={() => api.connectGmail()}>
            <GoogleMark />
            <T k={I18nKey.APPS$EMAIL_CONNECT_WITH_GOOGLE} />
          </Button>
        </>
      ) : canManage && isEmail ? (
        <>
          <button
            type="button"
            className="arco-gmail-oauth__admin-link"
            onClick={() => setShowGoogleSetup((value) => !value)}
          >
            <T k={I18nKey.APPS$EMAIL_OAUTH_OPTIONAL_GOOGLE} />
          </button>
          {showGoogleSetup ? (
            <div className="arco-gmail-oauth__fields">
              <p className="arco-gmail-oauth__redirect">
                <T k={I18nKey.APPS$EMAIL_OAUTH_ADD_REDIRECT_URI} />{" "}
                {/* eslint-disable-next-line i18next/no-literal-string -- OAuth redirect URL */}
                <code className="arco-code arco-code--xs">{redirectUri}</code>
              </p>
              <Input
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                placeholder={i18n.t(I18nKey.APPS$EMAIL_OAUTH_CLIENT_ID_PLACEHOLDER)}
                width="full"
                autoComplete="off"
                disabled={saving}
              />
              <PasswordInput
                value={clientSecret}
                onChange={(event) => setClientSecret(event.target.value)}
                placeholder={i18n.t(I18nKey.APPS$EMAIL_OAUTH_CLIENT_SECRET_PLACEHOLDER)}
                width="full"
                autoComplete="off"
                disabled={saving}
              />
              <Button
                disabled={saving || !clientId.trim() || !clientSecret.trim()}
                onClick={() => void save()}
              >
                <T k={I18nKey.APPS$EMAIL_OAUTH_SAVE} />
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
