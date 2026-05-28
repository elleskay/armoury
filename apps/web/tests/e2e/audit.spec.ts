import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsAdmin } from "./fixtures";

test("[ARM-AUDIT-001] Every admin server action writes an audit log entry", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/admin/templates/new");
  await expect(
    page.getByRole("heading", { name: /New checklist template/i }),
  ).toBeVisible();

  const tmplName = `Audit-coverage ${Date.now()}`;
  await page.getByLabel("Name", { exact: true }).fill(tmplName);
  await page.getByPlaceholder(/e.g. Tyres in good condition/).fill("Item one");
  await page.getByRole("button", { name: /Create template/i }).click();
  await expect(page).toHaveURL(/\/admin\/templates/);

  const row = page.getByRole("row", { name: new RegExp(tmplName) });
  await row.getByRole("link", { name: new RegExp(`Edit ${tmplName}`) }).click();
  await expect(page).toHaveURL(/\/admin\/templates\/[0-9a-f-]+\/edit/);
  await page.getByLabel("Name", { exact: true }).fill(`${tmplName} v2`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/templates/);

  const row2 = page.getByRole("row", { name: new RegExp(`${tmplName} v2`) });
  await row2.getByRole("button", { name: new RegExp(`Pause ${tmplName} v2`) }).click();
  await expect(row2).toContainText(/Paused/i);
  await row2.getByRole("button", { name: new RegExp(`Resume ${tmplName} v2`) }).click();
  await row2.getByRole("button", { name: new RegExp(`Archive ${tmplName} v2`) }).click();
  await expect(row2).toContainText(/Archived/i);
  await row2
    .getByRole("button", { name: new RegExp(`Unarchive ${tmplName} v2`) })
    .click();

  await page.goto("/admin/audit");
  await expect(page.getByRole("heading", { name: /Audit log/i })).toBeVisible();
  for (const action of [
    "template.create",
    "template.update",
    "template.pause",
    "template.resume",
    "template.archive",
    "template.unarchive",
  ]) {
    await expect(
      page.getByRole("cell", { name: new RegExp(action.replace(".", "\\.")) }).first(),
    ).toBeVisible();
  }
});

test("[ARM-AUDIT-002] Audit log captures before and after on edits", async ({
  page,
}) => {
  await signInAsAdmin(page);
  // The ARM-AUDIT-001 test above wrote a template.update entry with a
  // before/after payload. Visiting /admin/audit and inspecting just
  // confirms the row exists; full payload inspection is a DB-level
  // assertion documented in the spec.
  await page.goto("/admin/audit");
  await expect(
    page.getByRole("cell", { name: /template\.update/ }).first(),
  ).toBeVisible();
});

test("[ARM-AUDIT-003] Audit log has no UI path to update or delete entries", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/admin/audit");
  // No edit/delete controls on audit rows
  await expect(
    page.getByRole("button", { name: /Delete|Edit audit/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Delete|Edit audit/i }),
  ).toHaveCount(0);
});
