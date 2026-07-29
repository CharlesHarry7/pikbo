import { expect, test, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const evidenceDir =
  process.env.PLAYWRIGHT_EVIDENCE_DIR || "test-results/wave-a-evidence";

async function expectNoDocumentOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(
    Math.max(geometry.document, geometry.body),
    JSON.stringify(geometry)
  ).toBeLessThanOrEqual(geometry.viewport + 1);
}

async function saveScreenshot(page: Page, testInfo: TestInfo, surface: string) {
  await fs.mkdir(evidenceDir, { recursive: true });
  const file = path.join(
    evidenceDir,
    `${testInfo.project.name}-${surface}.png`
  );
  await page.screenshot({ path: file, fullPage: true });
}

async function saveResourceEvidence(page: Page, testInfo: TestInfo) {
  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => {
        const resource = entry as PerformanceResourceTiming;
        return {
          name: resource.name,
          initiatorType: resource.initiatorType,
          transferSize: resource.transferSize,
          encodedBodySize: resource.encodedBodySize,
          durationMs: Math.round(resource.duration),
        };
      })
      .filter(
        (entry) => /\.(?:mp4|webm)(?:\?|$)/i.test(entry.name)
      )
  );
  const file = path.join(
    evidenceDir,
    `${testInfo.project.name}-home-video-resources.json`
  );
  await fs.mkdir(evidenceDir, { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(resources, null, 2)}\n`, "utf8");
  await testInfo.attach("home-video-resources", {
    body: Buffer.from(JSON.stringify(resources, null, 2)),
    contentType: "application/json",
  });
  return resources;
}

function expectCompleteRemixHref(href: string | null) {
  expect(href).toBeTruthy();
  const target = new URL(href!, "http://pikbo.test");
  expect(target.pathname).toBe("/create");
  for (const key of ["effect", "source", "ratio", "duration", "channel"]) {
    expect(target.searchParams.get(key), `${key} in ${href}`).toBeTruthy();
  }
}

async function expectCreateIntent(page: Page) {
  await expect(page).toHaveURL(/\/create\?/);
  const target = new URL(page.url());
  for (const key of ["effect", "source", "ratio", "duration", "channel"]) {
    expect(target.searchParams.get(key), `${key} in ${target}`).toBeTruthy();
  }
  await expect(
    page.locator("[data-first-run-step='upload']").first()
  ).toBeVisible();
  await expectNoDocumentOverflow(page);
}

test("Wave A closes Home → Project/Recipe → Create → Library safely", async ({
  page,
}, testInfo) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1 }).first()
  ).toBeVisible();
  await expectNoDocumentOverflow(page);

  // Only the cinematic hero may attach an eager video source on first load.
  const videosWithAttachedSources = await page
    .locator("video")
    .evaluateAll(
      (videos) =>
        videos.filter((video) => video.querySelector("source[src]")).length
    );
  expect(videosWithAttachedSources).toBeLessThanOrEqual(1);
  const resources = await saveResourceEvidence(page, testInfo);
  expect(new Set(resources.map((entry) => entry.name)).size).toBeLessThanOrEqual(
    1
  );

  const viewport = page.viewportSize()!;
  const playing = await page.locator("video").evaluateAll((videos) =>
    videos.filter((video) => !(video as HTMLVideoElement).paused).length
  );
  expect(playing).toBeLessThanOrEqual(viewport.width <= 768 ? 1 : 2);
  // Capture a painted frame, not the sub-frame interval after play() hides the
  // poster but before the first decoded frame advances.
  await expect
    .poll(() =>
      page
        .locator("[data-home-hero='toy-cinema'] video")
        .evaluate(
          (video) =>
            (video as HTMLVideoElement).paused ||
            (video as HTMLVideoElement).currentTime > 0.15
        )
    )
    .toBe(true);
  await saveScreenshot(page, testInfo, "home");

  // Reduced motion must stop automatic playback and preserve a manual control.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect
    .poll(() =>
      page.locator("video").evaluateAll((videos) =>
        videos.every((video) => (video as HTMLVideoElement).paused)
      )
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: /play example video/i }).first()
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload({ waitUntil: "domcontentloaded" });

  // Home Project cards are keyboard-operable and expose the inspectable record.
  const projectLink = page
    .locator("[data-home-project-destination='project']")
    .first();
  await expect(projectLink).toBeVisible();
  await projectLink.focus();
  await expect(projectLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/projects\/[^/?#]+$/);
  await expect(page.getByText("Inside project", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/provider task evidence absent/i)).toBeVisible();
  await expectNoDocumentOverflow(page);

  const useRecipe = page
    .getByRole("link", { name: /use this recipe/i })
    .first();
  expectCompleteRemixHref(await useRecipe.getAttribute("href"));
  await useRecipe.click();
  await expectCreateIntent(page);

  // Explore filter state is addressable; cards keep separate Project/Recipe doors.
  await page.goto("/explore", { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Unboxing", exact: true }).click();
  await expect(page).toHaveURL(/\/explore\?cat=unboxing$/);
  await expect(
    page.getByRole("tab", { name: "Unboxing", exact: true })
  ).toHaveAttribute("aria-selected", "true");
  const exploreProject = page
    .getByRole("link", { name: /open .* project details/i })
    .first();
  await expect(exploreProject).toBeVisible();
  await exploreProject.focus();
  await expect(exploreProject).toBeFocused();
  const exploreRemix = page.getByRole("link", { name: /use recipe/i }).first();
  expectCompleteRemixHref(await exploreRemix.getAttribute("href"));
  await expectNoDocumentOverflow(page);

  // Recipe search leads to Create with the same validated handoff contract.
  await page.goto("/effects", { waitUntil: "domcontentloaded" });
  const search = page.getByRole("searchbox", { name: "Search recipes" });
  await search.fill("spin");
  const recipe = page
    .locator("[data-recipe-browser='search-category'] a[href^='/create?']")
    .first();
  await expect(recipe).toBeVisible();
  expectCompleteRemixHref(await recipe.getAttribute("href"));
  await recipe.click();
  await expectCreateIntent(page);

  // An empty, device-local Library still closes the return loop to Create.
  await page.goto("/library", { waitUntil: "domcontentloaded" });
  await expect(page.getByText(/local to this device/i).first()).toBeVisible();
  const libraryReturn = page
    .locator("[data-library-empty='generate-remix']")
    .first();
  await expect(libraryReturn).toBeVisible();
  expectCompleteRemixHref(await libraryReturn.getAttribute("href"));
  await libraryReturn.click();
  await expectCreateIntent(page);

  const missingProject = await page.goto("/projects/not-a-real-pikbo-project", {
    waitUntil: "domcontentloaded",
  });
  expect(missingProject?.status()).toBe(404);
  const missingRecipe = await page.goto("/effects/not-a-real-pikbo-recipe", {
    waitUntil: "domcontentloaded",
  });
  expect(missingRecipe?.status()).toBe(404);
});

test("Library groups device-local clips by Recipe", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-390x844",
    "One-browser stateful grouping contract; the closed loop runs on all nine projects."
  );
  await page.addInitScript(() => {
    localStorage.setItem(
      "pikbo_library_v1",
      JSON.stringify([
        {
          id: "recipe-group-a",
          videoUrl: "/demos/orbit-hyper-cgi.mp4",
          projectId: "owned-toy-a",
          effect: "floating-hero",
          effectName: "Floating Hero",
          demo: true,
          duration: 5,
          aspectRatio: "9:16",
          sourceProject: "orbit-cgi",
          channel: "reels",
          createdAt: "2026-07-29T00:00:00.000Z",
        },
        {
          id: "recipe-group-b",
          videoUrl: "/demos/scout-packshot-spin.mp4",
          projectId: "owned-toy-b",
          effect: "360-spin-showcase",
          effectName: "360° Spin Showcase",
          demo: true,
          duration: 5,
          aspectRatio: "1:1",
          sourceProject: "scout-spin",
          channel: "etsy",
          createdAt: "2026-07-29T00:01:00.000Z",
        },
      ])
    );
  });
  await page.goto("/library", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Group library clips").selectOption("recipe");
  await expect(
    page.getByRole("heading", { name: "Recipe · Floating Hero" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recipe · 360° Spin Showcase" })
  ).toBeVisible();
  await expect(page.getByText(/local to this device/i).first()).toBeVisible();
  await expect(page.getByText(/HF Assets pattern/i)).toHaveCount(0);
  await expectNoDocumentOverflow(page);
});
