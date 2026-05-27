import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsAdmin, signInAsOfficer } from "./fixtures";

const BUDGET_MS = 5_000;

test("[ARM-PERF-001] Officer home page interactive within budget", async ({
  page,
}) => {
  await signInAsOfficer(page);
  const t0 = Date.now();
  await page.goto("/officer", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: /My checklists/i })
    .waitFor({ state: "visible" });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(BUDGET_MS);
});

test("[ARM-PERF-002] Checklist submit page interactive within budget", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer");
  await page.getByRole("link", { name: /Fire Truck Daily Check/i }).click();
  const t0 = Date.now();
  await page
    .getByRole("heading", { name: /Fire Truck Daily Check/i })
    .waitFor({ state: "visible" });
  await page.getByRole("radio", { name: "Yes" }).first().waitFor({ state: "visible" });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(BUDGET_MS);
});

test("[ARM-PERF-003] Dashboard interactive within budget", async ({ page }) => {
  await signInAsAdmin(page);
  const t0 = Date.now();
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page
    .getByText(/Total submissions/i)
    .first()
    .waitFor({ state: "visible" });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(BUDGET_MS);
});
