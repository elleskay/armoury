import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsAdmin } from "./fixtures";

test("[ARM-DASHBOARD-008] Admin can bulk-export a month of submissions (legacy)", async ({
  page,
}) => {
  await signInAsAdmin(page);
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  const response = await page.request.get(
    `/api/admin/export/${year}/${month}`,
  );
  expect(response.ok()).toBeTruthy();

  const disposition = response.headers()["content-disposition"];
  expect(disposition).toContain("attachment");
  expect(disposition).toContain(`armoury-export-${year}-${month}.zip`);
});

test("[ARM-EXPORT-001] Monthly export returns a real ZIP archive", async ({
  page,
}) => {
  await signInAsAdmin(page);
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  const response = await page.request.get(
    `/api/admin/export/${year}/${month}`,
  );
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["content-type"]).toBe("application/zip");
  const body = await response.body();
  // ZIP magic bytes are 50 4B 03 04 (PK..)
  expect(body[0]).toBe(0x50);
  expect(body[1]).toBe(0x4b);
  expect(body[2]).toBe(0x03);
  expect(body[3]).toBe(0x04);
});

test("[ARM-EXPORT-002] ZIP archive contains a manifest.json", async ({
  page,
}) => {
  await signInAsAdmin(page);
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  const response = await page.request.get(
    `/api/admin/export/${year}/${month}`,
  );
  expect(response.ok()).toBeTruthy();
  const buf = await response.body();
  // Look for the literal filename "manifest.json" anywhere in the archive
  const haystack = buf.toString("latin1");
  expect(haystack).toContain("manifest.json");
});
