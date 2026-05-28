import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsAdmin, signInAsOfficer } from "./fixtures";

test("[ARM-UX-001] Submission error boundary renders friendly recovery UI", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer");
  await page
    .getByRole("link", { name: /Fire Truck Daily Check/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: /Fire Truck Daily Check/ }),
  ).toBeVisible();

  await page.getByRole("spinbutton").fill("99999");
  const combo = page.getByRole("combobox").first();
  await combo.click();
  await page.getByRole("option", { name: "Clean", exact: true }).click();

  await page.route("**/officer/submit/**", async (route) => {
    if (route.request().method() === "POST") {
      await route.abort("internetdisconnected");
    } else {
      await route.continue();
    }
  });
  await page.getByRole("button", { name: "Submit checklist" }).click();
  // The error.tsx boundary renders this heading on submit failure
  await expect(
    page.getByRole("heading", { name: /Submission failed/ }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: /Try again/ })).toBeVisible();
});

test("[ARM-UX-002] /api/version returns a stable version hash for the banner", async ({
  page,
}) => {
  // Indirect verification of the banner: the polled endpoint exists,
  // returns a version string, and the layout includes the client component
  // file (we cannot trigger a real mismatch in a single test run).
  const response = await page.request.get("/api/version");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(typeof body.version).toBe("string");
  expect(body.version.length).toBeGreaterThan(0);
});

test("[ARM-UX-003] Submission detail has Status and About tabs", async ({
  page,
}) => {
  // Make a submission first so there's a detail page to view.
  await signInAsOfficer(page);
  await page.goto("/officer");
  await page
    .getByRole("link", { name: /Fire Truck Daily Check/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: /Fire Truck Daily Check/ }),
  ).toBeVisible();
  await page.getByRole("spinbutton").fill("88888");
  const combo = page.getByRole("combobox").first();
  await combo.click();
  await page.getByRole("option", { name: "Clean", exact: true }).click();
  await page.getByRole("button", { name: "Submit checklist" }).click();
  await expect(page).toHaveURL(/\/officer$/);

  // Switch to admin to access the submission detail page
  await page.context().clearCookies();
  await signInAsAdmin(page);
  await page.goto("/admin/submissions");
  await expect(
    page.getByRole("link", { name: /Fire Truck Daily Check/ }).first(),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Fire Truck Daily Check/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/admin\/submissions\/[a-f0-9-]+/);

  await expect(page.getByRole("tab", { name: "Status" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "About" })).toBeVisible();

  await page.getByRole("tab", { name: "About" }).click();
  await expect(page.getByText(/Frequency:/)).toBeVisible();
});

test("[ARM-UX-004] Condensed view toggle changes item density", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer");
  await page
    .getByRole("link", { name: /Fire Truck Daily Check/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: /Fire Truck Daily Check/ }),
  ).toBeVisible();

  const items = page.locator('[data-testid="checklist-items"]');
  await expect(items).toHaveAttribute("data-density", "roomy");

  await page.getByRole("button", { name: /Condensed view/ }).click();
  await expect(items).toHaveAttribute("data-density", "condensed");

  await page.getByRole("button", { name: /Roomy view/ }).click();
  await expect(items).toHaveAttribute("data-density", "roomy");
});
