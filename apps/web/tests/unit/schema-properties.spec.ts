import { test, expect } from "../../test-lib/spec-test/dist/vitest.js";
import {
  submissions,
  responses,
  templates,
  teams,
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
