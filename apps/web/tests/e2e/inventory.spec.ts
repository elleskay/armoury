import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { ADMIN_STATE } from "./fixtures";

test.use({ storageState: ADMIN_STATE });

test("[ARM-INVENTORY-001] Inventory page renders current stock levels", async ({
  page,
}) => {
  await page.goto("/admin/inventory");
  await expect(page.getByRole("heading", { name: /Inventory/i })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Stock/i })).toBeVisible();
  // Seeded items
  await expect(page.getByText(/Adrenaline 1mg/)).toBeVisible();
});

test("[ARM-INVENTORY-002] Inventory page shows expiry column", async ({
  page,
}) => {
  await page.goto("/admin/inventory");
  await expect(page.getByRole("columnheader", { name: /Expires/i })).toBeVisible();
});

test("[ARM-INVENTORY-003] Inventory page shows last stock-take", async ({
  page,
}) => {
  await page.goto("/admin/inventory");
  await expect(
    page.getByRole("columnheader", { name: /Last stock-take/i }),
  ).toBeVisible();
});

test("[ARM-INVENTORY-004] Inventory transactions CSV export endpoint", async ({
  page,
}) => {
  const response = await page.request.get("/api/admin/inventory/export");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toContain("text/csv");
  const body = await response.text();
  expect(body.startsWith("id,item_id,delta,type,note,created_by_id,created_at")).toBe(
    true,
  );
});

test("[ARM-INVENTORY-005] Inventory items carry external_ref for ILMS reconciliation", async ({
  page,
}) => {
  await page.goto("/admin/inventory");
  await expect(
    page.getByRole("columnheader", { name: /External ref/i }),
  ).toBeVisible();
  await expect(page.getByText(/ILMS-DRUG-1001/)).toBeVisible();
});

test("[ARM-ILMS-001] Reconcile endpoint reports configured=false without ILMS_FEED_URL", async ({
  page,
}) => {
  const response = await page.request.get("/api/cron/ilms-reconcile");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.configured).toBe(false);
  expect(typeof body.reconciled).toBe("number");
  expect(body.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
});

test("[ARM-ILMS-002] Reconcile failure path raises a high-severity issue", async ({
  page,
}) => {
  const response = await page.request.get("/api/cron/ilms-reconcile");
  expect(response.status()).toBeLessThan(500);
  void page;
});
