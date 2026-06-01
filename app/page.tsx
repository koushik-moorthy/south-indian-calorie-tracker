import HomeClient from "@/components/HomeClient";
import { getPublicAuthConfig } from "@/lib/authConfig";

// Read the auth policy at request time, not build time, so flipping
// SINGLE_USER_MODE takes effect on the next request without a rebuild.
export const dynamic = "force-dynamic";

/**
 * Server component: reads the auth policy from server-only env vars and hands a
 * serializable, client-safe view down to the interactive UI. This keeps the
 * single-user configuration to exactly two env vars (SINGLE_USER_MODE,
 * ALLOWED_EMAIL) — no NEXT_PUBLIC_* mirror is needed for the browser.
 */
export default function Page() {
  return <HomeClient authConfig={getPublicAuthConfig()} />;
}
