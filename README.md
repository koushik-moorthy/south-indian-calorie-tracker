# South Indian Calorie Tracker

A lightweight web app to quickly estimate calories from South Indian foods using
either a **text description** ("2 idlis", "1 masala dosa") or a **food photo**.
Users sign in with email + password (**Supabase Auth**); each account stores its
own OpenAI API key, chosen model, and daily log in **Supabase** (Postgres),
isolated by row-level security.

## Tech Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS**
- **OpenAI API** (text + vision, default model `gpt-4o-mini`), bring-your-own-key
- **Supabase** — Auth (email/password) + Postgres, with row-level security

## Auth & security model

- **Login required.** Email + password via Supabase Auth. The browser holds the
  session; every API request carries the access token as a `Bearer` header.
- **Per-user data.** `user_settings` and `log_entries` are scoped by
  `auth.uid()` through RLS, so each user only ever sees their own rows.
- **API key (BYOK) is encrypted at rest.** When you save it, the server encrypts
  it with AES-256-GCM using `SETTINGS_ENC_KEY` (a server-only secret) and stores
  only the ciphertext. It is decrypted **server-side only** when calling OpenAI
  and is **never returned to the browser** — Settings shows a "Key saved" status,
  not the key.
- **Model name** is saved per user (RLS-protected) alongside the key.
- **Hardening.** Uploaded images are validated by their actual magic bytes (not a
  client-supplied Content-Type) before being sent to OpenAI. Baseline security
  headers are applied to every response (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` — camera allowed for capture, mic/geo
  denied — and HSTS).

> New accounts are auto-confirmed via a database trigger so email/password works
> without configuring SMTP. To require real email verification, remove the
> `auto_confirm_email` trigger and enable "Confirm email" in the Supabase
> dashboard (Authentication → Providers → Email) with SMTP configured.

## Features

- Text input → food name, serving size, calories, confidence, notes
- Food photo → vision-based estimate, via **image upload** or **live in-app camera
  capture** (JPG / PNG / WEBP, max 10 MB, with preview)
- **Adjustable servings** on a result — scale calories and the full nutrition
  breakdown up or down before adding it to the log
- Add results to a daily log and remove items
- **Day-by-day history** — browse previous days with per-day calorie totals and
  nutrition; clear an individual day
- **Export** your full log as **CSV** or **JSON**
- Set a daily calorie goal and see today's remaining (or over) count down as you log
- Automatic total calories, persisted across refreshes
- **Installable PWA** — add to a phone home screen for a standalone, full-screen
  app with its own icon
- Mobile responsive, clean UI, friendly error handling

## Project Structure

```
.
├── app/
│   ├── api/
│   │   ├── analyze-text/route.ts    # POST: text → JSON estimate (auth + per-user key)
│   │   ├── analyze-image/route.ts   # POST: image → JSON estimate (auth + per-user key)
│   │   ├── log/route.ts             # GET/POST/DELETE: daily log CRUD (auth, RLS)
│   │   └── settings/route.ts        # GET/POST: per-user model + encrypted key
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                     # Auth gating + single-page UI + log state
├── components/
│   ├── AuthForm.tsx                 # email/password sign in / sign up
│   ├── TextInputForm.tsx
│   ├── ImageUploadForm.tsx
│   ├── ResultCard.tsx
│   ├── NutritionBreakdown.tsx
│   ├── SettingsPanel.tsx            # server-backed key + model settings
│   └── DailyLog.tsx
├── lib/
│   ├── openai.ts                    # OpenAI client, prompts, JSON parsing
│   ├── userOpenAI.ts                # load + decrypt a user's key/model server-side
│   ├── crypto.ts                    # AES-256-GCM encrypt/decrypt for the key
│   ├── supabase.ts                  # server: token-auth'd, RLS-scoped client
│   ├── supabaseBrowser.ts           # browser: auth client + access token
│   ├── api.ts                       # client-side fetch helpers (auth header)
│   ├── nutrition.ts                 # macro/micro fields + aggregation
│   ├── settings.ts                  # model constants + UserSettings type
│   └── types.ts                     # shared TypeScript types
├── .env.local.example
└── package.json
```

## 1. Local Setup

```bash
npm install
```

## 2. Environment Variables

Copy the example file and fill in the values:

```bash
cp .env.local.example .env.local
```

```
# Supabase — find these in the dashboard under Project Settings → API.
# The publishable (anon) key is safe to expose to the browser.
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx

# Server-only secret to encrypt each user's OpenAI key at rest (AES-256-GCM).
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
SETTINGS_ENC_KEY=base64-32-byte-secret
```

There is **no** `OPENAI_API_KEY` env var — each user enters their own key in the
app's Settings after signing in (it's encrypted and stored server-side).

## 3. Supabase Schema

Apply this in the SQL editor (Auth is enabled by default on every project):

```sql
-- Per-user settings: encrypted OpenAI key + chosen model.
create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  openai_key_cipher text,
  model text not null default 'gpt-4o-mini',
  daily_calorie_goal integer,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy "own settings - select" on public.user_settings for select to authenticated using (auth.uid() = user_id);
create policy "own settings - insert" on public.user_settings for insert to authenticated with check (auth.uid() = user_id);
create policy "own settings - update" on public.user_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Daily log, scoped to the authenticated user.
create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  food_name text not null,
  calories integer not null default 0,
  nutrition jsonb,
  created_at timestamptz not null default now()
);
create index log_entries_user_created_idx on public.log_entries (user_id, created_at desc);
alter table public.log_entries enable row level security;
create policy "own log - select" on public.log_entries for select to authenticated using (auth.uid() = user_id);
create policy "own log - insert" on public.log_entries for insert to authenticated with check (auth.uid() = user_id);
create policy "own log - delete" on public.log_entries for delete to authenticated using (auth.uid() = user_id);

-- Auto-confirm new accounts (so email/password works without SMTP).
-- Remove this and enable "Confirm email" once you wire up email delivery.
create or replace function public.auto_confirm_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is null then new.email_confirmed_at := now(); end if;
  return new;
end; $$;
revoke execute on function public.auto_confirm_email() from public, anon, authenticated;
create trigger auto_confirm_email_trigger before insert on auth.users
  for each row execute function public.auto_confirm_email();
```

Run the dev server:

```bash
npm run dev
```

Open <http://localhost:3000>.

## Testing

Pure logic (date grouping, serving scaling, CSV/JSON export, image-type sniffing)
is unit-tested with [Vitest](https://vitest.dev):

```bash
npm test         # run once
npm run test:watch
```

## 4. Deploy to Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. Go to <https://vercel.com/new> and import the repository.
3. In **Project Settings → Environment Variables**, add all three:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SETTINGS_ENC_KEY`
4. Click **Deploy**. Vercel auto-detects Next.js — no extra config needed.

To deploy from the CLI instead:

```bash
npm i -g vercel
vercel --prod
```

## Notes

- Calorie values are AI estimates and may not be exact.
- Each account's API key, model, and log are stored in Supabase under RLS; the
  key is encrypted with `SETTINGS_ENC_KEY` and never sent back to the browser.
- On Supabase's free tier, a project auto-pauses after ~7 days of inactivity;
  restore it from the dashboard if the app stops working.
