import { test, expect } from "../../test-lib/spec-test/dist/playwright.js";
import { signInAsAdmin } from "./fixtures";

test("[ARM-DASHBOARD-008] Admin can bulk-export a month of submissions", async ({
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
  expect(disposition).toContain(`armoury-export-${year}-${month}.json`);

  const body = await response.json();
  expect(body.month).toBe(`${year}-${month}`);
  expect(typeof body.count).toBe("number");
  expect(Array.isArray(body.submissions)).toBe(true);

  // Each submission entry has the expected shape
  if (body.submissions.length > 0) {
    const s = body.submissions[0];
    expect(typeof s.id).toBe("string");
    expect(typeof s.score).toBe("number");
    expect(Array.isArray(s.items)).toBe(true);
    expect(Array.isArray(s.responses)).toBe(true);
  }
});
