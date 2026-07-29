import { defineConfig, type Project } from "@playwright/test";

const evidenceDir =
  process.env.PLAYWRIGHT_EVIDENCE_DIR || "test-results/wave-a-evidence";
const resultsDir =
  process.env.PLAYWRIGHT_RESULTS_DIR || "test-results/wave-a-results";
const reportDir =
  process.env.PLAYWRIGHT_REPORT_DIR || "test-results/wave-a-report";
const jsonReport =
  process.env.PLAYWRIGHT_JSON_REPORT ||
  "test-results/wave-a-report/results.json";

const browsers = ["chromium", "firefox", "webkit"] as const;
const viewports = [
  { id: "390x844", width: 390, height: 844 },
  { id: "768x1024", width: 768, height: 1024 },
  { id: "1440x900", width: 1440, height: 900 },
] as const;

const projects: Project[] = browsers.flatMap((browserName) =>
  viewports.map(({ id, width, height }) => ({
    name: `${browserName}-${id}`,
    use: {
      browserName,
      viewport: { width, height },
    },
  }))
);

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: resultsDir,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: jsonReport }],
    ["html", { outputFolder: reportDir, open: "never" }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3456",
    locale: "en-US",
    colorScheme: "dark",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects,
  metadata: { evidenceDir },
});
