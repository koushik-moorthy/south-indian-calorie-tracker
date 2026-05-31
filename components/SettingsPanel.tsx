"use client";

import { useEffect, useState } from "react";
import { MODEL_OPTIONS, DEFAULT_MODEL } from "@/lib/settings";
import { fetchSettings, saveSettings } from "@/lib/api";

const CUSTOM_MODEL = "__custom__";
const isKnownModel = (m: string) => MODEL_OPTIONS.some((o) => o.value === m);

interface Props {
  email?: string | null;
  onSignOut: () => void;
}

export default function SettingsPanel({ email, onSignOut }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasKey, setHasKey] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [customMode, setCustomMode] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setHasKey(s.hasKey);
        setModel(s.model);
        setCustomMode(Boolean(s.model) && !isKnownModel(s.model));
        if (!s.hasKey) setOpen(true); // prompt first-time users for a key
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Close the popover on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSave() {
    setError(null);
    setSavedMsg(null);
    setSaving(true);
    try {
      const newKey = apiKeyInput.trim();
      await saveSettings({
        model: model.trim() || DEFAULT_MODEL,
        ...(newKey ? { apiKey: newKey } : {}),
      });
      const s = await fetchSettings();
      setHasKey(s.hasKey);
      setModel(s.model);
      setCustomMode(Boolean(s.model) && !isKnownModel(s.model));
      setApiKeyInput("");
      setSavedMsg("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        aria-expanded={open}
        className="fixed right-16 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        {!loading && !hasKey && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-800" />
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="fixed right-4 top-16 z-50 max-h-[calc(100vh-5rem)] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Settings
              </h2>
              {!loading && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    hasKey
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  }`}
                >
                  {hasKey ? "Key saved" : "No key"}
                </span>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="apiKey"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  OpenAI API Key
                </label>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={hasKey ? "•••••••• (saved) — type to replace" : "sk-..."}
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-brand-500/30"
                />
                <p className="text-xs text-slate-400">
                  Encrypted before storage and used only on the server to call OpenAI.
                  Never sent back to your browser. Leave blank to keep the existing key.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="model"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Model
                </label>
                <select
                  id="model"
                  value={customMode ? CUSTOM_MODEL : model}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === CUSTOM_MODEL) {
                      setCustomMode(true);
                    } else {
                      setCustomMode(false);
                      setModel(v);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-500/30"
                >
                  {MODEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                  <option value={CUSTOM_MODEL}>Custom…</option>
                </select>

                {customMode && (
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Enter a model name (e.g. gpt-4.1)"
                    autoComplete="off"
                    spellCheck={false}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-brand-500/30"
                  />
                )}
                <p className="text-xs text-slate-400">
                  Pick a vision-capable model, or choose Custom for another model your key
                  supports.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || loading}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                {savedMsg && <span className="text-sm text-green-600">{savedMsg}</span>}
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>

              <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                {email && (
                  <p className="mb-2 truncate text-xs text-slate-500 dark:text-slate-400">
                    Signed in as <span className="font-medium">{email}</span>
                  </p>
                )}
                <button
                  type="button"
                  onClick={onSignOut}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
