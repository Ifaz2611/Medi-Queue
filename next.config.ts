import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Next.js only reads env files whose names start with a dot (`.env.local`).
// A file named `env.local` is silently ignored, which leads to confusing
// "Supabase URL and Key are required" runtime errors for new contributors.
const misplacedEnvFiles = ["env.local", "env.local.txt", ".env.local.txt"].filter(
  (file) => existsSync(path.join(process.cwd(), file)),
);

if (misplacedEnvFiles.length > 0) {
  console.warn(
    `\n[MediQueue] Found ${misplacedEnvFiles.join(", ")}, but Next.js only loads ".env.local".\n` +
      `Rename it to ".env.local" and restart "npm run dev".\n`,
  );
}

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
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
