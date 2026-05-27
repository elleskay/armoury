import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import {
  signIn,
  signInAsAdmin,
  signInAsOfficer,
  signOut,
} from "./fixtures";

test("[ARM-RBAC-001] Officer sees only templates assigned to their team", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer");
  await expect(
    page.getByRole("link", { name: /Fire Truck Daily Check/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Ambulance Equipment Audit/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /A&E Crash Cart HOTO/ }),
  ).toHaveCount(0);
});

test("[ARM-RBAC-004] Admin sees all teams' templates on /admin/templates", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/admin/templates");
  await expect(
    page.getByRole("cell", { name: /Fire Truck Daily Check/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /Ambulance Equipment Audit/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /A&E Crash Cart HOTO/ }).first(),
  ).toBeVisible();
});

void signInAsAdmin;

test("[ARM-TEMPLATES-005] Admin templates page lists every template", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/admin/templates");
  await expect(
    page.getByRole("heading", { name: /Templates/i }),
  ).toBeVisible();
  const rows = page.getByRole("row");
  expect(await rows.count()).toBeGreaterThanOrEqual(3);
});

test("[ARM-TEMPLATES-006] Template badges display schedule (frequency + shift)", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer");
  const card = page
    .locator('a[href*="/officer/submit/"]')
    .filter({ hasText: "Fire Truck Daily Check" });
  await expect(card).toContainText("Daily");
  await expect(card).toContainText("AM shift");
});

test("[ARM-RBAC-002] Officer cannot reach a submit page for another team's template", async ({
  page,
}) => {
  // Sign in as nurse (hospital team), grab the A&E Crash Cart template href
  await signIn(page, "nurse@armoury.test");
  await page.goto("/officer");
  const hospitalCard = page
    .locator('a[href*="/officer/submit/"]')
    .filter({ hasText: /A&E Crash Cart HOTO/ });
  const href = await hospitalCard.getAttribute("href");
  expect(href).toMatch(/\/officer\/submit\/[a-f0-9-]+/);

  // Sign out, sign back in as FRS officer, then try to access the hospital
  // template directly. Server must return 404 (notFound).
  await signOut(page);
  await signInAsOfficer(page);
  const response = await page.goto(href!);
  expect(response?.status()).toBe(404);
});

test("[ARM-RBAC-003] Officer cannot reach admin-only pages", async ({ page }) => {
  await signInAsOfficer(page);
  await page.goto("/admin/templates");
  await expect(page).not.toHaveURL(/\/admin\/templates(\?|$)/);
  await page.goto("/admin/templates/new");
  await expect(page).not.toHaveURL(/\/admin\/templates\/new/);
  await page.goto("/admin/issues");
  await expect(page).not.toHaveURL(/\/admin\/issues(\?|$)/);
});
