import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const enforceCsp = process.env.CSP_ENFORCE === "true";

const csp = [
  "default-src 'self'",
  [
    "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
    "https://*.google-analytics.com", // Google Analytics
    "https://*.google.com", // Google
    "https://*.googletagmanager.com", // Google Tag Manager
    isProd ? "" : "'unsafe-eval'",
  ]
    .filter(Boolean)
    .join(" "),
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  [
    "img-src 'self' data: blob:",
    "https://*.googleusercontent.com",
    "https://www.google.co.in/",
    "https://www.googletagmanager.com",
  ].join(" "),

  "font-src 'self' data:",

  [
    "connect-src 'self'",
    "https://*.google.com",
    "https://*.googletagmanager.com",
  ].join(" "),

  "frame-src https://accounts.google.com/gsi/", // Google sign-in iframe
  "media-src 'self' blob:", // demo video
  "worker-src 'self' blob:", // service worker, Lordicon/Lottie worker
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",

  // Would break plain http://localhost in development.
  isProd ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  {
    key: enforceCsp
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only",
    value: csp,
  },
  // Stop MIME sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking (older browsers; CSP frame-ancestors covers modern ones).
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin to other sites, nothing to downgraded http.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Microphone is needed for voice input; everything else is switched off.
  {
    key: "Permissions-Policy",
    value:
      "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  // "same-origin" would break the Google sign-in popup.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // HTTPS only. No "preload" on purpose: it is hard to undo.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false, // removes "X-Powered-By: Next.js"
  headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
