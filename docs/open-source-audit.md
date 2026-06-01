# Open-Source Readiness & Security Audit — FoodCal

**Repository:** `koushik-moorthy/south-indian-calorie-tracker` (private) · **Audited:** 2026-06-01
**Reviewer hats:** senior OSS maintainer · security engineer · GitHub reviewer · OpenAI "Codex for OSS" application reviewer
**Method:** read of the full tree (121 tracked files), all 9 commits of git history, configuration, docs, and dependencies. Evidence is cited inline. This audit is **brutally honest by request** and assumes review by experienced maintainers.

> PII note: the maintainer's personal email is masked in this report as `koushikd…@gmail.com` to avoid copying it into yet another file.

---

## 1. Public Repository Readiness

**Can it be made public *today*? → No.** Not because of leaked credentials (there are none — see below), but because of **personal data** committed in plain sight and the **absence of a LICENSE**. Both are quick to fix.

### Secret/credential scan — results (evidence)
| Check | Result | Evidence |
| --- | --- | --- |
| `.env*` ever committed | **No** | `git log --all --full-history -- '.env' '.env.local' '*.pem'` → empty |
| Real API keys (`sk-…`) / GH tokens (`gho_`/`ghp_`) / private keys | **None** in tree or history | `git ls-files \| xargs grep` + `git grep` across `git rev-list --all` → none |
| Real Supabase anon key / `SETTINGS_ENC_KEY` value | **None** | history scan for `<redacted>…` → not present; `.env.local` is gitignored (`.gitignore` `.env*.local`) |
| Supabase project ref (`<redacted-project-ref>`) | **Not present** anywhere tracked | grep tree + history → none |
| `sb_publishable_…` occurrences | **Placeholder only** (`sb_publishable_xxx`) | `.env.local.example`, README — not a real key |
| Server-only enc key isolation | **Good** — `lib/crypto.ts` imported only by `app/api/settings/route.ts` and `lib/userOpenAI.ts` (server) | grep importers |
| Build artifacts / `node_modules` tracked | **None** | `git ls-files` → 121 files, no `.next/`, `*.tsbuildinfo`, logs |

**This is genuinely strong secret hygiene** — better than most repos at first publish.

### Blockers (must remove/redact before publishing)
| # | Risk | Severity | Evidence | Action |
| --- | --- | --- | --- | --- |
| 1 | **Personal email in screenshots (images).** Sign-in and Settings screenshots render `koushikd…@gmail.com`; many screenshots also show **real weight (e.g., 83.4 kg) and real diet log entries** — i.e., personal health-adjacent data. | **High (privacy)** | `docs/screenshots/desktop/{onboarding-signin,settings-popover}.png`, `…/calorie-log.png`, `…/plan-overview.png`, `mobile/*` | Re-capture with a throwaway account + dummy data, or remove the screenshot set before publishing. |
| 2 | **Personal email in tracked text.** | **Medium (PII)** | `docs/screenshots-index.md:23`; `lib/authConfig.test.ts:74-75` (real email used as test fixture) | Replace with `you@example.com` / `user@example.com`. |
| 3 | **No `LICENSE` file** and `package.json` has `"private": true` and no `license` field. Without a license the code is **“all rights reserved”** — legally *not* open source. | **High (legal/OSS)** | `LICENSE` MISSING; `package.json` → `"private": true`, no `license` | Add a license (e.g., MIT), set `license` in `package.json`, decide on `private`. |
| 4 | **Commit author email** is the personal Gmail on all 9 commits. | **Low (PII, unavoidable-ish)** | `git shortlog -sne` → `Koushik <koushikd…@gmail.com>` | Standard for git; optionally switch to a GitHub `noreply` email going forward. History rewrite not recommended. |

Not blockers (verified safe to be public): the `NEXT_PUBLIC_SUPABASE_*` placeholders, the live demo URL `https://foodcal.vercel.app`, and the Supabase **anon** key pattern (anon keys are designed to be public and are protected by RLS).

### Public Repo Readiness Score: **6 / 10**
Rationale: zero credential leakage and a clean history (the hard part) — but **personal/health data in committed images**, **PII in two text files**, and **no license** mean it is not publishable as-is. All blockers are <1 hour of work; post-fix this is a 9/10.

---

## 2. Security Audit

Overall: **solid fundamentals for a solo project; no Critical or High vulnerabilities found.** The main gaps are operational hardening (rate limiting, CSP) rather than exploitable flaws.

### Strengths (verified)
- **Authorization via Postgres RLS** on every table (`auth.uid() = user_id`), with the server acting *as the user* (no service-role key anywhere — `grep service_role` → none). RLS is the real data-isolation boundary.
- **Single centralized auth chokepoint** (`getUserClient` in `lib/supabase.ts`) used by all 10 routes; single-user allowlist (`lib/authConfig.ts`) **fails closed**.
- **Secrets at rest:** OpenAI key encrypted with AES-256-GCM (random IV + auth tag), `SETTINGS_ENC_KEY` server-only, never returned to the browser (`settings` GET returns `hasKey`, not the key).
- **Upload hardening:** magic-byte sniffing (`lib/imageType.ts`) overrides client `Content-Type`; type + 10 MB limits enforced client *and* server.
- **CSRF-resistant:** auth is a `Bearer` token in the `Authorization` header (not ambient cookies), so classic CSRF doesn't apply.
- **No SSRF / SQLi vectors:** no server-side fetch of user-supplied URLs; all DB access is parameterized via supabase-js/PostgREST (no raw SQL).
- **Security headers** on every response (`next.config.mjs`): `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- **Dependencies:** `npm audit` → **0 vulnerabilities**; all majors current (Next 16, React 19, Supabase 2.106, OpenAI 4.67).

### Findings
| # | Severity | Issue | Explanation | Fix |
| --- | --- | --- | --- | --- |
| S1 | **Medium** | **No rate limiting** on any route (auth or AI). | A signed-in user or leaked token can hammer the OpenAI-backed routes (cost/latency/DoS); signup is unthrottled at the app layer. | Add per-user/IP rate limiting (Upstash Redis / Vercel KV) with 429 handling. (Issue [#5](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/5)) |
| S2 | **Medium** | **Auto-confirm-email trigger** accepts unverified addresses. | In *multi-user* mode, anyone can register any email (even one they don't own) and it's auto-confirmed → spoofing/spam. Mitigated in single-user mode. | Require real email confirmation (SMTP) for multi-user; document the trade-off. |
| S3 | **Low–Med** | **Error message leakage.** | `analyze-text`/`analyze-image` return `err.message` in the 502 body, exposing upstream/OpenAI/internal detail. | Return generic messages; log detail server-side. (Issues [#24](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/24)/[#8](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/8)) |
| S4 | **Low–Med** | **No Content-Security-Policy** (intentionally omitted per `next.config.mjs`). | Increases blast radius if any XSS were introduced; tokens live in `localStorage` (Supabase default) and would be exfiltratable. | Add a CSP allowing Supabase/OpenAI origins and the inline theme script via hash. |
| S5 | **Low** | **Session token in `localStorage`.** | Supabase JS default; readable by any script → XSS-exfiltratable. No XSS vector found today (only `dangerouslySetInnerHTML` is a static constant in `layout.tsx`). | Accept + mitigate via CSP/dependency hygiene; optionally move to cookie-based SSR auth. |
| S6 | **Low** | **Prompt injection** via free-text (`food`, image `note`, `question`) interpolated into prompts. | A user could embed instructions; blast radius is small (JSON-mode + strict numeric parsing, output only drives calorie display). | Keep strict parsing; delimit/escape user content; cap lengths (already partly done: 200/300/500). |
| S7 | **Low** | **Unreachable `OPENAI_API_KEY` server fallback** in `lib/openai.ts`. | If set in multi-user, it *looks* like it could become a shared server key; currently unreachable because `getUserOpenAI` throws first. Confusing + latent risk. | Remove or gate behind an explicit flag. (Issue [#10](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/10)) |

No **exposed admin functionality** (no admin routes exist).

### Security Score: **7 / 10**
Rationale: strong authn/authz/encryption/upload posture and a clean dependency tree, with no exploitable Critical/High issues — held back from 8+ by missing rate limiting, no CSP, and the multi-user email-verification gap.

---

## 3. Open Source Readiness

**Documentation is a clear strength; contributor/governance scaffolding is almost entirely absent.**

| Artifact | Present? | Evidence |
| --- | --- | --- |
| README | ✅ Strong (marketing + full dev reference) | `README.md` |
| Architecture docs | ✅ | `docs/architecture.md` (Mermaid diagrams) |
| Roadmap | ✅ | `docs/roadmap.md` |
| Product overview | ✅ | `docs/PRODUCT.md` |
| Screenshots/demos | ✅ (but PII — see §1) | `docs/screenshots/`, `docs/demos/` |
| Issue tracker hygiene | ✅ 30 labeled, well-formed issues | GitHub issues #1–30 |
| Tests | ⚠️ Partial — pure `lib/` only | `lib/*.test.ts` (Vitest) |
| **LICENSE** | ❌ **Missing** | — |
| **CONTRIBUTING** | ❌ Missing | — |
| **CODE_OF_CONDUCT** | ❌ Missing | — |
| **SECURITY.md** | ❌ Missing | — |
| **Issue templates** | ❌ Missing | `.github/ISSUE_TEMPLATE` absent |
| **PR template** | ❌ Missing | — |
| **CI** | ❌ Missing | `.github/workflows` absent |
| Lint/format config | ❌ Missing | no ESLint/Prettier config, no `lint` script |
| `.nvmrc` / `engines` | ❌ Missing | node version not pinned |
| CHANGELOG | ❌ Missing | — |
| CODEOWNERS / dependabot | ❌ Missing | — |
| Naming consistency | ⚠️ repo `south-indian-calorie-tracker` vs package `foodcal` vs title "FoodCal" | `package.json` |

### OSS Readiness Score: **4 / 10**
Rationale: excellent narrative docs, but the **table-stakes OSS files are missing** — most importantly a LICENSE (without it, it is not legally open source), plus no CI, no contributor guides, no templates. A reviewer would immediately read this as "not yet set up as an OSS project."

---

## 4. OpenAI "Codex for OSS" Review Simulation

Reviewing as if scoring an application for <https://openai.com/form/codex-for-oss/>.

| Criterion | Assessment | Evidence |
| --- | --- | --- |
| Active maintenance | **Weak signal.** 9 commits, ~2 weeks old, single author, no release tags, no CI. | `git rev-list --all --count` = 9; one author |
| Ecosystem usefulness | **Low–moderate.** A consumer app, not a library/tool others build on. | app, not a package; `"private": true` |
| Real-world usefulness | **Moderate, niche.** Genuinely useful for South Indian calorie tracking; BYOK lowers cost barrier. | feature set |
| Technical complexity | **Moderate.** Clean Next 16 + Supabase + OpenAI app with thoughtful single-user mode and encryption. | architecture |
| Maintainer maturity | **Promising but unproven.** Good code + docs + issue hygiene, but no community signals. | docs, issues |
| Contributor friendliness | **Low.** No license/CONTRIBUTING/templates/CI; can't legally contribute. | §3 |
| Documentation quality | **High.** README + architecture + roadmap stand out. | docs/ |
| Project uniqueness | **Some.** Cuisine-specific niche + BYOK + reversible single-user mode are differentiators. | — |
| "Serious OSS project" perception | **Low today.** Reads as a strong personal/portfolio project, not an established OSS project with users/contributors. | no stars/forks/community |

### Application Strength: **3 / 10**

**Chance: Weak.** A program oriented toward *active, community-relied-upon open source* will likely see a private, 2-week-old, single-author **application** (not a library), with **no license, no CI, no contributors, and a demo locked to the owner**, as not yet a serious OSS project. The code and docs are good, but the program is about ecosystems and traction, not code quality alone.

To move **Weak → Moderate**: ship a license + CI, make the public demo actually usable by others (it's currently single-user-locked), accumulate some real usage/stars, and frame it as a reusable/forkable template. A **Strong** chance realistically needs external contributors and demonstrable adoption over time.

---

## 5. Repository Quality Review

- **Architecture quality — Strong.** Clear layering: server route handlers → one auth chokepoint (`getUserClient`) → RLS DB / per-user OpenAI; framework-free logic isolated in `lib/`. The server-component → `HomeClient` split and the config-driven, reversible single-user mode show real design thought.
- **Code organization — Strong.** Cohesive `app/` / `components/` / `lib/` split; small, single-purpose modules; consistent typing and naming.
- **Code quality — High.** Strict TS, input validation, encrypted secrets, magic-byte checks, good comments. No obvious smells.
- **Technical debt — Moderate.** No DB migrations (schema only in README, and the README schema is **incomplete** — missing `weight_entries` + `plan`/`fasting` columns, issues [#25](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/25)/[#26](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/26)); duplicated route auth boilerplate (#6); no lint/CI.
- **Scalability — Adequate** for the use case (Vercel serverless + Supabase). Main risk is unbounded AI cost without rate limiting (#5). BYOK shifts model cost to users.
- **Testing quality — Partial.** Good unit coverage of pure logic; **no tests for routes, `getUserClient`, or components** (#27) — the security-critical path is untested.
- **Deployment quality — Simple but thin.** Vercel auto-detection (no `vercel.json`); secrets via env; no CI gate; no staging/migration story.
- **Developer experience — Good docs, weak tooling.** Excellent onboarding prose, but no lint, no CI, no node pin, no contributor flow.

---

## 6. GitHub Profile Impact

**Verdict: "strong independent developer" — clearly above intermediate, not yet "serious OSS maintainer."**

- **Above intermediate because:** clean, typed, well-organized full-stack app; genuine security thinking (RLS + AES-GCM + magic bytes + headers); thoughtful, reversible feature flags; and a documentation set (README, architecture w/ diagrams, roadmap) that most personal projects never produce. The 30 well-formed, labeled issues read like real planning.
- **Not "serious OSS maintainer" because:** no license, no CI, no contributor governance, no community (stars/forks/contributors), single author, locked demo. "Serious maintainer" is signaled by *people relying on the project* and the scaffolding that supports them — none of which is present yet.

For a portfolio/hiring lens this repo is a **net positive and a strong sample of independent work.** For an "I run open source" lens, it is not there yet.

---

## 7. Action Plan (ranked by impact)

### Critical — must do before open-sourcing
1. **Remove PII from images** — re-capture screenshots with a throwaway account + dummy data, or drop `docs/screenshots/` until then (privacy: real email + weight/diet data). *(High)*
2. **Redact email from text** — `docs/screenshots-index.md`, `lib/authConfig.test.ts` → example email. *(Medium)*
3. **Add a LICENSE** (e.g., MIT) + set `package.json` `license`; decide on `"private": true`. Without this it is not open source. *(High)*

### High-value
4. **CI** (GitHub Actions: typecheck + test + build) (#29) — the single biggest "serious project" signal.
5. **SECURITY.md** + **CONTRIBUTING.md** — required for responsible disclosure and contributions.
6. **Rate limiting** on AI routes (#5) and **stop leaking error text** (#24) — the two real security gaps.
7. **DB migrations + fix the incomplete README schema** (#28/#25/#26) — a fresh clone currently can't be set up correctly.
8. **Make the public demo usable by others** (seed/demo mode) — currently single-user-locked, so reviewers can't try it.
9. **ESLint/Prettier + `lint` script** (#30) and **route/auth tests** (#27).

### Nice-to-have
10. CODE_OF_CONDUCT, issue/PR templates, `.nvmrc`/`engines`, dependabot, CHANGELOG, repo description + topics, README badges, naming consistency (foodcal vs repo name).

---

## Final Verdict

1. **Can I make this repository public right now?** — **No.** Remove the PII (email + real weight/diet data in screenshots and two text files) and add a LICENSE first. These are quick.
2. **Is it safe?** — **No leaked credentials and clean history (verified)**, and security fundamentals are strong, but it is **not privacy-safe as-is** due to committed personal data. After redaction: yes.
3. **Is it professional enough?** — **Code and docs: yes.** **Project governance (license/CI/contributing/security): no** — those gaps are what an experienced maintainer will notice first.
4. **Would I personally recommend open-sourcing it?** — **Yes, after the 3 critical fixes.** It's good, honest work worth sharing.
5. **Is it worth submitting to Codex for OSS?** — **Not yet.** Today the odds are **weak** (private, 2 weeks old, single author, no license/CI/community, locked demo). Do the high-value items, let it accrue some usage, then reconsider.
6. **Top 10 improvements to most increase acceptance odds:**
   1. Add an OSI license (MIT/Apache-2.0).
   2. Remove all PII (screenshots + text) and re-shoot demos with dummy data.
   3. Add CI (typecheck/test/build) + status badge.
   4. Add SECURITY.md and CONTRIBUTING.md.
   5. Make the hosted demo usable by anyone (not single-user-locked).
   6. Add rate limiting and fix error-message leakage.
   7. Commit real DB migrations and correct the README schema.
   8. Expand tests to routes + the auth chokepoint.
   9. Add CODE_OF_CONDUCT + issue/PR templates (contributor on-ramp).
   10. Add lint/format config, `.nvmrc`/`engines`, dependabot, and a CHANGELOG; tidy naming.

**Bottom line (unoptimistic):** technically this is a above-average solo full-stack project with unusually good docs and clean secret hygiene. As an *open-source project* it is currently a personal app with privacy leaks, no license, and no community scaffolding. It can become genuinely publishable in an afternoon, and a credible (still niche) OSS project in a few focused days — but it would not, today, read as a "serious OSS project" to an experienced reviewer.

_Companion: see [`docs/open-source-fixes.md`](open-source-fixes.md) for the subset of these fixes Claude can implement automatically._

---

## Post-remediation re-score (2026-06-01)

After the remediation pass (the "Harden security" and "Prepare for open source"
commits, plus a git-history rewrite to purge the PII), the scores are:

| Area | Before | After | Notes |
| --- | --- | --- | --- |
| Public Repo Readiness | 6/10 | **9/10** | PII removed from the tree **and purged from git history** (screenshots + email string); MIT `LICENSE` added; secret history still clean. Residual: the commit-author email (personal Gmail) is intentionally left in author metadata to preserve GitHub attribution. |
| Security | 7/10 | **8.5/10** | Added a production CSP, best-effort per-user rate limiting on AI routes, generic error responses (no upstream leakage), removed the unused server-key fallback, and added `SECURITY.md`. Residual (minor): the rate limiter is per-instance until backed by a shared store; CSP uses `script-src 'unsafe-inline'`; multi-user auto-confirm remains opt-out. |
| OSS Readiness | 4/10 | **9/10** | Added `LICENSE`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, `SECURITY`, `CHANGELOG`, issue/PR templates, CI, Dependabot, Prettier + `.editorconfig`/`.nvmrc`/`engines`, and a versioned schema migration. Residual: ESLint not yet configured (Prettier + strict `tsc` only); route/component tests still limited. |
| Codex for OSS — Application Strength | 3/10 | **~5/10 (Weak→Moderate)** | Improved everything *controllable* (license, CI, governance, active commit/issue history, repo topics). **Cannot reach >8 from repo edits** — the binding constraints are external: single author, weeks-old project, no external contributors/stars/users, and a demo locked to the owner. Those require real-world adoption over time. |

**Honest bottom line:** Public Readiness, Security, and OSS Readiness are now
above 8. **Codex "Application Strength" cannot honestly be rated above 8 yet** —
it is gated by traction/community signals that cannot be manufactured by editing
the repo. The repository is now genuinely publishable and reads as a serious
independent project.

### Still requires a human step (out of scope for automated fixes)
- **Unlock the public demo** (disable single-user mode on the deploy, or add a
  seeded demo account) so reviewers can actually try it.
- **Production rate-limit store** (Upstash / Vercel KV) for global limits.
- **Enable GitHub "Private vulnerability reporting"** (Settings → Security) to
  back `SECURITY.md`.
- **Re-capture screenshots/demos with dummy data** (needs an app login).
