// Browser tests against the built site. Run with `npm run e2e`.
import { defineConfig } from "@playwright/test";

const PORT = 4180;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}/stepthru/`, browserName: "chromium" },
  webServer: {
    command: `npm run site && npx vite preview --outDir site --base /stepthru/ --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/stepthru/`,
    reuseExistingServer: !process.env.CI,
  },
});
