import { test as base, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "admin@armoury.test";
export const OFFICER_EMAIL = "officer@armoury.test";
export const TEST_PASSWORD = "password123";

export const AUTH_DIR = "playwright/.auth";
export const ADMIN_STATE = `${AUTH_DIR}/admin.json`;
export const OFFICER_STATE = `${AUTH_DIR}/officer.json`;
export const OFFICER2_STATE = `${AUTH_DIR}/officer2.json`;
export const NURSE_STATE = `${AUTH_DIR}/nurse.json`;

/**
 * Sign in via the UI. Most tests should NOT call this; instead they
 * declare `test.use({ storageState: ADMIN_STATE })` at the top of the
 * file so they start authenticated. Use signIn only when the test
 * itself exercises the sign-in flow (ARM-AUTH-*).
 */
export async function signIn(
  page: Page,
  email: string,
  password = TEST_PASSWORD,
): Promise<void> {
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
 * Sign out via the UI. Tests that need a clean unauthenticated context
 * usually prefer clearing cookies directly (or just don't sign in).
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
