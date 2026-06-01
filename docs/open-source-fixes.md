# Open-Source Fixes — What Claude Can Implement Automatically

Companion to [`open-source-audit.md`](open-source-audit.md). This lists fixes I can
apply on request, grouped by area. **Nothing here has been applied yet** (the
audit was scoped to "report only").

**Legend**
- 🟢 **Auto** — I can do this fully, no input needed.
- 🟡 **Auto + 1 decision** — I can do it once you answer a small question.
- 🔴 **Needs you** — requires a human step I can't safely do alone (e.g., logging into the live app, GitHub repo settings).

Each item notes the related audit finding / issue.

---

## Documentation
| # | Fix | Mode | Notes |
| --- | --- | --- | --- |
| D1 | Add `LICENSE` | 🟡 | Pick the license: **MIT** (recommended for max reuse) or Apache-2.0. I'll add the file + set `license` in `package.json`. |
| D2 | Remove `"private": true` from `package.json` (or keep, if you never want npm publish) | 🟡 | One decision; default = keep it (it's an app, not a package) but add a `license` field regardless. |
| D3 | Add `CHANGELOG.md` (seeded with v1.0 + the single-user-mode change) | 🟢 | Keep-a-Changelog format. |
| D4 | Fix naming consistency (repo `south-indian-calorie-tracker` vs package `foodcal` vs title "FoodCal") | 🟡 | Decide the canonical name; I'll align README/package/manifest. |
| D5 | Add a "Contributing" + "Security" + "License" pointer section to the README | 🟢 | Links to the new files. |
| D6 | Correct the incomplete README DB schema (add `weight_entries` + `plan`/`fasting`/`daily_calorie_goal`) | 🟢 | Audit §5; issues #25/#26. |

## Security
| # | Fix | Mode | Notes |
| --- | --- | --- | --- |
| S1 | Replace the real email in `lib/authConfig.test.ts` with `user@example.com` | 🟢 | PII (audit §1, blocker 2). Tests still pass (assertions are value-agnostic). |
| S2 | Redact the email in `docs/screenshots-index.md` | 🟢 | PII. |
| S3 | Stop leaking `err.message` to clients in `analyze-text`/`analyze-image`; standardize an `apiError()` helper | 🟢 | Finding S3; issues #24/#8. Low risk, well-scoped. |
| S4 | Remove (or flag-gate) the unreachable `OPENAI_API_KEY` fallback in `lib/openai.ts` | 🟡 | Finding S7 / issue #10 — decide "remove" vs "gate behind a flag". |
| S5 | Add `SECURITY.md` (supported versions + responsible-disclosure contact) | 🟡 | Needs a contact (a dedicated email or GitHub private vulnerability reporting). |
| S6 | Add a Content-Security-Policy header in `next.config.mjs` | 🔴→🟡 | Finding S4. I can draft a CSP (Supabase + OpenAI origins + inline-script hash), but it must be tested against the running app to avoid breakage — needs a verify pass. |
| S7 | Add rate limiting to AI routes (#5) | 🔴 | Requires choosing/provisioning a store (Upstash/Vercel KV) and credentials — your infra decision. I can scaffold the code once chosen. |
| S8 | **Re-capture screenshots/demos with a throwaway account + dummy data** | 🔴 | Requires logging into the running app (single-user-locked to your email). I can drive Playwright, but you must authenticate. Until then I can only *remove* the PII-bearing images. |

## Repository structure
| # | Fix | Mode | Notes |
| --- | --- | --- | --- |
| R1 | `.github/workflows/ci.yml` — typecheck + `npm test` + `next build` on push/PR | 🟢 | Issue #29. Biggest "serious project" signal. |
| R2 | ESLint + Prettier config + `lint`/`format` scripts | 🟢 | Issue #30. (`next lint` + a Prettier config.) |
| R3 | `.nvmrc` + `engines.node` in `package.json` (Node 20.9+) | 🟢 | Pin the toolchain. |
| R4 | `.editorconfig` | 🟢 | Cross-editor consistency. |
| R5 | `.github/dependabot.yml` (npm, weekly) | 🟢 | Keeps deps current. |
| R6 | Supabase migrations baseline (`supabase/migrations/0001_init.sql`) | 🟡 | Issue #28. I can commit the current schema as a baseline; decide whether to adopt the Supabase CLI workflow. |

## Contributor experience
| # | Fix | Mode | Notes |
| --- | --- | --- | --- |
| C1 | `CONTRIBUTING.md` (setup, branch/commit conventions, test/lint, PR flow) | 🟢 | Derived from the existing README dev section. |
| C2 | `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1) | 🟡 | Needs a contact email for reports. |
| C3 | `.github/ISSUE_TEMPLATE/` (bug_report.yml, feature_request.yml) + `config.yml` | 🟢 | Mirrors the labels already in use (bug/enhancement/technical-debt/future-feature). |
| C4 | `.github/PULL_REQUEST_TEMPLATE.md` | 🟢 | Checklist: tests, lint, docs, screenshots. |
| C5 | "Good first issue" curation | 🟡 | I can label suitable existing issues (e.g., #2, #3, #22, #30) via `gh` — confirm you want labels applied. |

## GitHub setup (via `gh` / repo settings)
| # | Fix | Mode | Notes |
| --- | --- | --- | --- |
| G1 | Set repo **description** + **topics** (`nextjs`, `supabase`, `openai`, `calorie-tracker`, `pwa`, `typescript`) | 🟢 | `gh repo edit` — improves discoverability. |
| G2 | Enable GitHub **private vulnerability reporting** | 🔴 | Repo setting toggle — you do it in Settings → Security (I can document the steps). |
| G3 | Branch protection on `main` (require CI + review) | 🔴 | Requires admin settings + an existing CI check (do after R1). I can document/apply via API if you authorize. |
| G4 | Add a license + community profile so GitHub's "Community Standards" page goes green | 🟢 | Achieved by D1 + C1 + C2 + S5 + templates above. |
| G5 | Make the hosted demo usable by reviewers (disable single-user lock on the public deploy, or add a seeded demo account) | 🔴 | Deployment/config decision on Vercel + Supabase — your call (audit §4 notes this materially affects Codex odds). |

---

## Suggested order (fastest path to "publishable")
1. **D1 + S1 + S2 + S8(remove images)** → clears the §1 blockers (license + PII). *Repo becomes safe to publish.*
2. **R1 + R2 + R3 + D3 + D6** → CI, lint, toolchain, changelog, correct schema. *Looks maintained.*
3. **C1 + C2 + S5 + C3 + C4 + G1** → contributor on-ramp + green community profile. *Looks like a real OSS project.*
4. **S3 + S6 + S7 + R6 + route tests** → close the security/quality gaps.
5. **S8(re-shoot) + G5** → restore demos with dummy data and an openable live demo.

Tell me which group to start with and I'll implement it (with verification where noted). I will not touch code until you say go.
