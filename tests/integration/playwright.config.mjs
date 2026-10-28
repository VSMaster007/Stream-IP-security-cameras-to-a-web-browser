import { defineConfig, devices } from "@playwright/test";

const dashboardUrl = process.env.DASHBOARD_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: ".",
  testMatch: "playback.spec.mjs",
  timeout: 30000,
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    channel: "chrome",
    baseURL: dashboardUrl,
    headless: true,
  },
});
