import { test, expect } from "../../test-lib/spec-test/dist/vitest.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Inspect the seed source for the variant templates. Avoids needing a
// live DB during unit tests.
const seedSource = readFileSync(
  resolve(__dirname, "../../db/seed.ts"),
  "utf8",
);

test("[ARM-CHECKLIST-001] HOTO variant template is seeded", () => {
  expect(seedSource).toContain("A&E Crash Cart HOTO");
  expect(seedSource).toContain("HandOverTakeOver");
  expect(seedSource).toContain("Shift handover");
});

test("[ARM-CHECKLIST-002] Vehicle parade template with chassis-bound fields", () => {
  expect(seedSource).toContain("Vehicle Parade");
  expect(seedSource).toContain("Outgoing callsign");
  expect(seedSource).toContain("Incoming callsign");
});

test("[ARM-CHECKLIST-003] EMS weekly Hazmat checklist", () => {
  expect(seedSource).toContain("Hazmat");
  expect(seedSource).toMatch(/frequency:\s*"weekly"/);
});

test("[ARM-CHECKLIST-004] MRT shelter location-bound template", () => {
  expect(seedSource).toContain("MRT Shelter");
});
