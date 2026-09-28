import { expect, test } from "@playwright/test";

test("signup collects no role", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.locator("#orgName")).toBeVisible();
  await expect(page.locator("#businessNeed")).toBeVisible();
  expect(await page.locator('[name="role"]').count()).toBe(0);
});

test("login page renders password form plus Google option", async ({ page }) => {
  await page.goto("/portal/login");
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();
  await expect(page.locator('button:has-text("Continue with Google")')).toBeVisible();
});

test("confirm without code bounces with error flag", async ({ page }) => {
  await page.goto("/auth/confirm");
  await page.waitForURL("**/portal/login?error=confirm");
  expect(page.url()).toContain("error=confirm");
});
