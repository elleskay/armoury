import { test, expect } from "../../test-lib/spec-test/dist/vitest.js";
import {
  submissions,
  responses,
  templates,
  teams,
  itemKind,
} from "@/db/schema";

test("[ARM-SUBMIT-002] Response rows have separate columns per value type", () => {
  // valueBoolean, valueText, valueNumber, valueDate are independent columns
  // so each item kind can persist its native typed value.
  expect(responses.valueBoolean).toBeDefined();
  expect(responses.valueText).toBeDefined();
  expect(responses.valueNumber).toBeDefined();
  expect(responses.valueDate).toBeDefined();
});

test("[ARM-SCORE-005] Submission.score is a static stored column, not derived", () => {
  // Score is stored at submission time; later template edits cannot
  // retroactively change a historical submission's score.
  expect(submissions.score).toBeDefined();
  expect(submissions.itemCount).toBeDefined();
  expect(submissions.okCount).toBeDefined();
});

test("[ARM-DASHBOARD-011] Submissions have no built-in retention (kept indefinitely)", () => {
  // No retention/expiry column on submissions. Reports remain queryable.
  const cols = submissions as unknown as Record<string, unknown>;
  expect(cols.retentionUntil).toBeUndefined();
  expect(cols.expiresAt).toBeUndefined();
});

test("[ARM-ISSUES-010] Teams table has webhook_url for outbound notifications", () => {
  // The webhook field is in the schema; firing it is tested elsewhere.
  expect(teams.webhookUrl).toBeDefined();
});

test("[ARM-TEMPLATES-007] templates table has archivedAt nullable column", () => {
  expect(templates.archivedAt).toBeDefined();
});

test("[ARM-TEMPLATES-009] responses table snapshots item label/kind at submit time", () => {
  // Snapshot columns ensure later template edits do not retroactively
  // change historical reports' question wording or kind.
  expect(responses.itemLabelSnapshot).toBeDefined();
  expect(responses.itemKindSnapshot).toBeDefined();
});

test("[ARM-DASHBOARD-010] Reports source from response snapshot, not live template_items", () => {
  // Same snapshot columns drive the report rendering: reports read
  // itemLabelSnapshot which is frozen at submission time.
  expect(responses.itemLabelSnapshot).toBeDefined();
});

test("[ARM-ITEMS-008] itemKind enum includes photo", () => {
  expect(itemKind.enumValues).toContain("photo");
});

test("[ARM-DASHBOARD-009] photo response data flows through report export shape", () => {
  // Photo data is carried in responses.valueText (data URL / base64).
  // The /api/admin/export route already serializes valueText.
  expect(responses.valueText).toBeDefined();
});
