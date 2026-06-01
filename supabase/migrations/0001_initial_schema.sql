-- FoodCal — baseline schema (matches the running app).
-- Apply in the Supabase SQL editor, or via `supabase db push`.
-- Auth is enabled by default on every Supabase project.

-- ---------------------------------------------------------------------------
-- Per-user settings: encrypted OpenAI key, chosen model, goal, plan, fasting.
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  openai_key_cipher  text,
  model              text not null default 'gpt-4o-mini',
  daily_calorie_goal integer,
  plan               jsonb,
  fasting            jsonb,
  updated_at         timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy "own settings - select" on public.user_settings
  for select to authenticated using (auth.uid() = user_id);
create policy "own settings - insert" on public.user_settings
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own settings - update" on public.user_settings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Daily log, scoped to the authenticated user.
-- ---------------------------------------------------------------------------
create table if not exists public.log_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  food_name  text not null,
  calories   integer not null default 0,
  nutrition  jsonb,
  created_at timestamptz not null default now()
);
create index if not exists log_entries_user_created_idx
  on public.log_entries (user_id, created_at desc);
alter table public.log_entries enable row level security;
create policy "own log - select" on public.log_entries
  for select to authenticated using (auth.uid() = user_id);
create policy "own log - insert" on public.log_entries
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own log - update" on public.log_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own log - delete" on public.log_entries
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Weight check-ins. One row per user per day (the API upserts on this key).
-- ---------------------------------------------------------------------------
create table if not exists public.weight_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  weight_kg   numeric not null,
  recorded_on date not null default current_date,
  created_at  timestamptz not null default now(),
  unique (user_id, recorded_on)
);
alter table public.weight_entries enable row level security;
create policy "own weights - select" on public.weight_entries
  for select to authenticated using (auth.uid() = user_id);
create policy "own weights - insert" on public.weight_entries
  for insert to authenticated with check (auth.uid() = user_id);
create policy "own weights - update" on public.weight_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own weights - delete" on public.weight_entries
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-confirm new accounts so email/password works without SMTP.
-- Remove this trigger and enable "Confirm email" once you wire up email
-- delivery (see SECURITY.md for the multi-user trade-off).
-- ---------------------------------------------------------------------------
create or replace function public.auto_confirm_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is null then new.email_confirmed_at := now(); end if;
  return new;
end; $$;
revoke execute on function public.auto_confirm_email() from public, anon, authenticated;
drop trigger if exists auto_confirm_email_trigger on auth.users;
create trigger auto_confirm_email_trigger before insert on auth.users
  for each row execute function public.auto_confirm_email();
