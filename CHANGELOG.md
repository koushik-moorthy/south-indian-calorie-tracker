# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims
to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Single-user mode** (`SINGLE_USER_MODE` / `ALLOWED_EMAIL`): a reversible,
  server-enforced allowlist that hides sign-up and restricts access to one
  account, with no code changes to switch back to multi-user.
- Best-effort in-memory **rate limiting** on AI endpoints (`lib/rateLimit.ts`).
- Production **Content-Security-Policy** header.
- Project governance & tooling: `LICENSE` (MIT), `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue/PR templates, CI workflow,
  Dependabot, Prettier, `.editorconfig`, `.nvmrc`, and `engines`.
- Developer documentation: `docs/architecture.md`, `docs/roadmap.md`, and a
  developer-focused README.
- Versioned database schema baseline under `supabase/migrations/`.

### Changed
- API routes no longer return raw upstream/internal error text to clients
  (generic messages; details logged server-side).
- Corrected and completed the documented database schema (added
  `weight_entries` and the `plan` / `fasting` / `daily_calorie_goal` columns).

### Removed
- The unused server-side `OPENAI_API_KEY` fallback in `lib/openai.ts` (the app
  is strictly bring-your-own-key).
- Screenshots containing personal data (to be re-captured with demo data).

### Security
- See [SECURITY.md](SECURITY.md) for the security model and hardening status.

## [1.0.0] - 2026-05-31
### Added
- Text and photo (vision) calorie estimation with bring-your-own OpenAI key.
- Daily log with history and CSV/JSON export; daily calorie goal.
- Personalized plan (TDEE/macros), weight check-ins and progress chart.
- Fasting timer; AI coach (suggestions, Q&A, day/performance reviews).
- Installable PWA; light/dark themes.
- Supabase Auth + Postgres with row-level security; encrypted per-user API key.
