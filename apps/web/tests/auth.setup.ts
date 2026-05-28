import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const AUTH_DIR = "playwright/.auth";

interface Account {
  label: string;
  email: string;
  file: string;
}

const ACCOUNTS: Account[] = [
  { label: "admin", email: "admin@armoury.test", file: `${AUTH_DIR}/admin.json` },
  { label: "officer", email: "officer@armoury.test", file: `${AUTH_DIR}/officer.json` },
  { label: "officer2", email: "officer2@armoury.test", file: `${AUTH_DIR}/officer2.json` },
  { label: "nurse", email: "nurse@armoury.test", file: `${AUTH_DIR}/nurse.json` },
];

mkdirSync(AUTH_DIR, { recursive: true });

for (const account of ACCOUNTS) {
  setup(`authenticate as ${account.label}`, async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page
      .getByLabel("Email", { exact: true })
      .waitFor({ state: "visible", timeout: 10_000 });
    await page.getByLabel("Email", { exact: true }).fill(account.email);
    await page.getByLabel("Password", { exact: true }).fill("password123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 10_000,
    });

    // Sanity: confirm session by hitting a protected page
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/login/);

    // Persist storage state
    mkdirSync(dirname(account.file), { recursive: true });
    await page.context().storageState({ path: account.file });
  });
}
