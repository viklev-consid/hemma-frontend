import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server bundle (.next/standalone) so the Docker
  // runtime image only needs Node + the traced dependencies, not the full
  // node_modules tree. Required by the Dockerfile's runner stage.
  output: "standalone",
  logging: {
    browserToTerminal: true,
  },
  async redirects() {
    // Phase 0 households rename: organizations → households, /app/o → /app/h.
    // 308 (permanent) so bookmarks, emailed deep links, and search engines
    // follow the new shape while preserving the request method.
    return [
      {
        source: "/app/o/:path*",
        destination: "/app/h/:path*",
        permanent: true,
      },
      {
        source: "/app/organizations",
        destination: "/app/households",
        permanent: true,
      },
      {
        source: "/app/organizations/:path*",
        destination: "/app/households/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Lets popups this app opens (e.g. Google Sign-In) postMessage back
        // while still severing the implicit cross-origin coupling that
        // exists with no COOP header set. Required for the GSI callback to
        // fire reliably; also tightens security overall.
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
      {
        // Token-bearing query strings (invite acceptance, register-by-
        // invitation) must not leak via Referer. Without this header any
        // third-party sub-resource added later — a font CDN, an analytics
        // pixel, a remote image — would walk the token off-origin on its
        // first request. `no-referrer` is the strongest setting and
        // these routes don't need referer behavior, so the cost is zero.
        source: "/invite/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/invite",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/register/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source: "/register",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source:
          "/:authRoute(login|reset-password|confirm-email|confirm-email-change)/:path*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        source:
          "/:authRoute(login|reset-password|confirm-email|confirm-email-change)",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
