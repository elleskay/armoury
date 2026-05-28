import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsOfficer } from "./fixtures";

test("[ARM-SCHED-007] Cron endpoint reports upcoming reminders", async ({
  page,
}) => {
  const response = await page.request.get("/api/cron/reminders");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(typeof body.scheduledTemplateCount).toBe("number");
  expect(typeof body.wouldRemind).toBe("number");
  expect(body.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
});

test("[ARM-SCHED-005] Officer can skip a check with a reason", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer");
  await expect(page.getByText(/Fire Truck Daily Check/).first()).toBeVisible();

  const card = page
    .locator(":has-text('Fire Truck Daily Check')")
    .filter({ has: page.getByRole("link", { name: /^Skip$/ }) })
    .first();
  await card.getByRole("link", { name: /^Skip$/ }).click();
  await expect(
    page.getByRole("heading", { name: /Skip Fire Truck Daily Check/ }),
  ).toBeVisible();

  await page.getByLabel("Reason").fill("Callsign not running");
  await page.getByRole("button", { name: /Skip check/ }).click();
  await expect(page).toHaveURL(/\/officer$/);

  // Should appear in Skipped today section
  await expect(page.getByText(/Skipped today/i)).toBeVisible();
  // And should no longer appear as an active card (only in the skipped list)
  const skippedCard = page
    .locator(":has-text('Fire Truck Daily Check')")
    .filter({ has: page.getByRole("link", { name: /Unskip/ }) })
    .first();
  await expect(skippedCard).toBeVisible();
});

test("[ARM-SCHED-006] Officer can unskip a previously skipped check", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer");

  // Skip Ambulance first (different template so we don't conflict with -005)
  const ambulanceCard = page
    .locator(":has-text('Ambulance Equipment Audit')")
    .filter({ has: page.getByRole("link", { name: /^Skip$/ }) })
    .first();
  await ambulanceCard.getByRole("link", { name: /^Skip$/ }).click();
  await page.getByLabel("Reason").fill("Ambulance in workshop");
  await page.getByRole("button", { name: /Skip check/ }).click();
  await expect(page).toHaveURL(/\/officer$/);

  // Find the unskip link and click
  const skippedItem = page
    .locator(":has-text('Ambulance Equipment Audit')")
    .filter({ has: page.getByRole("link", { name: /Unskip/ }) })
    .first();
  await skippedItem.getByRole("link", { name: /Unskip/ }).click();
  await expect(
    page.getByRole("heading", { name: /Unskip Ambulance Equipment Audit/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Unskip$/ }).click();
  await expect(page).toHaveURL(/\/officer$/);

  // Template should appear in active checklists again
  await expect(
    page.getByRole("link").filter({ hasText: /Ambulance Equipment Audit/ }).first(),
  ).toBeVisible();
});
