import { specTest, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsOfficer } from "./fixtures";

async function openFireTruckSubmit(page: import("@playwright/test").Page) {
  await signInAsOfficer(page);
  await page.goto("/officer");
  await page.getByRole("link", { name: /Fire Truck Daily Check/i }).click();
  await expect(page.getByRole("heading", { name: /Fire Truck Daily Check/i })).toBeVisible();
}

specTest(
  "ARM-ITEMS-001",
  "Item kind boolean renders Yes/No radios",
  async ({ page }) => {
    await openFireTruckSubmit(page);
    await expect(page.getByRole("radio", { name: "Yes" }).first()).toBeVisible();
    await expect(page.getByRole("radio", { name: "No" }).first()).toBeVisible();
    await expect(page.getByRole("radio", { name: "Yes" }).first()).toBeChecked();
  },
  { category: "ui" },
);

specTest(
  "ARM-ITEMS-002",
  "Item kind number renders a number input",
  async ({ page }) => {
    await openFireTruckSubmit(page);
    await expect(page.getByRole("spinbutton")).toBeVisible();
  },
  { category: "ui" },
);

specTest(
  "ARM-ITEMS-004",
  "Item kind dropdown renders a combobox with item.options",
  async ({ page }) => {
    await openFireTruckSubmit(page);
    const combo = page.getByRole("combobox").first();
    await expect(combo).toBeVisible();
    await combo.click();
    const options = page.getByRole("option");
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toHaveText("Clean");
    await expect(options.nth(1)).toHaveText("Needs cleaning");
    await expect(options.nth(2)).toHaveText("Damaged");
  },
  { category: "ui" },
);

specTest(
  "ARM-ITEMS-006",
  "Required items show an asterisk indicator",
  async ({ page }) => {
    await openFireTruckSubmit(page);
    await expect(page.getByText("*", { exact: true }).first()).toBeVisible();
  },
  { category: "ui" },
);

specTest(
  "ARM-ITEMS-007",
  "Items render in position order",
  async ({ page }) => {
    await openFireTruckSubmit(page);
    const positions = await page.locator("text=/^\\d+\\.$/").allTextContents();
    const numbers = positions.map((t) => parseInt(t.replace(".", ""), 10));
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(numbers[0]).toBe(1);
  },
  { category: "ui" },
);

specTest(
  "ARM-SUBMIT-001",
  "Officer can submit a checklist they have access to",
  async ({ page }) => {
    await openFireTruckSubmit(page);
    await page.getByRole("spinbutton").fill("12500");
    const combo = page.getByRole("combobox").first();
    await combo.click();
    await page.getByRole("option", { name: "Clean", exact: true }).click();
    await page.getByRole("button", { name: "Submit checklist" }).click();
    await expect(page).toHaveURL(/\/officer$/);
  },
  { category: "functional" },
);

specTest(
  "ARM-SUBMIT-003",
  "After submit, officer is redirected to /officer",
  async ({ page }) => {
    await openFireTruckSubmit(page);
    await page.getByRole("spinbutton").fill("12000");
    const combo = page.getByRole("combobox").first();
    await combo.click();
    await page.getByRole("option", { name: "Clean", exact: true }).click();
    await page.getByRole("button", { name: "Submit checklist" }).click();
    await expect(page).toHaveURL(/\/officer$/);
  },
  { category: "functional" },
);

specTest(
  "ARM-SUBMIT-004",
  "Recent submissions card shows template, items, and score",
  async ({ page }) => {
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
  },
  { category: "ui" },
);

specTest(
  "ARM-SUBMIT-005",
  "Boolean=No flags the item as not-ok",
  async ({ page }) => {
    await openFireTruckSubmit(page);
    await page.getByRole("radio", { name: "No" }).first().click();
    await page.getByRole("spinbutton").fill("10000");
    const combo = page.getByRole("combobox").first();
    await combo.click();
    await page.getByRole("option", { name: "Clean", exact: true }).click();
    await page.getByRole("button", { name: "Submit checklist" }).click();
    await expect(page).toHaveURL(/\/officer$/);
    const row = page.getByRole("row", { name: /Fire Truck Daily Check/ }).first();
    const text = await row.innerText();
    const match = text.match(/(\d+)%/);
    expect(match).toBeTruthy();
    const score = parseInt(match![1]!, 10);
    expect(score).toBeLessThan(100);
  },
  { category: "functional" },
);
