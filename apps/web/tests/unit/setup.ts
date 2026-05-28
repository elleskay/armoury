import { setupSpecCoverage } from "../../test-lib/spec-test/dist/vitest.js";

// Per-file setup. Registers the afterEach hook that records coverage
// based on test name (must run before tests in each file). Coverage
// file reset happens once in tests/unit/global-setup.ts so records
// accumulate across files instead of being wiped per file.
setupSpecCoverage();
