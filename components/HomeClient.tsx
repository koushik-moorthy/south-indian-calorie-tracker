"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import TextInputForm from "@/components/TextInputForm";
import ImageUploadForm from "@/components/ImageUploadForm";
import ManualEntryForm from "@/components/ManualEntryForm";
import DailyLog from "@/components/DailyLog";
import DailyGoal from "@/components/DailyGoal";
import SettingsPanel from "@/components/SettingsPanel";
import PlanPanel from "@/components/PlanPanel";
import DayInsights from "@/components/DayInsights";
import FoodSuggestions from "@/components/FoodSuggestions";
import AskCoach from "@/components/AskCoach";
import FastingTimer from "@/components/FastingTimer";
import PerformanceReview from "@/components/PerformanceReview";
import AuthForm from "@/components/AuthForm";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import type { PublicAuthConfig } from "@/lib/authConfig";
import {
  fetchLog,
  addLogEntry,
  updateLogEntry,
  removeLogEntry,
  fetchSettings,
  saveSettings,
  totalCalories,
  fetchWeights,
  addWeight,
  removeWeight,
  addManualEntry,
} from "@/lib/api";
import { entriesForDay, todayKey, timestampForDayKey, formatDayLabel } from "@/lib/dates";
import { defaultFasting, type FastingState } from "@/lib/fasting";
import type { AnalysisResult, LogEntry, Nutrition, WeightEntry } from "@/lib/types";
import type { StoredPlan } from "@/lib/plan";

/**
 * Client-side mirror of the server's `isEmailAllowed`, used only for UX (which
 * screen to show). The authoritative check lives server-side in `getUserClient`
 * — this never grants access on its own, it just avoids rendering the app for a
 * user the server would reject anyway.
 */
function emailAllowedClient(config: PublicAuthConfig, email?: string | null): boolean {
  if (!config.singleUserMode) return true;
  if (!config.allowedEmail) return false;
  return (email ?? "").trim().toLowerCase() === config.allowedEmail.trim().toLowerCase();
}

export default function HomeClient({ authConfig }: { authConfig: PublicAuthConfig }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [selectedDay, setSelectedDay] = useState<string>(() => todayKey());
  const [logLoading, setLogLoading] = useState(true);
  const [logError, setLogError] = useState<string | null>(null);
  const [dailyGoal, setDailyGoal] = useState<number | null>(null);
  const [plan, setPlan] = useState<StoredPlan | null>(null);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [fasting, setFasting] = useState<FastingState>(defaultFasting());

  // A signed-in user is "authorized" only if they pass the single-user gate.
  const authorized = !!session && emailAllowedClient(authConfig, session.user.email);

  // Always open at the top of the page, ignoring the browser's scroll restoration.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  // Track the auth session.
  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Load the log + goal whenever an authorized user is signed in.
  useEffect(() => {
    if (!session || !authorized) {
      setEntries([]);
      setDailyGoal(null);
      setPlan(null);
      setWeights([]);
      setFasting(defaultFasting());
      return;
    }
    setLogLoading(true);
    fetchLog()
      .then(setEntries)
      .catch((err: Error) => setLogError(err.message))
      .finally(() => setLogLoading(false));
    fetchSettings()
      .then((s) => {
        setDailyGoal(s.dailyGoal);
        setPlan(s.plan);
        setFasting(s.fasting ?? defaultFasting());
      })
      .catch(() => {});
    fetchWeights()
      .then(setWeights)
      .catch(() => {});
  }, [session, authorized]);

  function handlePlanSaved(stored: StoredPlan) {
    setPlan(stored);
    setDailyGoal(stored.result.dailyCalories);
  }

  async function handleFastingChange(next: FastingState) {
    const prev = fasting;
    setFasting(next); // optimistic
    try {
      await saveSettings({ fasting: next });
    } catch (err) {
      setFasting(prev);
      setLogError(err instanceof Error ? err.message : "Could not save fasting.");
    }
  }

  async function handleAddWeight(weightKg: number) {
    const saved = await addWeight(weightKg);
    setWeights((prev) => {
      const others = prev.filter((w) => w.recordedOn !== saved.recordedOn);
      return [...others, saved].sort((a, b) =>
        a.recordedOn < b.recordedOn ? -1 : a.recordedOn > b.recordedOn ? 1 : 0
      );
    });
  }

  async function handleRemoveWeight(id: string) {
    const prev = weights;
    setWeights((cur) => cur.filter((w) => w.id !== id)); // optimistic
    try {
      await removeWeight(id);
    } catch (err) {
      setWeights(prev);
      setLogError(err instanceof Error ? err.message : "Could not remove the check-in.");
    }
  }

  async function handleSaveGoal(goal: number | null) {
    await saveSettings({ dailyGoal: goal });
    setDailyGoal(goal);
  }

  async function handleAddToLog(r: AnalysisResult) {
    const today = todayKey();
    const addedAt = selectedDay === today ? undefined : timestampForDayKey(selectedDay);
    const saved = await addLogEntry(r, addedAt);
    setEntries((prev) => [...prev, saved]);
  }

  async function handleManualAdd(foodName: string, calories: number) {
    const today = todayKey();
    const addedAt = selectedDay === today ? undefined : timestampForDayKey(selectedDay);
    const saved = await addManualEntry(foodName, calories, addedAt);
    setEntries((prev) => [...prev, saved]);
  }

  async function handleUpdate(
    id: string,
    patch: { foodName: string; calories: number; nutrition: Nutrition }
  ) {
    const saved = await updateLogEntry(id, patch);
    setEntries((prev) => prev.map((e) => (e.id === id ? saved : e)));
  }

  async function handleRemove(id: string) {
    const prev = entries;
    setEntries((cur) => cur.filter((e) => e.id !== id)); // optimistic
    setLogError(null);
    try {
      await removeLogEntry(id);
    } catch (err) {
      setEntries(prev);
      setLogError(err instanceof Error ? err.message : "Could not remove.");
    }
  }

  async function handleClearDay(key: string) {
    const dayItems = entriesForDay(entries, key);
    if (dayItems.length === 0) return;
    const prev = entries;
    const ids = new Set(dayItems.map((e) => e.id));
    setEntries((cur) => cur.filter((e) => !ids.has(e.id))); // optimistic
    setLogError(null);
    try {
      await Promise.all(dayItems.map((e) => removeLogEntry(e.id)));
    } catch (err) {
      setEntries(prev);
      setLogError(err instanceof Error ? err.message : "Could not clear the day.");
    }
  }

  async function handleSignOut() {
    await getBrowserSupabase().auth.signOut();
    setSession(null);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <header className="mb-6 pr-24">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
          FoodCal
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Calorie estimates for Indian food — by name or photo.
        </p>
      </header>

      {!authReady ? (
        <p className="py-12 text-center text-sm text-slate-400">Loading…</p>
      ) : !session ? (
        <AuthForm
          signupEnabled={authConfig.signupEnabled}
          singleUserMode={authConfig.singleUserMode}
          allowedEmail={authConfig.allowedEmail}
        />
      ) : !authorized ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Access restricted
          </h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            This is a private deployment. The account{" "}
            <span className="font-medium">{session.user.email}</span> isn&apos;t
            authorized to use it.
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-700"
          >
            Sign out
          </button>
        </div>
      ) : (
        <>
          <SettingsPanel email={session.user.email} onSignOut={handleSignOut} />

          <div className="mb-6">
            <PlanPanel
              plan={plan}
              weights={weights}
              onPlanSaved={handlePlanSaved}
              onAddWeight={handleAddWeight}
              onRemoveWeight={handleRemoveWeight}
            />
          </div>

          {selectedDay !== todayKey() && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm dark:border-brand-500/30 dark:bg-brand-500/10">
              <span className="font-medium text-brand-800 dark:text-brand-200">
                Adding to {formatDayLabel(selectedDay, todayKey())}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDay(todayKey())}
                className="font-medium text-brand-700 hover:underline dark:text-brand-400"
              >
                Jump to today
              </button>
            </div>
          )}

          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <ImageUploadForm onAddToLog={handleAddToLog} />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <TextInputForm onAddToLog={handleAddToLog} />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <ManualEntryForm
                onAdd={handleManualAdd}
                dayLabel={formatDayLabel(selectedDay, todayKey())}
              />
            </section>
          </div>

          {logError && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {logError}
            </p>
          )}

          <div className="mt-6">
            <DailyGoal
              goal={dailyGoal}
              consumed={totalCalories(entriesForDay(entries, selectedDay))}
              onSave={handleSaveGoal}
            />
          </div>

          <div className="mt-6">
            <FastingTimer fasting={fasting} onChange={handleFastingChange} />
          </div>

          <div className="mt-6">
            <FoodSuggestions entries={entries} plan={plan} dailyGoal={dailyGoal} />
          </div>

          <div className="mt-6">
            <AskCoach entries={entries} plan={plan} dailyGoal={dailyGoal} />
          </div>

          <div className="mt-6">
            <DailyLog
              entries={entries}
              loading={logLoading}
              onRemove={handleRemove}
              onUpdate={handleUpdate}
              onClearDay={handleClearDay}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          </div>

          <div className="mt-6">
            <PerformanceReview
              entries={entries}
              weights={weights}
              plan={plan}
              dailyGoal={dailyGoal}
              fasting={fasting}
            />
          </div>

          <div className="mt-6">
            <DayInsights
              entries={entries}
              weights={weights}
              plan={plan}
              dailyGoal={dailyGoal}
              fasting={fasting}
            />
          </div>
        </>
      )}

      <footer className="mt-8 text-center text-xs text-slate-400">
        Calorie figures are AI estimates and may not be exact.
      </footer>
    </main>
  );
}
