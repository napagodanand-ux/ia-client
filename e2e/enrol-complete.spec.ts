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
 * The authenticated case needs live dev credentials; the credential check
 * lives inside that test's body so the unauthenticated case always runs,
 * including in CI. Both tests list under `playwright test --list`.
 */
test("unauthenticated /enrol-mfa/complete redirects to login", async ({ page }) => {
  await page.goto("/enrol-mfa/complete?factor=bogus");
  await page.waitForURL((u) => u.pathname === "/portal/login", { timeout: 60000 });
  expect(new URL(page.url()).pathname).toBe("/portal/login");
});

const staffEmail = process.env.E2E_STAFF_EMAIL;
const staffPassword = process.env.E2E_STAFF_PASSWORD;

test("unenrolled staff reaches /enrol-mfa/complete (no enrol bounce)", async ({ page }) => {
  test.skip(
    !staffEmail || !staffPassword,
    "needs E2E_STAFF_EMAIL + E2E_STAFF_PASSWORD (live dev only)",
  );
  await page.goto("/portal/login");
  await page.fill("#email", staffEmail as string);
  await page.fill("#password", staffPassword as string);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname !== "/portal/login", { timeout: 90000 });
  await page.goto("/enrol-mfa/complete?factor=bogus");
  // Settles on exactly one of: the completion page (fixed behavior) or the
  // enrol page (the pre-fix bounce). The middleware decision is instant; the
  // 90s budget is for slow-runner page render, not argon (a bogus factor
  // fails the lookup before any hashing).
  await page.waitForURL(
    (u) => u.pathname === "/enrol-mfa/complete" || u.pathname === "/enrol-mfa",
    { timeout: 90000 },
  );
  expect(new URL(page.url()).pathname).toBe("/enrol-mfa/complete");
});
