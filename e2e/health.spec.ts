import { expect, test } from "@playwright/test";

test("health endpoint reports ok", async ({ request, baseURL }) => {
  const response = await request.get(`${baseURL}/api/health`);
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ ok: true });
});

test("public home stays open to anonymous visitors", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  expect(page.url()).not.toContain("/login");
});

test("unauthenticated portal redirects to client login", async ({ page }) => {
  await page.goto("/portal");
  await page.waitForURL("**/portal/login");
  expect(page.url()).toContain("/portal/login");
});
