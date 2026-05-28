import { resetCoverage } from "../../test-lib/spec-test/dist/index.js";

// Vitest globalSetup runs ONCE before any test file. resetCoverage was
// previously in setupFiles which ran per-file and wiped records from
// earlier files, causing ARM-SCORE-* and other early-alphabetic files
// to be reported uncovered even when their tests passed.
export default function setup() {
  resetCoverage();
}
