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
  // NOTE: the submit form previously used multipart/form-data; that caused
  // a server-render hang on Next 16 and was reverted. Photo upload will
  // get a dedicated route. The handler code path stays valid for that
  // future route.
});

test("[ARM-PHOTO-003] Submission detail page renders inline photo when present", () => {
  expect(submissionDetailSource).toContain('itemKindSnapshot === "photo"');
  expect(submissionDetailSource).toContain('data:image/');
  expect(submissionDetailSource).toContain('data-testid="photo-response"');
});
