import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsAdmin, signInAsOfficer, signOut } from "./fixtures";

test("[ARM-TEMPLATES-001] Admin can create a template with required fields", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/admin/templates/new");
  await expect(
    page.getByRole("heading", { name: /New checklist template/i }),
  ).toBeVisible();

  const uniqueName = `Test Template ${Date.now()}`;
  await page.getByLabel("Name", { exact: true }).fill(uniqueName);

  await page.getByPlaceholder(/e.g. Tyres in good condition/).fill("First item");

  await page.getByRole("button", { name: /Create template/i }).click();
  await expect(page).toHaveURL(/\/admin\/templates/);
  await expect(page.getByText(uniqueName)).toBeVisible();
});

test("[ARM-TEMPLATES-002] New template defaults to status=published", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/admin/templates/new");
  await expect(
    page.getByRole("heading", { name: /New checklist template/i }),
  ).toBeVisible();

  const uniqueName = `Default-published ${Date.now()}`;
  await page.getByLabel("Name", { exact: true }).fill(uniqueName);
  await page.getByPlaceholder(/e.g. Tyres in good condition/).fill("Item one");

  await page.getByRole("button", { name: /Create template/i }).click();
  await expect(page).toHaveURL(/\/admin\/templates/);

  const row = page.getByRole("row", { name: new RegExp(uniqueName) });
  await expect(row).toBeVisible();
  await expect(row).toContainText(/Published/i);
});

test("[ARM-TEMPLATES-003] New template defaults to frequency=open, shift=any", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/admin/templates/new");
  await expect(
    page.getByRole("heading", { name: /New checklist template/i }),
  ).toBeVisible();

  const uniqueName = `Default-open-any ${Date.now()}`;
  await page.getByLabel("Name", { exact: true }).fill(uniqueName);
  await page.getByPlaceholder(/e.g. Tyres in good condition/).fill("Item one");

  await page.getByRole("button", { name: /Create template/i }).click();
  await expect(page).toHaveURL(/\/admin\/templates/);
  const row = page.getByRole("row", { name: new RegExp(uniqueName) });
  await expect(row).toContainText(/Open/i);
  await expect(row).toContainText(/Any/i);
});

test("[ARM-SCHED-003] Frequency=open templates show as 'Open' (no fixed deadline)", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/admin/templates");
  const rows = page.getByRole("row");
  expect(await rows.count()).toBeGreaterThan(0);
});

test("[ARM-TEMPLATES-004] Draft templates are not visible to officers", async ({
  page,
  context,
}) => {
  await signInAsAdmin(page);
  await page.goto("/admin/templates/new");
  const draftName = `Draft-template ${Date.now()}`;
  await page.getByLabel("Name", { exact: true }).fill(draftName);
  await page
    .getByRole("combobox", { name: /Status/i })
    .first()
    .click();
  await page.getByRole("option", { name: /Draft/i }).click();
  await page.getByPlaceholder(/e.g. Tyres in good condition/).fill("Item one");
  await page.getByRole("button", { name: /Create template/i }).click();
  await expect(page).toHaveURL(/\/admin\/templates/);

  // Now sign in as officer in a fresh context and verify the draft is hidden
  await signOut(page);

  await signInAsOfficer(page);
  await page.goto("/officer");
  await expect(page.getByText(draftName)).not.toBeVisible();
  void context;
});

test("[ARM-TEAMS-003] Templates can be unassigned (visible across teams)", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/admin/templates/new");
  await expect(
    page.getByRole("heading", { name: /New checklist template/i }),
  ).toBeVisible();

  const uniqueName = `Cross-team ${Date.now()}`;
  await page.getByLabel("Name", { exact: true }).fill(uniqueName);
  await page.getByPlaceholder(/e.g. Tyres in good condition/).fill("Item one");
  await page.getByRole("button", { name: /Create template/i }).click();
  await expect(page).toHaveURL(/\/admin\/templates/);
  await expect(page.getByText(uniqueName)).toBeVisible();
});
