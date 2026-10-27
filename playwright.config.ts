import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// End-to-end tests: the production build talking to the local Supabase
// stand-in from the admin repo (../morningside-memes-admin/tests/mock), which
// runs the real migrations with RLS on PGlite. Run `npm run build` first.
// GEMINI_API_KEY from .env.local enables the posting test.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const MOCK_DIR = process.env.MOCK_DIR ?? "../morningside-memes-admin";

export default defineConfig({
  testDir: "./tests",
  workers: 1, // tests share one database
  reporter: [["list"]],
  timeout: 90_000,
  use: { baseURL: "http://localhost:3004" },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `node ${MOCK_DIR}/tests/mock/server.mjs`,
      url: "http://localhost:54399/__debug/deleted-files",
      reuseExistingServer: false,
      env: { MAIN_MIGRATIONS: "./supabase/migrations" },
    },
    {
      command: "npx next start -p 3004",
      url: "http://localhost:3004/login",
      reuseExistingServer: false,
      env: {
        SUPABASE_URL: "http://localhost:54399",
        SUPABASE_ANON_KEY: "mock-anon-key",
        // By default captions come from the Gemini stand-in in the mock
        // (deterministic, no quota). REAL_GEMINI=1 calls the real API with
        // GEMINI_API_KEY from .env.local instead.
        ...(process.env.REAL_GEMINI === "1"
          ? { GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "" }
          : { GEMINI_API_KEY: "mock-gemini-key", GEMINI_API_BASE: "http://localhost:54399/gemini/models" }),
      },
    },
  ],
});
