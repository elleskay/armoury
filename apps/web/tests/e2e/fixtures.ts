import { test as base, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "admin@armoury.test";
export const OFFICER_EMAIL = "officer@armoury.test";
export const TEST_PASSWORD = "password123";

export async function signIn(
  page: Page,
  email: string,
  password = TEST_PASSWORD,
): Promise<void> {
  // Defensive: drop any leftover session from a prior signIn in this test.
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page
    .getByLabel("Email", { exact: true })
    .waitFor({ state: "visible", timeout: 10_000 });
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 10_000,
  });
}

export async function signInAsAdmin(page: Page): Promise<void> {
  await signIn(page, ADMIN_EMAIL);
}

export async function signInAsOfficer(page: Page): Promise<void> {
  await signIn(page, OFFICER_EMAIL);
}

/**
 * Clears the session by deleting auth cookies. Use this for tests that
 * need to switch users mid-test. Faster and more reliable than driving
 * the UI sign-out flow, which races on the user-menu button appearing.
 *
 * Does not navigate. The next signIn() will navigate to /login itself.
 *
 * For tests that specifically verify the UI sign-out behaviour (e.g.
 * ARM-AUTH-006), drive the menu directly rather than calling this.
 */
export async function signOut(page: Page): Promise<void> {
  await page.context().clearCookies();
}

export const test = base;
