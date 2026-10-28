import { expect, test } from "@playwright/test";

test("plays the demo stream in Chrome", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Demo Camera" })).toBeVisible();
  await expect(page.getByText("Ready", { exact: true })).toBeVisible();
  await expect(page.getByText("Live", { exact: true })).toBeVisible({ timeout: 20000 });
  const width = await page.locator("video").evaluate((video) => video.videoWidth);
  expect(width).toBe(1280);
});
