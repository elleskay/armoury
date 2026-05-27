import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsAdmin, signInAsOfficer } from "./fixtures";
import type { Page } from "@playwright/test";

async function submitFireTruckWithFlaggedTyre(page: Page, note: string) {
  await page.goto("/officer");
  await page.getByRole("link", { name: /Fire Truck Daily Check/i }).click();
  await page.getByRole("radio", { name: "No" }).first().click();
  const tyreNote = page
    .getByPlaceholder(/Optional issue note/)
    .first();
  await tyreNote.fill(note);
  await page.getByRole("spinbutton").fill("10000");
  const combo = page.getByRole("combobox").first();
  await combo.click();
  await page.getByRole("option", { name: "Clean", exact: true }).click();
  await page.getByRole("button", { name: "Submit checklist" }).click();
  await expect(page).toHaveURL(/\/officer$/);
}

async function raiseStandaloneIssue(
  page: Page,
  title: string,
  detail: string,
  severity: "low" | "medium" | "high" | "critical" = "medium",
) {
  await page.goto("/officer/raise-issue");
  await page.getByLabel("Title").fill(title);
  await page.getByRole("combobox", { name: /Severity/i }).click();
  const sevLabel = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
  }[severity];
  await page.getByRole("option", { name: new RegExp(`^${sevLabel}`) }).click();
  await page.getByLabel("Detail").fill(detail);
  await page.getByRole("button", { name: "Raise issue" }).click();
  await expect(page).toHaveURL(/\/officer$/);
}

test("[ARM-ISSUES-001] Flagged item auto-creates an open issue", async ({
  page,
}) => {
  await signInAsOfficer(page);
  const marker = `flag-${Date.now()}`;
  await submitFireTruckWithFlaggedTyre(page, marker);

  // Sign out, switch to admin
  await page.getByRole("button", { name: /Officer One/i }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await signInAsAdmin(page);
  await page.goto("/admin/issues");
  await expect(page.getByText(marker)).toBeVisible();
});

test("[ARM-ISSUES-002] Auto-issue title equals item label and note equals officer note", async ({
  page,
}) => {
  await signInAsOfficer(page);
  const marker = `note-${Date.now()}`;
  await submitFireTruckWithFlaggedTyre(page, marker);

  await page.getByRole("button", { name: /Officer One/i }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await signInAsAdmin(page);
  await page.goto("/admin/issues");
  const card = page.locator(
    `text="${marker}"`,
  );
  await expect(card).toBeVisible();
  // The card includes the item label "Tyres in good condition" as title
  await expect(
    page
      .locator("text=Tyres in good condition")
      .first(),
  ).toBeVisible();
});

test("[ARM-ISSUES-003] Auto-issue shows team and officer attribution", async ({
  page,
}) => {
  await signInAsOfficer(page);
  const marker = `attribution-${Date.now()}`;
  await submitFireTruckWithFlaggedTyre(page, marker);

  await page.getByRole("button", { name: /Officer One/i }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await signInAsAdmin(page);
  await page.goto("/admin/issues");
  await expect(page.getByText(marker)).toBeVisible();
  await expect(
    page.getByText(/Central Fire Station/i).first(),
  ).toBeVisible();
  await expect(page.getByText(/Officer One/i).first()).toBeVisible();
});

test("[ARM-ISSUES-004] Officer can raise a standalone issue", async ({
  page,
}) => {
  await signInAsOfficer(page);
  const title = `Standalone ${Date.now()}`;
  await raiseStandaloneIssue(page, title, "Need workshop diagnostic", "high");

  await page.getByRole("button", { name: /Officer One/i }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await signInAsAdmin(page);
  await page.goto("/admin/issues");
  await expect(page.getByText(title)).toBeVisible();
});

test("[ARM-ISSUES-005] Severity dropdown lists low, medium, high, critical", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer/raise-issue");
  await page.getByRole("combobox", { name: /Severity/i }).click();
  await expect(page.getByRole("option", { name: /^Low/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /^Medium/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /^High/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /^Critical/ })).toBeVisible();
});

test("[ARM-ISSUES-006] Admin issues page shows Open and Resolved sections", async ({
  page,
}) => {
  await signInAsOfficer(page);
  const title = `Section-test ${Date.now()}`;
  await raiseStandaloneIssue(page, title, "For section test");

  await page.getByRole("button", { name: /Officer One/i }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await signInAsAdmin(page);
  await page.goto("/admin/issues");
  await expect(
    page.getByRole("heading", { name: /^Open\s*\(/i }),
  ).toBeVisible();
});

test("[ARM-ISSUES-007] Admin can resolve an open issue with a resolution note", async ({
  page,
}) => {
  await signInAsOfficer(page);
  const title = `Resolve-me ${Date.now()}`;
  await raiseStandaloneIssue(page, title, "Resolution flow test");

  await page.getByRole("button", { name: /Officer One/i }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await signInAsAdmin(page);
  await page.goto("/admin/issues");

  const card = page
    .locator("div", { hasText: title })
    .filter({ has: page.locator('input[name="resolution"]') })
    .first();
  await card.getByPlaceholder("Resolution note").fill("Fixed in workshop");
  await card.getByRole("button", { name: "Resolve" }).click();

  await expect(
    page.getByRole("heading", { name: /^Resolved\s*\(/i }),
  ).toBeVisible();
});

test("[ARM-ISSUES-008] Resolved issue shows resolution text and date", async ({
  page,
}) => {
  await signInAsOfficer(page);
  const title = `Resolution-display ${Date.now()}`;
  await raiseStandaloneIssue(page, title, "Resolution display test");

  await page.getByRole("button", { name: /Officer One/i }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await signInAsAdmin(page);
  await page.goto("/admin/issues");

  const card = page
    .locator("div", { hasText: title })
    .filter({ has: page.locator('input[name="resolution"]') })
    .first();
  const resolutionText = `Resolved: ${Date.now()}`;
  await card.getByPlaceholder("Resolution note").fill(resolutionText);
  await card.getByRole("button", { name: "Resolve" }).click();

  await expect(page.getByText(resolutionText)).toBeVisible();
  await expect(page.locator(`text=/\\d{4}-\\d{2}-\\d{2}/`).first()).toBeVisible();
});

test("[ARM-ISSUES-009] Severity badges render with distinct visual colors", async ({
  page,
}) => {
  await signInAsOfficer(page);
  const title = `Critical-${Date.now()}`;
  await raiseStandaloneIssue(page, title, "Critical badge test", "critical");

  await page.getByRole("button", { name: /Officer One/i }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await signInAsAdmin(page);
  await page.goto("/admin/issues");

  const badge = page
    .locator("div", { hasText: title })
    .locator('span:has-text("critical")')
    .first();
  await expect(badge).toBeVisible();
  const className = (await badge.getAttribute("class")) ?? "";
  expect(className).toContain("destructive");
});
