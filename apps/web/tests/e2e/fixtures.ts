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
 * Signs out by driving the UI sign-out flow. clearCookies() turned out
 * not to be sufficient to invalidate the Auth.js session in CI: the
 * session token survives a Playwright clearCookies and goto /login
 * gets redirected back to /dashboard.
 *
 * Waits up to 5 seconds for one of the seeded user-name buttons to
 * become visible, then clicks the user menu and the Sign out menuitem.
 * If no button appears, falls back to clearCookies as a last resort.
 */
export async function signOut(page: Page): Promise<void> {
  const candidates = [/Officer One/, /Officer Two/, /Admin User/, /Nurse Lim/];
  const userBtn = page
    .getByRole("button")
    .filter({ hasText: new RegExp(candidates.map((r) => r.source).join("|")) })
    .first();
  try {
    await userBtn.waitFor({ state: "visible", timeout: 5000 });
    await userBtn.click();
    await page
      .getByRole("menuitem", { name: "Sign out" })
      .click({ timeout: 5000 });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  } catch {
    await page.context().clearCookies();
    await page.goto("/login");
  }
}

export const test = base;
