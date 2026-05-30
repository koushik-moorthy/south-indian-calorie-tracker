/**
 * Baseline security headers applied to every response.
 *
 * Note: `Permissions-Policy` explicitly allows `camera=(self)` because the
 * in-app camera capture relies on getUserMedia; microphone and geolocation are
 * disabled since the app never uses them. A strict Content-Security-Policy is
 * intentionally omitted to avoid breaking the inline theme-boot script and the
 * Supabase/OpenAI connections; the headers below are safe and require no
 * per-request nonces.
 */
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
