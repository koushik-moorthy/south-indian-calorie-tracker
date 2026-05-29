"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import TextInputForm from "@/components/TextInputForm";
import ImageUploadForm from "@/components/ImageUploadForm";
import ResultCard from "@/components/ResultCard";
import DailyLog from "@/components/DailyLog";
import DailyGoal from "@/components/DailyGoal";
import SettingsPanel from "@/components/SettingsPanel";
import AuthForm from "@/components/AuthForm";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";
import {
  fetchLog,
  addLogEntry,
  removeLogEntry,
  clearLog,
  fetchSettings,
  saveSettings,
  totalCalories,
} from "@/lib/api";
import type { AnalysisResult, LogEntry } from "@/lib/types";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(true);
  const [logError, setLogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dailyGoal, setDailyGoal] = useState<number | null>(null);

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

  // Load the log + goal whenever a user is signed in.
  useEffect(() => {
    if (!session) {
      setEntries([]);
      setResult(null);
      setDailyGoal(null);
      return;
    }
    setLogLoading(true);
    fetchLog()
      .then(setEntries)
      .catch((err: Error) => setLogError(err.message))
      .finally(() => setLogLoading(false));
    fetchSettings()
      .then((s) => setDailyGoal(s.dailyGoal))
      .catch(() => {});
  }, [session]);

  async function handleSaveGoal(goal: number | null) {
    await saveSettings({ dailyGoal: goal });
    setDailyGoal(goal);
  }

  async function handleAdd(r: AnalysisResult) {
    setSaving(true);
    setLogError(null);
    try {
      const saved = await addLogEntry(r);
      setEntries((prev) => [...prev, saved]);
      setResult(null);
    } catch (err) {
      setLogError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
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

  async function handleClear() {
    const prev = entries;
    setEntries([]); // optimistic
    setLogError(null);
    try {
      await clearLog();
    } catch (err) {
      setEntries(prev);
      setLogError(err instanceof Error ? err.message : "Could not clear.");
    }
  }

  async function handleSignOut() {
    await getBrowserSupabase().auth.signOut();
    setSession(null);
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div className="text-left">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
            South Indian Calorie Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Estimate calories from a food name or a photo.
          </p>
        </div>
        {session && (
          <button
            type="button"
            onClick={handleSignOut}
            className="mr-12 shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Sign out
          </button>
        )}
      </header>

      {!authReady ? (
        <p className="py-12 text-center text-sm text-slate-400">Loading…</p>
      ) : !session ? (
        <AuthForm />
      ) : (
        <>
          {session.user.email && (
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Signed in as <span className="font-medium">{session.user.email}</span>
            </p>
          )}

          <div className="mb-6">
            <SettingsPanel />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <TextInputForm onResult={setResult} />

            <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              OR
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <ImageUploadForm onResult={setResult} />
          </section>

          {result && (
            <div className="mt-6">
              <ResultCard result={result} onAdd={handleAdd} saving={saving} />
            </div>
          )}

          {logError && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
              {logError}
            </p>
          )}

          <div className="mt-6">
            <DailyGoal
              goal={dailyGoal}
              consumed={totalCalories(entries)}
              onSave={handleSaveGoal}
            />
          </div>

          <div className="mt-6">
            <DailyLog
              entries={entries}
              loading={logLoading}
              onRemove={handleRemove}
              onClear={handleClear}
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
