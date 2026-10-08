// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Only server process variables; never expose credentials through VITE_*.
const serverEnv = loadEnv(
  process.env["NODE_ENV"] === "production" ? "production" : "development",
  process.cwd(),
  "",
);
for (const name of [
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "INOVA_AI_ENABLED",
  "INOVA_AI_ORIGIN",
  "INOVA_DATABASE_ENABLED",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "INOVA_MEDICAL_PREVIEW_EMAIL",
]) {
  // Reload the local origin allowlist when Vite restarts after a config edit.
  if (serverEnv[name] && (!process.env[name] || name === "INOVA_AI_ORIGIN"))
    process.env[name] = serverEnv[name];
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
