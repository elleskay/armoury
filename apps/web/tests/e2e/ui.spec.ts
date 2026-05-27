import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsAdmin, signInAsOfficer } from "./fixtures";

test("[ARM-UI-001] Officer sidebar shows Dashboard, My Checklists, Past checks, Raise issue", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer");
  await expect(page.getByRole("link", { name: /Dashboard/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /My Checklists/i })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Past checks/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Raise issue/i }).first()).toBeVisible();
});

test("[ARM-UI-002] Admin sidebar shows Dashboard, Templates, Submissions, Issues, Audit log", async ({
  page,
}) => {
  await signInAsAdmin(page);
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /^Dashboard$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Templates$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Submissions$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Issues$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Audit log/i })).toBeVisible();
});

test("[ARM-UI-003] Theme toggle is reachable and persists across reload", async ({
  page,
}) => {
  await signInAsOfficer(page);
  await page.goto("/officer");
  const toggle = page.getByRole("button", { name: /Toggle theme/i });
  await expect(toggle).toBeVisible();

  const html = page.locator("html");
  await toggle.click();
  await page.getByRole("menuitem", { name: /^Dark$/ }).click();
  await page.waitForTimeout(300);
  await expect(html).toHaveClass(/dark/);

  await page.reload();
  await expect(html).toHaveClass(/dark/);
});

test("[ARM-UI-004] No em-dashes appear in primary signed-in pages", async ({
  page,
}) => {
  await signInAsAdmin(page);
  for (const path of ["/dashboard", "/admin/templates", "/admin/issues", "/officer"]) {
    await page.goto(path);
    const html = await page.content();
    expect(html).not.toContain("—");
  }
});

test("[ARM-UI-005] Sign in page shows demo credentials hint", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.getByText(/admin@armoury\.test/)).toBeVisible();
  await expect(page.getByText(/officer@armoury\.test/)).toBeVisible();
});
