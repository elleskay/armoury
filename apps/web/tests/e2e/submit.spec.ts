import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsOfficer } from "./fixtures";
import type { Page } from "@playwright/test";

async function openFireTruckSubmit(page: Page) {
  await signInAsOfficer(page);
  await page.goto("/officer");
  await page.getByRole("link", { name: /Fire Truck Daily Check/i }).click();
  await expect(
    page.getByRole("heading", { name: /Fire Truck Daily Check/i }),
  ).toBeVisible();
}

test("[ARM-ITEMS-001] Item kind boolean renders Yes/No radios", async ({
  page,
}) => {
  await openFireTruckSubmit(page);
  await expect(page.getByRole("radio", { name: "Yes" }).first()).toBeVisible();
  await expect(page.getByRole("radio", { name: "No" }).first()).toBeVisible();
  await expect(page.getByRole("radio", { name: "Yes" }).first()).toBeChecked();
});

test("[ARM-ITEMS-002] Item kind number renders a number input", async ({
  page,
}) => {
  await openFireTruckSubmit(page);
  await expect(page.getByRole("spinbutton")).toBeVisible();
});

test("[ARM-ITEMS-003] Item kind text renders a text input", async ({ page }) => {
  await openFireTruckSubmit(page);
  const textInput = page.locator('input[type="text"]').filter({
    has: page.locator(":scope"),
  });
  await expect(textInput.first()).toBeVisible();
});

test("[ARM-ITEMS-005] Item kind date_time renders a datetime-local input", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer");
  await page.getByRole("link", { name: /Ambulance Equipment Audit/i }).click();
  await expect(
    page.getByRole("heading", { name: /Ambulance Equipment Audit/i }),
  ).toBeVisible();
  const dt = page.locator('input[type="datetime-local"]');
  await expect(dt).toBeVisible();
});

test("[ARM-ITEMS-004] Item kind dropdown renders combobox with options", async ({
  page,
}) => {
  await openFireTruckSubmit(page);
  const combo = page.getByRole("combobox").first();
  await expect(combo).toBeVisible();
  await combo.click();
  const options = page.getByRole("option");
  await expect(options).toHaveCount(3);
  await expect(options.nth(0)).toHaveText("Clean");
  await expect(options.nth(1)).toHaveText("Needs cleaning");
  await expect(options.nth(2)).toHaveText("Damaged");
});

test("[ARM-ITEMS-006] Required items show an asterisk indicator", async ({
  page,
}) => {
  await openFireTruckSubmit(page);
  await expect(page.getByText("*", { exact: true }).first()).toBeVisible();
});

test("[ARM-ITEMS-007] Items render in position order", async ({ page }) => {
  await openFireTruckSubmit(page);
  const positions = await page.locator("text=/^\\d+\\.$/").allTextContents();
  const numbers = positions.map((t) => parseInt(t.replace(".", ""), 10));
  expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  expect(numbers[0]).toBe(1);
});

test("[ARM-SUBMIT-001] Officer can submit a checklist they have access to", async ({
  page,
}) => {
  await openFireTruckSubmit(page);
  await page.getByRole("spinbutton").fill("12500");
  const combo = page.getByRole("combobox").first();
  await combo.click();
  await page.getByRole("option", { name: "Clean", exact: true }).click();
  await page.getByRole("button", { name: "Submit checklist" }).click();
  await expect(page).toHaveURL(/\/officer$/);
});

test("[ARM-SUBMIT-003] After submit, officer is redirected to /officer", async ({
  page,
}) => {
  await openFireTruckSubmit(page);
  await page.getByRole("spinbutton").fill("12000");
  const combo = page.getByRole("combobox").first();
  await combo.click();
  await page.getByRole("option", { name: "Clean", exact: true }).click();
  await page.getByRole("button", { name: "Submit checklist" }).click();
  await expect(page).toHaveURL(/\/officer$/);
});

test("[ARM-SUBMIT-004] Recent submissions card shows template, items, and score", async ({
  page,
}) => {
  await openFireTruckSubmit(page);
  await page.getByRole("radio", { name: "No" }).first().click();
  await page.getByRole("spinbutton").fill("11000");
  const combo = page.getByRole("combobox").first();
  await combo.click();
  await page.getByRole("option", { name: "Clean", exact: true }).click();
  await page.getByRole("button", { name: "Submit checklist" }).click();
  await expect(page).toHaveURL(/\/officer$/);

  const recent = page.getByRole("heading", { name: /Recent submissions/i });
  await expect(recent).toBeVisible();
  const row = page.getByRole("row", { name: /Fire Truck Daily Check/ }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText(/\d+\s*\/\s*\d+/);
  await expect(row).toContainText(/%/);
});

test("[ARM-SUBMIT-009] Officer can attach an issue note to flag an item", async ({
  page,
}) => {
  await openFireTruckSubmit(page);
  await page.getByRole("spinbutton").fill("11500");
  const combo = page.getByRole("combobox").first();
  await combo.click();
  await page.getByRole("option", { name: "Clean", exact: true }).click();
  await page
    .getByPlaceholder(/Optional issue note/)
    .first()
    .fill("Tyre pressure looks low");
  await page.getByRole("button", { name: "Submit checklist" }).click();
  await expect(page).toHaveURL(/\/officer$/);
  const row = page.getByRole("row", { name: /Fire Truck Daily Check/ }).first();
  const textContent = await row.innerText();
  const match = textContent.match(/(\d+)%/);
  expect(match).toBeTruthy();
  const score = parseInt(match![1]!, 10);
  expect(score).toBeLessThan(100);
});

test("[ARM-SUBMIT-010] Non-required items left blank do not flag", async ({
  page,
}) => {
  await openFireTruckSubmit(page);
  // All booleans default to Yes, mileage required, cabin required dropdown.
  // Notes (item 6) is non-required and we leave it blank.
  await page.getByRole("spinbutton").fill("12345");
  const combo = page.getByRole("combobox").first();
  await combo.click();
  await page.getByRole("option", { name: "Clean", exact: true }).click();
  await page.getByRole("button", { name: "Submit checklist" }).click();
  await expect(page).toHaveURL(/\/officer$/);
  const row = page.getByRole("row", { name: /Fire Truck Daily Check/ }).first();
  await expect(row).toContainText("100%");
});

test("[ARM-SUBMIT-005] Boolean=No flags the item as not-ok", async ({ page }) => {
  await openFireTruckSubmit(page);
  await page.getByRole("radio", { name: "No" }).first().click();
  await page.getByRole("spinbutton").fill("10000");
  const combo = page.getByRole("combobox").first();
  await combo.click();
  await page.getByRole("option", { name: "Clean", exact: true }).click();
  await page.getByRole("button", { name: "Submit checklist" }).click();
  await expect(page).toHaveURL(/\/officer$/);
  const row = page.getByRole("row", { name: /Fire Truck Daily Check/ }).first();
  const textContent = await row.innerText();
  const match = textContent.match(/(\d+)%/);
  expect(match).toBeTruthy();
  const score = parseInt(match![1]!, 10);
  expect(score).toBeLessThan(100);
});
