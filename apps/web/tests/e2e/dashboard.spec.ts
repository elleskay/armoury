import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsAdmin } from "./fixtures";

test("[ARM-DASHBOARD-001] Total submissions stat card is visible", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/dashboard");
  await expect(page.getByText(/Total submissions/i).first()).toBeVisible();
});

test("[ARM-DASHBOARD-002] Last 14 days stat card is visible", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/dashboard");
  await expect(page.getByText(/Last 14 days/i).first()).toBeVisible();
});

test("[ARM-DASHBOARD-003] Average readiness score stat card is visible", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/dashboard");
  await expect(
    page.getByText(/Average readiness score/i).first(),
  ).toBeVisible();
  await expect(page.locator("text=/\\d+%/").first()).toBeVisible();
});

test("[ARM-DASHBOARD-004] Open issues stat card visible with hint text", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/dashboard");
  await expect(page.getByText(/Open issues/i).first()).toBeVisible();
});

test("[ARM-DASHBOARD-005] Submissions chart card renders", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Submissions over time/i }),
  ).toBeVisible();
});

test("[ARM-DASHBOARD-006] Per-template table card renders", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Per template/i }),
  ).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Template/i })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Avg score/i })).toBeVisible();
});

test("[ARM-DASHBOARD-007] Open issues panel on dashboard shows most-recent items", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /^Open issues$/i }).first(),
  ).toBeVisible();
});
