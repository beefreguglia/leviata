import { defineConfig, devices } from "@playwright/test";
import { parse } from "dotenv";
import { readFileSync } from "node:fs";

const testEnv = parse(readFileSync(".env.test"));
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  // os testes mexem no mesmo banco → um de cada vez, em ordem
  fullyParallel: false,
  workers: 1,
  // servidor dev + banco de teste com 1 conexão: sob carga um teste pode estourar o tempo.
  // Repete 1x; o relatório marca como "flaky" (não esconde).
  retries: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    // servidor separado (porta e pasta próprias) para não brigar com o `npm run dev`
    command: `npx next dev --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    env: { ...testEnv, NEXT_DIST_DIR: ".next-e2e", STREAM_REFRESH_DISABLED: "true" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
