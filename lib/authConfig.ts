/**
 * Centralized single-user / multi-user authorization policy.
 *
 * This is the SINGLE source of truth for "who is allowed to use the app".
 * Every authentication and authorization decision flows through the helpers
 * here, so switching between modes is purely configuration-driven:
 *
 *   SINGLE_USER_MODE=true   → lock the app down to ALLOWED_EMAIL.
 *   SINGLE_USER_MODE=false  → original multi-user behavior (the default).
 *
 * No code needs to change to switch modes, and nothing here ever needs to be
 * removed to "go back" to multi-user — flip the flag and you're done.
 *
 * SERVER-ONLY: this module reads non-public environment variables
 * (SINGLE_USER_MODE, ALLOWED_EMAIL) that are intentionally NOT exposed to the
 * browser. Never import its functions into a client component. Client code
 * receives only the serializable `PublicAuthConfig` returned by
 * `getPublicAuthConfig()`, passed down as props.
 *
 * The functions read `process.env` fresh on every call (rather than caching at
 * module load) so configuration changes take effect on the next request and so
 * the behavior is trivial to unit-test.
 */

function isTrue(value: string | undefined): boolean {
  return String(value ?? "").trim().toLowerCase() === "true";
}

/**
 * Whether single-user lockdown is enabled. Defaults to `false` (multi-user) so
 * that an unconfigured / freshly-cloned app behaves exactly as it always has.
 */
export function isSingleUserMode(): boolean {
  return isTrue(process.env.SINGLE_USER_MODE);
}

/**
 * The configured allowlist, normalized to lowercase. `ALLOWED_EMAIL` is a
 * single address today, but a comma-separated list is accepted transparently
 * so a future "small group" deployment needs only an env change, not code.
 */
export function getAllowedEmails(): string[] {
  return String(process.env.ALLOWED_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * Authorization decision for an authenticated user's email — the heart of the
 * server-side gate.
 *
 * - Multi-user mode: everyone is allowed, so existing behavior is unchanged.
 * - Single-user mode: only an address in the allowlist passes (case-
 *   insensitive). Fails CLOSED if the allowlist is empty, so a misconfiguration
 *   (SINGLE_USER_MODE=true with no ALLOWED_EMAIL) denies everyone rather than
 *   silently exposing data.
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!isSingleUserMode()) return true;

  const allowed = getAllowedEmails();
  if (allowed.length === 0) return false; // fail closed on misconfiguration

  const candidate = String(email ?? "").trim().toLowerCase();
  return candidate.length > 0 && allowed.includes(candidate);
}

/**
 * Whether new-account signup is permitted. Disabled in single-user mode; in
 * multi-user mode signup is available again automatically.
 *
 * NOTE: this controls the app's own UI/flow. Blocking signup at the Supabase
 * (GoTrue) layer is a separate, reversible dashboard toggle documented in the
 * README — see "Single-user mode".
 */
export function isSignupEnabled(): boolean {
  return !isSingleUserMode();
}

/**
 * Serializable, client-safe view of the policy. Server components read this and
 * pass it to client components as props, so the browser never needs the raw
 * server env vars (and we avoid introducing a duplicate `NEXT_PUBLIC_*` flag).
 */
export interface PublicAuthConfig {
  singleUserMode: boolean;
  signupEnabled: boolean;
  /** Primary allowed email, shown as a hint on the sign-in screen (or null). */
  allowedEmail: string | null;
}

export function getPublicAuthConfig(): PublicAuthConfig {
  const allowed = getAllowedEmails();
  return {
    singleUserMode: isSingleUserMode(),
    signupEnabled: isSignupEnabled(),
    allowedEmail: allowed[0] ?? null,
  };
}
