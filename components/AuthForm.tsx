"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";

interface Props {
  /** When false, account creation is hidden and refused (single-user mode). */
  signupEnabled?: boolean;
  /** Whether the app is locked to a single user (affects the helper text). */
  singleUserMode?: boolean;
  /** Allowed email to hint on the sign-in screen, if any. */
  allowedEmail?: string | null;
}

export default function AuthForm({
  signupEnabled = true,
  singleUserMode = false,
  allowedEmail = null,
}: Props) {
  // In single-user mode signup is disabled, so we can only ever sign in.
  const allowSignup = signupEnabled !== false;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If signup is allowed but state somehow lands on "signup", treat it as such;
  // when signup is disabled we always operate in sign-in mode.
  const effectiveMode = allowSignup ? mode : "signin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const mail = email.trim();
    if (!mail || !password) {
      setError("Enter your email and password.");
      return;
    }
    // Defense in depth: never run the signup path when it's disabled.
    if (effectiveMode === "signup" && !allowSignup) {
      setError("Sign-ups are disabled.");
      return;
    }
    if (effectiveMode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = getBrowserSupabase();
    try {
      if (effectiveMode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email: mail,
          password,
        });
        if (signUpError) throw signUpError;
        // Accounts are auto-confirmed, so sign in immediately for a session.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: mail,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: mail,
          password,
        });
        if (signInError) throw signInError;
      }
      // The parent listens to onAuthStateChange and will swap in the app.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {effectiveMode === "signin" ? "Sign in" : "Create your account"}
      </h2>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {effectiveMode === "signin"
          ? "Sign in to track your daily calories."
          : "Sign up to save your API key, model, and daily log securely."}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-500/30"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete={effectiveMode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-500/30"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Please wait…"
            : effectiveMode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {allowSignup ? (
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          {effectiveMode === "signin" ? "New here? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => {
              setMode(effectiveMode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="font-semibold text-brand-700 hover:underline"
          >
            {effectiveMode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      ) : (
        <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          {singleUserMode
            ? "This is a private deployment — sign-ups are disabled."
            : "Sign-ups are disabled."}
          {singleUserMode && allowedEmail ? (
            <>
              {" "}
              Sign in as <span className="font-medium">{allowedEmail}</span>.
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
