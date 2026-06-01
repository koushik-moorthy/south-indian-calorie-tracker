/**
 * Baseline security headers applied to every response.
 *
 * Note: `Permissions-Policy` explicitly allows `camera=(self)` because the
 * in-app camera capture relies on getUserMedia; microphone and geolocation are
 * disabled since the app never uses them.
 *
 * A Content-Security-Policy is enforced in PRODUCTION only (it is skipped in
 * development so Next's HMR / React Refresh, which rely on eval, keep working).
 * The policy allows the inline scripts Next and the theme-boot snippet emit
 * (`script-src 'unsafe-inline'`) and the browser's only network peer besides
 * our own origin — Supabase Auth (`connect-src https://*.supabase.co`). OpenAI
 * is called server-side only, so it is intentionally not in `connect-src`.
 * Tightening `script-src` further (nonces/hashes) is tracked as a follow-up.
 */
const isProd = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.supabase.co",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  ...(isProd
    ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy }]
    : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
