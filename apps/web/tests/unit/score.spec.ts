import { specTest, expect } from "../../test-lib/spec-test/dist/vitest.js";
import { computeScore } from "@/lib/score";

specTest(
  "ARM-SCORE-001",
  "Score is round(okCount / itemCount * 100)",
  () => {
    expect(computeScore({ okCount: 5, itemCount: 6 })).toBe(83);
    expect(computeScore({ okCount: 7, itemCount: 10 })).toBe(70);
    expect(computeScore({ okCount: 1, itemCount: 3 })).toBe(33);
  },
  { category: "data" },
);

specTest(
  "ARM-SCORE-002",
  "Empty submission (zero items) yields score 100",
  () => {
    expect(computeScore({ okCount: 0, itemCount: 0 })).toBe(100);
  },
  { category: "data" },
);

specTest(
  "ARM-SCORE-003",
  "All-ok submission yields score 100",
  () => {
    expect(computeScore({ okCount: 6, itemCount: 6 })).toBe(100);
    expect(computeScore({ okCount: 12, itemCount: 12 })).toBe(100);
  },
  { category: "data" },
);

specTest(
  "ARM-SCORE-004",
  "All-fail submission yields score 0",
  () => {
    expect(computeScore({ okCount: 0, itemCount: 6 })).toBe(0);
    expect(computeScore({ okCount: 0, itemCount: 50 })).toBe(0);
  },
  { category: "data" },
);
