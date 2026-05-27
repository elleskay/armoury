import { expect } from "@playwright/test";
/**
 * Extended Playwright `test` that auto-records spec coverage.
 *
 * Title convention: "[ARM-XXX-001] human description". The leading
 * [ID] is parsed; if present, the test's outcome is appended to
 * .spec-coverage/results.jsonl in a post-test hook.
 *
 * Tests without a [ID] prefix run normally and are not recorded.
 */
export declare const test: import("playwright/test").TestType<import("playwright/test").PlaywrightTestArgs & import("playwright/test").PlaywrightTestOptions & {
    specCoverage: void;
}, import("playwright/test").PlaywrightWorkerArgs & import("playwright/test").PlaywrightWorkerOptions>;
export { expect };
//# sourceMappingURL=playwright.d.ts.map