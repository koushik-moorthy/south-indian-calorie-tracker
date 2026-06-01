# Security Policy

## Supported versions
The project is pre-1.0 in spirit; only the latest `main` is supported with
security fixes.

| Version | Supported |
| --- | --- |
| latest `main` | ✅ |
| older commits | ❌ |

## Reporting a vulnerability
**Please do not open a public issue for security vulnerabilities.**

Report privately via GitHub's **Private Vulnerability Reporting**:
**[Open a draft advisory »](https://github.com/koushik-moorthy/south-indian-calorie-tracker/security/advisories/new)**
(Repository → **Security** tab → **Report a vulnerability**.)

Please include: affected area/endpoint, reproduction steps, impact, and any
suggested fix. We aim to acknowledge reports within a few days and to address
valid issues promptly. Please allow reasonable time for a fix before any public
disclosure.

## Security model (what to keep in mind)
- **Auth & data isolation:** Supabase Auth (bearer token) + Postgres
  **row-level security** (`auth.uid() = user_id`) on every table; the server
  acts *as the user* (no service-role key).
- **Secrets at rest:** each user's OpenAI key is encrypted with AES-256-GCM
  (`SETTINGS_ENC_KEY`, server-only) and is never returned to the browser.
- **Single-user mode:** an optional, server-enforced allowlist
  (`SINGLE_USER_MODE` / `ALLOWED_EMAIL`) that fails closed.

## Known limitations / hardening in progress
- **Rate limiting** is currently a best-effort, in-memory layer
  (`lib/rateLimit.ts`); on multi-instance/serverless hosting it is per-instance,
  not global. A shared store (Upstash/Vercel KV) is the planned upgrade
  ([#5](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/5)).
- The production **Content-Security-Policy** uses `script-src 'unsafe-inline'`
  for Next/theme inline scripts; tightening to nonces/hashes is a follow-up.
- In multi-user mode, accounts are auto-confirmed (no email verification) unless
  you enable SMTP confirmation in Supabase.

Please factor these into any report.
