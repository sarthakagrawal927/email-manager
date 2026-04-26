import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@libsql/client",
    "@libsql/hrana-client",
    "@libsql/isomorphic-ws",
    "@libsql/isomorphic-fetch",
    "libsql",
    "drizzle-orm",
    "better-auth",
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
