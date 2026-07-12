# Security Policy

## Supported versions

Security fixes land on the current `main` branch of Arco / Kosmos. Hosted
instances are expected to run a recent build; self-hosted operators should
pull and redeploy promptly after advisories.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security bugs.

Email **security@kosmos.so** (or the address listed in the product footer)
with:

- A short description of the issue
- Steps to reproduce or a proof of concept
- Impact assessment (e.g. secret disclosure, auth bypass, cross-tenant)

We aim to acknowledge within **3 business days** and will coordinate a fix
and disclosure timeline with you.

## What we protect

| Asset | Approach |
| --- | --- |
| User passwords | scrypt (Argon2id migration planned) |
| Session cookies | HttpOnly; server stores SHA-256 digests only |
| API keys & OAuth tokens | Moving to encrypted vault at rest (`docs/security-plan.md`) |
| Payment cards | **Never stored** — Stripe Checkout / Customer Portal only |
| Hosted tenants | One Fly Firecracker microVM + volume per customer |

## Out of scope for this mailbox

- General product bugs and feature requests → normal GitHub issues
- Questions about configuring your own instance → docs / support

## Related docs

- `docs/security-plan.md` — full security roadmap (vault, MFA, audit)
- `deploy/fly/SAAS.md` — tenant isolation model
