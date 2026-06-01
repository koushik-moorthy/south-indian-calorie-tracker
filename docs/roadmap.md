# FoodCal — Roadmap

A pragmatic, repo-grounded plan for the next three releases. Items link to the
tracked GitHub issues so the roadmap stays tied to the actual backlog.

**Where we are (v1.0, shipped).** Text/photo calorie estimates (BYOK OpenAI),
daily log with history + CSV/JSON export, a personalized plan with TDEE/macros,
weight check-ins + progress chart, fasting timer, AI coach (suggestions / Q&A /
reviews), single-user mode, and an installable PWA. Stack: Next.js 16 (App
Router) · React 19 · TypeScript · Tailwind · Supabase (Auth + Postgres/RLS).
See [`docs/architecture.md`](architecture.md).

## Guiding principles

- **Stabilize before expanding.** Correctness, schema integrity, and a CI/quality
  baseline come before new features.
- **Build on existing primitives.** Prefer features that reuse what's already
  here (RLS data model, the plan/fasting/weight engines, the PWA shell).
- **Keep AI bounded and replaceable.** We deliberately avoid speculative,
  hard-to-maintain AI. We keep using OpenAI the way we do today — BYOK,
  JSON-mode with strict parsing, no fine-tuning, no autonomous agents — and we
  invest in *guardrails* (rate limits, image downscaling, cost controls), not new
  AI bets. Where a deterministic data source exists (e.g., a packaged-food
  database), we prefer it over a model. See
  [Deliberately deferred](#deliberately-deferred).
- **Reversible & config-driven.** New capabilities should degrade gracefully and
  be toggleable, in the spirit of the existing single-user flag.

---

## Version 1.1 — Stabilize & harden

**Theme:** fix correctness bugs, close the schema/docs gaps, and stand up a
quality baseline. Almost entirely small, high-confidence work.

| Item | Issue | Effort |
| --- | --- | --- |
| Fix plan headline showing an infeasible target date | [#21](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/21) | S |
| Remove the duplicated "consult …" disclaimer | [#22](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/22) | S |
| Fix weight check-in local-vs-UTC date mismatch | [#1](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/1) | S |
| Cap manual/edited calorie input | [#3](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/3) | S |
| Camera viewfinder loading/placeholder state | [#2](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/2) | S |
| Make log edit/delete controls visible & touch-usable | [#23](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/23) | S |
| Stop leaking upstream error text; standardize `ApiError` | [#24](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/24), [#8](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/8) | S |
| Document `weight_entries` + unique constraint; complete README schema | [#25](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/25), [#26](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/26) | S |
| Version-control the schema (Supabase migrations baseline) | [#28](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/28) | M |
| CI: typecheck + tests + build on PRs | [#29](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/29) | S |
| ESLint + Prettier + `lint` script | [#30](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/30) | S |
| Clarify/remove the unreachable `OPENAI_API_KEY` fallback | [#10](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/10) | S |

**Definition of done:** no known correctness bugs; the schema lives in
migrations and matches the docs; green CI gates every PR.

---

## Version 1.2 — Guardrails, maintainability & high-value extensions

**Theme:** protect cost/abuse, pay down the highest-leverage tech debt, and add
a few well-bounded user features that reuse existing data — no new AI surface.

**Guardrails & cost (hardening existing AI, not new AI):**
| Item | Issue | Effort |
| --- | --- | --- |
| Rate limiting on the OpenAI-backed routes | [#5](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/5) | M |
| Client-side image downscaling before upload (cuts tokens & latency) | [#7](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/7) | M |

**Maintainability:**
| Item | Issue | Effort |
| --- | --- | --- |
| `withUser()` route wrapper (remove auth/401 boilerplate) | [#6](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/6) | M |
| Tests for API routes + the authorization chokepoint | [#27](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/27) | M |
| Complete accessibility pass (WCAG AA) | [#9](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/9) | M |
| Auto-resolve/cap a forgotten running fast | [#4](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/4) | M |

**User features (reuse existing primitives, zero new AI):**
| Item | Issue | Why it fits | Effort |
| --- | --- | --- | --- |
| Saved meals / favorites + meal builder | [#12](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/12) | Re-adds analyzed items without re-calling OpenAI — improves UX *and* cuts cost | M |
| Streaks & achievements | [#15](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/15) | Pure client/DB logic on data we already store | M |
| Water + selected micronutrient tracking | [#17](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/17) | Extends the existing nutrition model and goals | M |

**Definition of done:** AI endpoints are rate-limited and cheaper per request;
the auth/route layer has test coverage; "saved meals" measurably reduces repeat
AI calls.

---

## Version 2.0 — Platform & reach

**Theme:** larger, structural bets that broaden who can use FoodCal and where —
each realistic and maintainable, built on foundations already in the repo.

| Item | Issue | Rationale |
| --- | --- | --- |
| **Productionize multi-user** — account management, usage visibility | (new) | Single-user mode + RLS already exist; this matures the multi-user path the codebase was built for |
| **Offline-first + background sync** | [#20](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/20) | The PWA manifest ships today but there's no service worker; enables logging without connectivity |
| **PWA push reminders** (meals, weigh-in, fasting window) | [#14](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/14) | Pairs with the service worker from offline work; pure scheduling, no AI |
| **Internationalization (Tamil + English)** | [#16](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/16) | The audience is South Indian; UI + prompts are English-only |
| **Barcode scanning for packaged foods** | [#11](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/11) | Uses a maintained external DB (e.g., Open Food Facts) — *deterministic* nutrition that reduces reliance on AI estimates |
| **Health platform sync** (Apple Health / Google Fit) | [#13](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/13) | Removes manual weigh-in friction; can refine TDEE from real activity |
| **Shareable weekly/monthly report** (PDF/email) | [#18](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/18) | Built on data we already have; useful for sharing with a coach/doctor |

**Definition of done:** a non-technical user can install the PWA, use it offline,
get reminders, scan a packaged item, and read the app in Tamil.

---

## Deliberately deferred

To honor the "no speculative, hard-to-maintain AI" principle, these are **not
planned** (or parked) with reasons:

- **Voice input logging** ([#19](https://github.com/koushik-moorthy/south-indian-calorie-tracker/issues/19)) — *parked.* Browser speech-to-text is unreliable for Tamil/South-Indian dish names and adds UX surface for marginal gain. Revisit only if a low-maintenance, accurate STT path emerges.
- **Custom or fine-tuned food models** — high upkeep (data pipelines, retraining, evals) for uncertain accuracy gains over a hosted model. The barcode DB is the better lever for precision.
- **Always-on / continuous-camera auto-logging** — costly, privacy-heavy, and brittle.
- **Autonomous "agent" coaching or real-time multimodal assistants** — require constant prompt babysitting and are hard to keep reliable; the current bounded JSON-mode calls already cover the coaching use cases well.

---

## Issue → version map

| Version | Issues |
| --- | --- |
| **1.1** | #1, #2, #3, #8, #10, #21, #22, #23, #24, #25, #26, #28, #29, #30 |
| **1.2** | #4, #5, #6, #7, #9, #12, #15, #17, #27 |
| **2.0** | #11, #13, #14, #16, #18, #20 (+ multi-user productionization) |
| **Deferred** | #19 (+ unticketed speculative-AI items) |

_Effort key: S ≈ ≤ half day · M ≈ 1–4 days · L ≈ 1–2 weeks. Priorities and
effort estimates live on each GitHub issue._
