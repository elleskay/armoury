import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsAdmin, signInAsOfficer } from "./fixtures";

test("[ARM-AUTH-001] Unauthenticated GET /admin/* redirects to /login", async ({
  page,
}) => {
  await page.goto("/admin/templates");
  await expect(page).toHaveURL(/\/login/);
});

test("[ARM-AUTH-002] Unauthenticated GET /officer/* redirects to /login", async ({
  page,
}) => {
  await page.goto("/officer");
  await expect(page).toHaveURL(/\/login/);
});

test("[ARM-AUTH-003] Officer GET /admin/* is denied", async ({ page }) => {
  await signInAsOfficer(page);
  await page.goto("/admin/templates");
  await expect(page).not.toHaveURL(/\/admin\/templates/);
});

test("[ARM-AUTH-004] Admin can access /officer/* routes", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/officer");
  await expect(page).toHaveURL(/\/officer/);
  await expect(page.getByRole("heading", { name: /My checklists/i })).toBeVisible();
});

test("[ARM-AUTH-005] Session persists across page reloads", async ({ page }) => {
  await signInAsOfficer(page);
  await page.goto("/officer");
  await expect(page.getByRole("heading", { name: /My checklists/i })).toBeVisible();
  await page.reload();
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: /My checklists/i })).toBeVisible();
});

test("[ARM-AUTH-006] Sign out clears session and redirects to /login", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.getByRole("button", { name: /Officer One/i }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/officer");
  await expect(page).toHaveURL(/\/login/);
});

test("[ARM-AUTH-007] Invalid credentials show an error and do not sign in", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@armoury.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(1000);
  await expect(page).toHaveURL(/\/login/);
});
