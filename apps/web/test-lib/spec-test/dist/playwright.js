import { test as base, expect as pwExpect, } from "@playwright/test";
import { recordCoverage } from "./coverage.js";
export const expect = pwExpect;
export const test = base;
export function specTest(id, titleOrFn, bodyOrOptions, maybeOptions) {
    const title = typeof titleOrFn === "string" ? titleOrFn : id;
    const body = typeof titleOrFn === "function"
        ? titleOrFn
        : bodyOrOptions;
    const opts = (typeof titleOrFn === "string"
        ? maybeOptions
        : bodyOrOptions) ?? {};
    if (typeof body !== "function") {
        throw new Error(`specTest(${id}): body function is required`);
    }
    base(`[${id}] ${title}`, async ({ ...fixtures }, testInfo) => {
        const start = Date.now();
        let passed = true;
        try {
            await body(fixtures, testInfo);
        }
        catch (err) {
            passed = false;
            throw err;
        }
        finally {
            recordCoverage({
                id,
                status: passed ? "passed" : "failed",
                category: opts.category,
                file: testInfo.file,
                durationMs: Date.now() - start,
            });
        }
    });
}
//# sourceMappingURL=playwright.js.map