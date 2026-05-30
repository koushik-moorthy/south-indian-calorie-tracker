"use client";

import { useEffect, useState } from "react";
import { MODEL_OPTIONS, DEFAULT_MODEL } from "@/lib/settings";
import { fetchSettings, saveSettings } from "@/lib/api";

const CUSTOM_MODEL = "__custom__";
const isKnownModel = (m: string) => MODEL_OPTIONS.some((o) => o.value === m);

export default function SettingsPanel() {
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
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          ⚙️ Settings
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
        </span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="space-y-1.5">
            <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
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
              It is never sent back to your browser. Leave blank to keep the
              existing key.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="model" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
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
              Pick a vision-capable model for image analysis, or choose Custom to enter
              another model your key supports.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
            {savedMsg && <span className="text-sm text-green-600">{savedMsg}</span>}
            {error && <span className="text-sm text-red-600">{error}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
