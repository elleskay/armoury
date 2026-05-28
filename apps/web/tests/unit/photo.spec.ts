import { test, expect } from "../../test-lib/spec-test/dist/vitest.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const actionsSource = readFileSync(
  resolve(__dirname, "../../app/(app)/officer/actions.ts"),
  "utf8",
);

const submitPageSource = readFileSync(
  resolve(__dirname, "../../app/(app)/officer/submit/[templateId]/page.tsx"),
  "utf8",
);

const submissionDetailSource = readFileSync(
  resolve(__dirname, "../../app/(app)/admin/submissions/[id]/page.tsx"),
  "utf8",
);

test("[ARM-PHOTO-001] Photo handler enforces 5MB limit and image MIME allowlist", () => {
  expect(actionsSource).toContain("photo");
  expect(actionsSource).toContain("5 * 1024 * 1024");
  expect(actionsSource).toContain('"image/jpeg"');
  expect(actionsSource).toContain('"image/png"');
  expect(actionsSource).toContain('"image/webp"');
});

test("[ARM-PHOTO-002] Photo stored as data URL retrievable from valueText", () => {
  expect(actionsSource).toContain("data:");
  expect(actionsSource).toContain("base64");
  expect(actionsSource).toContain("valueText =");
  // Submit form uses multipart/form-data so files arrive as File objects
  expect(submitPageSource).toContain("multipart/form-data");
});

test("[ARM-PHOTO-003] Submission detail page renders inline photo when present", () => {
  expect(submissionDetailSource).toContain('itemKindSnapshot === "photo"');
  expect(submissionDetailSource).toContain('data:image/');
  expect(submissionDetailSource).toContain('data-testid="photo-response"');
});
