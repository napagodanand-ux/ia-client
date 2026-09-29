import { expect, test } from "@playwright/test";

/**
 * Enrol-area reachability (P0 middleware regression).
 *
 * - Unauthenticated requests to /enrol-mfa/complete must still redirect to
 *   /portal/login (the fix must not open a session bypass).
 * - An authenticated but unenrolled staff user must REACH the completion
 *   page (no bounce back to /enrol-mfa). The factor id is deliberately
 *   bogus: the middleware decision precedes any factor check, so a bogus id
 *   still proves reachability (page renders its generic error, URL stays).
 *
 * The authenticated case needs live dev credentials and is env-gated; it
 * lists (not skips) under `playwright test --list` in CI and runs against
 * local dev with E2E_STAFF_EMAIL/E2E_STAFF_PASSWORD set.
 */
test("unauthenticated /enrol-mfa/complete redirects to login", async ({ page }) => {
  await page.goto("/enrol-mfa/complete?factor=bogus");
  await page.waitForURL((u) => u.pathname === "/portal/login", { timeout: 30000 });
  expect(new URL(page.url()).pathname).toBe("/portal/login");
});

const staffEmail = process.env.E2E_STAFF_EMAIL;
const staffPassword = process.env.E2E_STAFF_PASSWORD;

test.skip(
  !staffEmail || !staffPassword,
  "needs E2E_STAFF_EMAIL + E2E_STAFF_PASSWORD (live dev only)",
);

test("unenrolled staff reaches /enrol-mfa/complete (no enrol bounce)", async ({ page }) => {
  await page.goto("/portal/login");
  await page.fill("#email", staffEmail as string);
  await page.fill("#password", staffPassword as string);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname !== "/portal/login", { timeout: 90000 });
  await page.waitForTimeout(3000);
  await page.goto("/enrol-mfa/complete?factor=bogus");
  await page.waitForTimeout(8000);
  const url = new URL(page.url());
  expect(url.pathname).toBe("/enrol-mfa/complete");
});
