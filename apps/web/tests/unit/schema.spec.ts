import { test, expect } from "../../test-lib/spec-test/dist/vitest.js";
import {
  agency,
  frequency,
  shiftWindow,
  userRole,
} from "@/db/schema";

test("[ARM-TEAMS-001] agency enum is FRS, ICA, SPS, hospital", () => {
  expect([...agency.enumValues].sort()).toEqual(
    ["FRS", "ICA", "SPS", "hospital"].sort(),
  );
});

test("[ARM-TEAMS-002] user role enum includes admin and officer (plus extended roles)", () => {
  expect(userRole.enumValues).toContain("admin");
  expect(userRole.enumValues).toContain("officer");
});

test("[ARM-SCHED-001] frequency enum is daily, twice_daily, weekly, open", () => {
  expect([...frequency.enumValues].sort()).toEqual(
    ["daily", "open", "twice_daily", "weekly"].sort(),
  );
});

test("[ARM-SCHED-002] shift window enum is am, pm, night, any", () => {
  expect([...shiftWindow.enumValues].sort()).toEqual(
    ["am", "any", "night", "pm"].sort(),
  );
});
