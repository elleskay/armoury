import { test as base, type Page } from "@playwright/test";

export const ADMIN_EMAIL = "admin@armoury.test";
export const OFFICER_EMAIL = "officer@armoury.test";
export const TEST_PASSWORD = "password123";

export async function signIn(
  page: Page,
  email: string,
  password = TEST_PASSWORD,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function signInAsAdmin(page: Page): Promise<void> {
  await signIn(page, ADMIN_EMAIL);
}

export async function signInAsOfficer(page: Page): Promise<void> {
  await signIn(page, OFFICER_EMAIL);
}

export const test = base;
