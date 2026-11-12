import { defineConfig } from "@playwright/test";

const previewUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 90_000,
  expect: { timeout: 30_000 },
  workers: 1,
  use: {
    baseURL: previewUrl ?? "http://localhost:3000",
    viewport: { width: 1440, height: 1100 },
    channel: "chromium",
    launchOptions: {
      args: [
        "--enable-gpu",
        "--enable-unsafe-webgpu",
        "--ignore-gpu-blocklist",
      ],
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: previewUrl
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://localhost:3000/design-system",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
