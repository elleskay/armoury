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

test("[ARM-EMAIL-001] Cron route reports attempted/sent/skipped for Resend dispatch", async ({
  page,
}) => {
  const response = await page.request.get("/api/cron/reminders");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(typeof body.attempted).toBe("number");
  expect(typeof body.sent).toBe("number");
  expect(typeof body.skipped).toBe("boolean");
  expect(body.skipped).toBe(true);
});

test("[ARM-EMAIL-002] Reminder route returns at least one would-remind in the seed", async ({
  page,
}) => {
  const response = await page.request.get("/api/cron/reminders");
  const body = await response.json();
  expect(body.wouldRemind).toBeGreaterThan(0);
});

test("[ARM-SCHED-005] Officer can skip a check with a reason", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer");

  const submitHref = await page
    .getByRole("link", { name: /Fire Truck Daily Check/ })
    .first()
    .getAttribute("href");
  expect(submitHref).toMatch(/\/officer\/submit\/[a-f0-9-]+/);
  const templateId = submitHref!.split("/").pop()!;

  await page.goto(`/officer/skip/${templateId}`);
  await expect(
    page.getByRole("heading", { name: /Skip Fire Truck Daily Check/ }),
  ).toBeVisible();
  await page.getByLabel("Reason").fill("Callsign not running");
  await page.getByRole("button", { name: /Skip check/ }).click();
  await expect(page).toHaveURL(/\/officer$/);

  await expect(page.getByText(/Skipped today/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Unskip/ }).first()).toBeVisible();
});

test("[ARM-SCHED-006] Officer can unskip a previously skipped check", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer");

  const submitHref = await page
    .getByRole("link", { name: /Ambulance Equipment Audit/ })
    .first()
    .getAttribute("href");
  expect(submitHref).toMatch(/\/officer\/submit\/[a-f0-9-]+/);
  const templateId = submitHref!.split("/").pop()!;

  await page.goto(`/officer/skip/${templateId}`);
  await page.getByLabel("Reason").fill("Ambulance in workshop");
  await page.getByRole("button", { name: /Skip check/ }).click();
  await expect(page).toHaveURL(/\/officer$/);

  await page.goto(`/officer/skip/${templateId}?action=unskip`);
  await expect(
    page.getByRole("heading", { name: /Unskip Ambulance Equipment Audit/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Unskip$/ }).click();
  await expect(page).toHaveURL(/\/officer$/);

  await expect(
    page.getByRole("link", { name: /Ambulance Equipment Audit/ }).first(),
  ).toBeVisible();
});
