import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Gmail email bodies rendered in sandboxed iframe (allow-same-origin) need blob/data
      "frame-src 'self' blob:",
      // HuggingFace model weights fetched client-side for semantic search
      "connect-src 'self' https://huggingface.co https://cdn-lfs.huggingface.co https://cdn-lfs-us-1.huggingface.co https://*.huggingface.co https://api.sassmaker.com https://us.i.posthog.com https://us-assets.i.posthog.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us-assets.i.posthog.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Emit .next/standalone so Beasties' post-build inline-critical-css.mjs
  // can modify the same HTML that OpenNext's --skipNextBuild consumes.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Force CF Edge to cache the static homepage. revalidate=3600 alone
        // emits only s-maxage which CF was treating as DYNAMIC; an explicit
        // max-age (browser cache) + CDN-Cache-Control is what flips the
        // edge response to HIT for HTML.
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value:
              "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
          },
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  serverExternalPackages: [
    "@libsql/client",
    "@libsql/hrana-client",
    "@libsql/isomorphic-ws",
    "@libsql/isomorphic-fetch",
    "libsql",
    "drizzle-orm",
    "better-auth",
    "@huggingface/transformers",
    "onnxruntime-node",
    "onnxruntime-common",
    "sharp",
  ],
  images: { unoptimized: true },
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@huggingface/transformers/**",
      "node_modules/onnxruntime-node/**",
      "node_modules/onnxruntime-common/**",
      "node_modules/sharp/**",
    ],
  },
  webpack(config, { isServer }) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "sharp$": false,
      "onnxruntime-node$": false,
      // HF runs only in the browser (called from a "use client" component).
      // Stub it out on the server so OpenNext doesn't try to bundle it for the Worker.
      ...(isServer ? { "@huggingface/transformers": false } : {}),
    };
    return config;
  },
};

export default nextConfig;
