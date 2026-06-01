# Contributing to FoodCal

Thanks for your interest in contributing! This guide covers how to set up the
project, the conventions we follow, and how to propose changes.

## Prerequisites
- **Node.js 20.9+** (see `.nvmrc`) and npm
- A **Supabase** project (free tier is fine)
- An **OpenAI API key** — entered per user in the app's Settings, not via env

## Local setup
```bash
npm install
cp .env.local.example .env.local   # fill in the values
```
Apply the database schema from [`supabase/migrations/`](supabase/migrations) (or
the SQL in the README) in your Supabase SQL editor, then:
```bash
npm run dev        # http://localhost:3000
```
See the [README → For developers](README.md#for-developers) and
[docs/architecture.md](docs/architecture.md) for the full picture.

## Checks to run before opening a PR
```bash
npm run typecheck   # tsc --noEmit (strict)
npm test            # Vitest
npm run build       # next build
npm run format      # Prettier (optional; formatting is not yet enforced in CI)
```
CI runs typecheck + tests + build on every PR; please make sure they pass.

## Project layout
- `app/` — routes & API handlers (the API routes are the backend; Node runtime)
- `components/` — React client components (single-page UI)
- `lib/` — framework-free logic, unit-tested (`lib/*.test.ts`)
- `docs/` — architecture, roadmap, product notes

## Conventions
- **TypeScript strict**; prefer small, single-purpose modules.
- Keep framework-free logic in `lib/` and add a `*.test.ts` for it.
- All API routes must authenticate through `getUserClient()` (the single
  auth/authorization chokepoint) and validate input.
- Never log or return secrets; the OpenAI key is encrypted at rest and must
  never reach the browser.
- Match the surrounding code style (comments, naming, idioms).

## Branches & commits
- Branch from `main`: `feat/...`, `fix/...`, `docs/...`, `chore/...`.
- Write clear, imperative commit messages (e.g. "Add rate limiting to AI routes").
- Reference issues where relevant (e.g. `Fixes #12`).

## Pull requests
- One focused change per PR; fill out the PR template checklist.
- Include tests for new logic and update docs when behavior changes.
- A maintainer will review; please be responsive to feedback.

## Good first issues
Look for issues labeled [`good first issue`](https://github.com/koushik-moorthy/south-indian-calorie-tracker/labels/good%20first%20issue).

## Reporting bugs & requesting features
Use the issue templates. For **security** issues, do **not** open a public
issue — see [SECURITY.md](SECURITY.md).

By contributing, you agree your contributions are licensed under the project's
[MIT License](LICENSE).
