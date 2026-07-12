# Arco / Kosmos — Security Plan

> Status: DRAFT v0.1 (Jul 2026). Companion to `docs/saas-plan.md` (hosted
> isolation), `docs/agent-extensibility-plan.md` (audit + secret masking),
> `docs/open-standards-map.md` (auth → OAuth 2.1/OIDC), and the Key Wallet
> stub (`src/apps/key-wallet/`). This doc owns secrets, MFA, payments
> posture, instance safety/legal audit, and published policies.

**Goal:** people can trust Arco with API keys, account credentials, and
billing — without us inventing cryptography. Prefer mature open standards
and proven open-source patterns; keep PCI scope out of our systems.

---

## 1. Current state (verified)

| Asset | Storage today | Protection today | Gap |
| --- | --- | --- | --- |
| LLM / Cursor / provider API keys | `data/settings.json` or `LLM_*` env | Plaintext on disk; masked as `••••` + last 4 on API reads | No encryption at rest |
| Channel bot tokens | `data/channels.json` | Plaintext; API mask | Same |
| GitHub / Gmail OAuth tokens | `data/github-accounts.json`, `data/mail-accounts.json` | Plaintext; file mode `0o600`; never sent to client | Encrypt at rest |
| External MCP / Access tokens | `data/external-clients.json` | Plaintext (prototype); shown once at mint | Hash like sessions, or encrypt |
| Automation webhook secrets | `automations.json` | Plaintext UUID | Encrypt or hash verify-only |
| User passwords | `data/users.json` | **scrypt** (`scrypt$N$r$p$salt$hash`); `0o600` | Keep; add MFA |
| Auth sessions | `data/auth-sessions.json` | **SHA-256 digests**; HttpOnly cookie; 30-day TTL | Device list UI; MFA step-up |
| Payment cards | — | **Not stored** — Stripe Checkout / Customer Portal | Keep forever |
| Hosted tenant LLM keys | Fly machine env (`LLM_API_KEY`) | Env visible to org Fly tokens | Prefer secrets endpoint / encrypt in control DB |
| Control-plane operator secrets | Fly secrets / env | OK for ops | Rotate + document |
| Control-plane tenant keys | SQLite (`virtualKey`, billing tokens) | Plaintext columns | Encrypt columns or vault |
| Key Wallet UI | `src/apps/key-wallet/` | Stub / mock data | Wire to real vault API |
| MFA / 2FA | Settings stub “Set up” | None | Greenfield |
| Privacy / Terms | Signup checkboxes | Links to missing www pages | Ship pages |
| Instance audit | `data/audit.jsonl` + control-plane `activity` | Per-tenant + operator | Export, retention, legal pack |

**Trust boundary today:** one Fly Firecracker microVM + volume per tenant
(see `deploy/fly/SAAS.md`). Filesystem isolation is the main defense for
plaintext secrets. That is necessary but not sufficient once volumes are
backed up, snapshotted, or accessed by operators.

---

## 2. Threat model (what we design against)

### In scope

1. **Stolen volume / backup** — attacker reads `ARCO_DATA_DIR` offline.
2. **Compromised session cookie** — XSS or device theft while unlocked.
3. **Insider / operator access** — control-plane or Fly org token can inspect
   machine env or DB.
4. **Agent misuse** — agent with `exec` can read files the server can read;
   secrets must not live in agent-visible plaintext paths when avoidable.
5. **Account takeover** — password phishing, credential stuffing, lost device.
6. **Secret exfiltration via UI/API** — mask bypass, log leakage, error dumps.
7. **Legal / compliance demand** — need exportable evidence of what happened
   on an instance without handing over raw secrets.

### Out of scope (for now)

- Full SOC 2 Type II program (narrative first; audit later when hosted volume
  justifies cost).
- Building a card vault or payment processor (Stripe remains PCI boundary).
- Defending a shared multi-tenant process (we do not share process memory
  across customers).

### Non-goals

- Do not claim “military-grade” or “unhackable.”
- Do not store PAN / CVV / full card numbers.
- Do not use SMS MFA as the primary factor (SIM-swap); optional later only.

---

## 3. Principles

1. **Never invent crypto.** Use well-reviewed libraries and algorithms
   (AES-256-GCM, scrypt/Argon2id, WebAuthn, standard TOTP).
2. **Least plaintext.** Decrypt only in-process at the moment of use; never
   return full secrets to the browser after write.
3. **PCI out of process.** Cards → Stripe only. We store Stripe customer /
   subscription IDs, never card data.
4. **Isolation + encryption.** MicroVM isolation and encryption at rest are
   complementary, not alternatives.
5. **Open standards over custom.** WebAuthn, TOTP (RFC 6238), OAuth 2.1 /
   OIDC, OpenAPI for audit export.
6. **Honest policy.** Publish what we collect, retain, and delete — and what
   we cannot see inside a customer VM.
7. **Step-up for sensitive acts.** Changing password, minting External Access
   tokens, revealing/rotating vault secrets, billing changes → re-auth / MFA.

---

## 4. Prior art — mature systems to copy (not reimplement)

Kosmos should **adopt patterns**, and where practical **reuse libraries**,
from systems that already hold secrets at scale.

| System | What to learn | What to use |
| --- | --- | --- |
| **Chromium Password Manager / OS Crypt** | OS-bound encryption: DPAPI (Windows), Keychain (macOS), libsecret/kwallet (Linux); encrypt blob, not invent format | Desktop/self-host: wrap master key with OS keychain (`keytar`, Electron `safeStorage`, or Tauri stronghold) |
| **Bitwarden / Vaultwarden** | Zero-knowledge vault model; encrypted org collections; audit events; emergency access | Architecture of sealed items + folders; Vaultwarden as reference server if we ever offer a sync vault |
| **1Password / age / Mozilla sops** | Envelope encryption (DEK wrapped by KEK); secrets as structured items | Envelope crypto for every secret record |
| **HashiCorp Vault / OpenBAO** | Dynamic secrets, leases, audit device, AppRole | Pattern for lease TTL + audit; too heavy to embed — optional external backend for enterprise |
| **Mozilla Firefox / Lockwise (historical)** | Sync of encrypted blobs; local unlock | Unlock UX: one vault unlock per session |
| **KeePass / KeePassXC** | Local encrypted DB (Argon2 + AES/ChaCha); open format | Fallback for air-gapped / export interchange (optional `.kdbx` export) |
| **pass (password-store) + GPG** | Unix-y secret files | Inspiration for CLI/`arco secrets` later — not primary UX |
| **Google Authenticator / Aegis / FreeOTP** | TOTP interoperability | `otpauth://` URIs + QR enroll; library: `otpauth` / `@otplib/preset-default` |
| **Apple Passkeys / Chrome WebAuthn** | Discoverable credentials; phishing-resistant MFA | `@simplewebauthn/server` + browser WebAuthn API |
| **Stripe Elements / Checkout** | PCI SAQ A — redirect or Stripe-hosted fields | Keep Checkout + Customer Portal only |
| **Auth0 / Keycloak / Authentik / Pocket ID** | MFA enrollment UI, backup codes, session devices | UX reference for Settings “Authentication methods” modal; Keycloak/Authentik if we outsource IdP later |
| **Sigstore / cosign** | Supply-chain signing | Future: sign release artifacts and desktop builds |

**Recommendation:** build a **small sealed-secrets vault inside each instance**
(Chromium/Bitwarden-style envelope encryption + OS or env KEK), not a
full HashiCorp Vault deployment. Optionally allow enterprise to point
`SECRETS_BACKEND=vault` later.

---

## 5. Secrets & API keys — design

### 5.1 Product surface: Key Wallet becomes real

Key Wallet (`src/apps/key-wallet/`) is the single UX for:

- LLM / provider API keys (`apiKeys`, `LLM_API_KEY`, Cursor, etc.)
- MCP env/header secrets
- Channel bot tokens
- External Access client secrets (or hashes)
- ACP / integration credentials
- Model registry `apiKeyRef` targets

Rules:

- Create/update: accept plaintext once → store ciphertext → UI shows
  `••••` + last 4 + “configured.”
- Read API for clients: **never** returns plaintext.
- Server-side consumers (LLM client, channel gateway, MCP spawn): decrypt
  via vault service only.
- Delete: shred ciphertext + audit event.
- Rotate: write new version; keep previous version briefly if needed for
  in-flight jobs; audit both.

### 5.2 Envelope encryption

```
plaintext secret
    → AES-256-GCM with random DEK (data encryption key)
    → DEK wrapped with KEK (key encryption key)
    → store: { ciphertext, nonce, wrappedDek, keyId, last4, meta }
```

| Deploy mode | KEK source | Unlock |
| --- | --- | --- |
| **Hosted (Fly)** | `ARCO_SECRETS_KEK` from Fly Secrets (not on volume) | Automatic at process start |
| **Desktop / Electron** | OS keychain via Chromium `safeStorage` / `keytar` | First unlock after login / OS unlock |
| **Self-host Docker** | Env or mounted secret file (Docker/K8s secret) | Process start |
| **Enterprise (later)** | Customer-managed key or external Vault Transit | Configured backend |

**Key rotation:** support `keyId` so re-wrap can migrate ciphertext without
re-entering every secret. Document operator runbook.

**Libraries (Node):** prefer `crypto` (Node built-in) for AES-GCM; do not
pull obscure crypto packs. For OS keychain binding on desktop, use Electron
`safeStorage` if desktop shell is Electron, else `keytar`.

### 5.3 Storage layout

Replace ad-hoc plaintext fields with vault references:

```jsonc
// Conceptual — settings / channels store refs, not raw secrets
{
  "apiKeyRef": "vault:llm/openrouter#v3",
  "telegramBotTokenRef": "vault:channel/telegram-main#v1"
}
```

Physical store options (pick one in implementation):

1. **`data/secrets.vault.json`** (or SQLite `secrets` table) — sealed items,
   mode `0o600`, same volume as today.
2. Migrate existing plaintext on first boot after upgrade (one-way migrate +
   backup `.pre-vault` then delete).

Align permissions: every secrets-adjacent file uses `0o600` (today
`settings.json` / `channels.json` / `external-clients.json` are inconsistent).

### 5.4 External client tokens

Match session hygiene:

- Mint: show raw token **once**.
- Persist: **SHA-256 digest** only (like `auth-sessions.json`), or sealed
  vault entry if the server must echo a recoverable secret (prefer hash).
- API list: last 4 + label + created/last-used — never full token.

### 5.5 Agent & logs

- Agent tools must not dump env or vault plaintext into chat/audit bodies.
- Audit records: `secret_id`, `action` (`decrypt_for_llm`, `rotate`,
  `delete`), principal, timestamp — **not** secret values.
- Redact known patterns in logs (`sk-`, `xoxb-`, bearer tokens).

### 5.6 Control plane

- Encrypt `virtualKey` / billing bearer material in SQLite (same AES-GCM +
  control-plane KEK from Fly Secrets).
- Prefer Fly Secrets over machine env for tenant LLM keys when API allows;
  until then, treat machine env as sensitive and rotate via provisioner.
- Operator admin: shared `ADMIN_TOKEN` → move toward per-operator accounts
  + MFA (Phase 3+).

### 5.7 What “good” looks like

| Scenario | Expected result |
| --- | --- |
| Volume stolen | Ciphertext only; useless without KEK |
| Backup of `/data` leaked | Same |
| XSS in shell | HttpOnly cookie still needs MFA step-up for vault reveal / rotate |
| Agent `cat settings.json` | Refs + ciphertext, or no raw keys |
| Support engineer with Fly token | Cannot read customer plaintext secrets without KEK policy |

---

## 6. Passwords & session security

### Keep

- scrypt password hashes (`server/auth/userStore.ts`).
- Session digests + HttpOnly cookie (`sessionStore.ts`).
- Login rate limit (5 failures → 15 min lockout).
- Password change revokes other sessions.
- Idle lock screen (~15 min).

### Improve

| Item | Action |
| --- | --- |
| Hash algorithm | Prefer **Argon2id** for new hashes; verify scrypt on login and rehash on success (gradual migrate) |
| Password policy | Minimum length 12+; check against breached-password list (Have I Been Pwned k-anonymity API or local bloom) — optional, privacy-sensitive |
| Session devices UI | List sessions (created, last seen, user-agent); revoke one / revoke all |
| Secure cookies | `ARCO_SECURE_COOKIES=1` required on hosted HTTPS |
| CSRF | Confirm SameSite + origin checks on state-changing routes |
| Lock vs logout | Keep both; lock requires unlock password/MFA without full logout |

---

## 7. Credit cards & billing

**Policy: Arco never stores card numbers, CVVs, or track data.**

| Flow | Implementation |
| --- | --- |
| Subscribe / update payment | Stripe Checkout or Customer Portal redirect |
| In-app Pay app | Remains stub / redirect — no custom card forms |
| Webhooks | Verify `STRIPE_WEBHOOK_SECRET`; store customer + subscription IDs only |
| PCI SAQ | Aim for **SAQ A** (Stripe-hosted payment pages) |
| Invoices / tax | Stripe Tax / invoicing as needed — still no PAN |

If product ever needs “save a card on file” UX inside Arco, use **Stripe
Elements / Payment Element** only — card data posts to Stripe, not our
server. Do not build a card vault.

---

## 8. Multi-factor authentication (MFA)

### 8.1 UX target

Settings → Security → modal patterned on mature account-security UIs
(Notion / Google / GitHub style):

- Tabs: **Authentication methods** | **Contact information**
- Banner: encourage ≥2 methods as backup
- Badges: **More secure** (passkey, security key, TOTP) vs **Less secure**
  (SMS, if ever)
- Footer CTA: review recovery contact info

### 8.2 Method tiers

| Priority | Method | Standard | Notes |
| --- | --- | --- | --- |
| **P0** | Authenticator app (TOTP) | RFC 6238 | Google Authenticator, Aegis, 1Password, Authy |
| **P0** | Backup codes | One-time hashed codes | 8–10 codes; regenerate invalidates old |
| **P1** | Passkeys / security keys / Touch ID | WebAuthn / Passkeys | One implementation covers platform + roaming authenticators |
| **P2** | Email OTP | Short-lived code | Recovery / step-up; needs reliable mail |
| **Defer** | SMS OTP | — | Cost, SIM-swap, “Less secure”; only if demanded |
| **Later** | SSO (OIDC) | OAuth 2.1 / OIDC | Org accounts; complements MFA (see `open-standards-map.md`) |

**Do not** ship six separate credential systems. One `mfa_credentials`
store + challenge pipeline at login and step-up.

### 8.3 Server model (sketch)

```
users
  mfa_enabled: boolean
  mfa_required_for: ["login", "step_up"]

mfa_totp
  user_id, secret_encrypted, verified_at, label

mfa_webauthn
  user_id, credential_id, public_key, sign_count, transports, label

mfa_backup_codes
  user_id, code_hash[], generated_at

mfa_challenges
  id, user_id, type, expires_at, consumed
```

TOTP secrets and WebAuthn private material: store TOTP secret in the
**secrets vault** (or encrypt with same KEK). Backup codes: **hash only**.

### 8.4 Flows

1. **Enroll TOTP** — generate secret → QR (`otpauth://`) → verify one code →
   enable MFA → show backup codes once.
2. **Login** — password OK → if MFA enabled, challenge TOTP or WebAuthn →
   session issued.
3. **Step-up** — sensitive route returns `403 mfa_required` → client
   completes challenge → short-lived step-up token.
4. **Recovery** — backup code or verified recovery email; disable MFA only
   after step-up or admin reset with audit.
5. **Disable MFA** — require current MFA + password.

### 8.5 Libraries

- TOTP: `otpauth` or `@otplib/preset-default`
- WebAuthn: `@simplewebauthn/server` + `@simplewebauthn/browser`
- QR: `qrcode` (enroll UI only)

---

## 9. Safety & legal audit of instances

### 9.1 Published policies (unblock signup)

Ship on kosmos-www (or arco.app) and wire env:

| Document | Purpose |
| --- | --- |
| **Privacy Policy** | What we collect (signup email, billing metadata, operator logs); what stays in the customer VM; subprocessors (Fly, Stripe, LLM providers) |
| **Terms of Service** | Acceptable use, agent responsibility, suspension, age ≥18 |
| **SECURITY.md** | Vulnerability disclosure contact; isolation model; encryption roadmap |
| **Community / AUP** (optional) | Abuse, malware, scraping limits |

Control plane already gates signup on ToS/Privacy checkboxes
(`TERMS_URL` / `PRIVACY_URL`) — pages must exist.

### 9.2 Instance isolation (document as security feature)

Already true — make it a customer-facing claim:

- One Fly app + volume + Firecracker microVM per tenant
- Separate LiteLLM virtual key + budget
- Control plane holds registry; Stripe secrets stay off tenants

Document limits: Kosmos operators with Fly org access can manage machines;
encryption + policy reduce (not eliminate) insider risk.

### 9.3 Audit logging — productize

| Layer | Today | Target |
| --- | --- | --- |
| Instance | `audit.jsonl` (grants, agent, external) | Stable schema; Settings UI; filter by actor/action |
| Auth | Partial (login lockout in-memory) | Persist login success/fail, MFA enroll/disable, password change |
| Secrets | None | decrypt/rotate/delete metadata only |
| Control plane | `activity` table | Retain; link to tenant id |

### 9.4 Legal / safety audit pack

Operator (and later customer) can export an **instance evidence pack**:

- Provision / suspend / destroy timeline (control plane)
- Auth event summary
- Agent/tool audit slice (time-bounded)
- Secret access metadata (ids only)
- Config fingerprint (versions, safety level) — no raw secrets

Formats: signed ZIP or JSON bundle + SHA-256 manifest. Retention policy
(e.g. 90 days default, configurable). Deletion: honor destroy + data-subject
erasure (GDPR-style) with documented exceptions (billing records).

### 9.5 Agent safety levels

Promote `safetyLevel` from UI/mock to **enforced policy**:

| Level | Example constraints |
| --- | --- |
| Strict | Confirm all writes; no unrestricted egress; no secret decrypt for tools |
| Standard | Confirm destructive; allow networked tools with grant |
| Permissive | Power user; still audit |

Tie to grants already in `server/platform/grantStore.ts`.

### 9.6 Compliance narrative (honest staging)

| Stage | Claim |
| --- | --- |
| Now | Single-tenant isolation; Stripe PCI boundary; password hashing; audit log exists |
| After Phase 1–2 | Encryption at rest for secrets; MFA; published Privacy/Terms |
| Later | DPA template; subprocessors list; SOC 2 when revenue justifies |

Do not advertise SOC 2 / HIPAA / FedRAMP until obtained.

---

## 10. Phased roadmap

### Phase 0 — Policy & hygiene (days)

- [ ] Write and host Privacy Policy + Terms; wire www footer + control-plane URLs
- [x] Add root `SECURITY.md` (disclosure email, isolation summary)
- [x] Normalize `0o600` on all secret-adjacent files (`server/security/secureFs.ts`)
- [x] Redact secrets helper for logs / error strings (`server/security/redactSecrets.ts`)
- [ ] Document “we never store cards” in Pay/billing UI copy

### Phase 1 — Secrets vault (weeks)

- [x] Vault crypto: AES-256-GCM envelope seal/unseal (`server/security/vaultCrypto.ts`)
- [x] Vault store: `data/secrets.vault.json` + metadata API (`server/security/vaultStore.ts`)
- [x] KEK from `ARCO_SECRETS_KEK` (dev fallback documented)
- [x] Migrate settings `apiKey` / `cursorApiKey` / `apiKeys` into vault on load/save
- [ ] Wire Key Wallet UI to real API; kill mock data path
- [ ] External client tokens → digest-only
- [ ] Audit events for secret lifecycle
- [ ] Control-plane: encrypt SQLite secret columns
- [ ] Channel / MCP / OAuth token migration into vault

### Phase 2 — MFA P0 (weeks)

- [ ] TOTP enroll/verify/disable
- [ ] Backup codes
- [ ] Login + step-up challenge API
- [ ] Settings “Authentication methods” modal (authenticator + backup; stubs for passkeys)
- [ ] Persist auth failure / MFA events

### Phase 3 — MFA P1 + sessions (weeks)

- [ ] WebAuthn passkeys + security keys
- [ ] Session / device list + revoke
- [ ] Email OTP for recovery (if mail pipeline ready)
- [ ] Argon2id migrate for passwords

### Phase 4 — Legal audit & retention (weeks)

- [ ] Instance evidence pack export (admin + owner)
- [ ] Retention config + deletion API
- [ ] Enforce agent safety levels
- [ ] Subprocessors + DPA draft
- [ ] Optional: desktop OS-keychain KEK binding

### Phase 5 — Hardening & enterprise (ongoing)

- [ ] OIDC SSO for orgs (`open-standards-map.md`)
- [ ] Optional external KMS / Vault Transit backend
- [ ] Per-operator control-plane accounts + MFA
- [ ] Signed releases (cosign); desktop notarization
- [ ] Bug bounty / responsible disclosure program
- [ ] SOC 2 readiness when appropriate

---

## 11. API sketch (instance)

```
# Vault
PUT    /api/vault/secrets          # create (plaintext in, ref out)
GET    /api/vault/secrets          # list metadata only
PATCH  /api/vault/secrets/:id      # rotate
DELETE /api/vault/secrets/:id
POST   /api/vault/secrets/:id/reveal   # step-up required; rare; audit

# MFA
GET    /api/auth/mfa/methods
POST   /api/auth/mfa/totp/begin
POST   /api/auth/mfa/totp/confirm
POST   /api/auth/mfa/webauthn/register/...
POST   /api/auth/mfa/backup/regenerate
POST   /api/auth/mfa/challenge
POST   /api/auth/mfa/verify

# Audit / legal
GET    /api/audit?from=&to=&actor=
GET    /api/audit/export           # evidence pack (owner/admin)
DELETE /api/account/data           # data-subject erase (hosted flow)
```

---

## 12. Testing & acceptance

| Area | Tests |
| --- | --- |
| Vault | Round-trip seal/unseal; wrong KEK fails; migrate plaintext → sealed; API never leaks plaintext |
| MFA | TOTP window skew; backup single-use; WebAuthn sign_count; step-up expiry |
| Sessions | Revoke all on password change; stolen cookie without MFA cannot rotate vault |
| Billing | No PAN in DB/logs; webhook signature required |
| Audit | Export contains metadata only; destroy removes volume per policy |
| Desktop | Kill app → secrets not in plaintext files |

---

## 13. Open questions

1. **Desktop KEK:** Electron `safeStorage` vs user passphrase (passphrase =
   true zero-knowledge; worse UX)?
2. **Operator break-glass:** Can Kosmos support ever decrypt a hosted vault
   (support) or is customer KEK-only (lost key = lost secrets)?
3. **SMS:** Ever offer, or permanently document as unsupported?
4. **Secret sync across devices:** Out of scope until multi-device identity;
   Bitwarden-style sync is a different product.
5. **Agent access to vault:** Default deny decrypt for tools; allowlist per
   grant?

---

## 14. References (in-repo)

| Path | Relevance |
| --- | --- |
| `src/apps/key-wallet/` | Vault UI stub to replace |
| `server/env.ts` | Settings load/save + mask pattern |
| `server/auth/userStore.ts` | scrypt passwords |
| `server/auth/sessionStore.ts` | Session digests |
| `server/platform/grantStore.ts` | `audit.jsonl` |
| `server/platform/externalClients.ts` | External tokens |
| `server/github/githubStore.ts` / `server/mail/mailStore.ts` | OAuth tokens |
| `deploy/fly/SAAS.md` | Per-tenant isolation |
| `docs/saas-plan.md` | Hosted economics + ToS note |
| `docs/open-standards-map.md` | Auth → OIDC bridge |
| `docs/agent-extensibility-plan.md` | Masking; vault called out as future |

**External standards:** RFC 6238 (TOTP), WebAuthn Level 2 / Passkeys, OAuth
2.1, OWASP ASVS (application verification), PCI DSS SAQ A, GDPR Art. 15/17
(access/erasure) as design targets — not certifications.

---

## 15. One-line summary

**Isolate every tenant, encrypt every secret, never touch card data, add
TOTP+passkeys like Chrome/Bitwarden/GitHub, and ship honest Privacy/Terms
plus exportable instance audits** — in that order.
