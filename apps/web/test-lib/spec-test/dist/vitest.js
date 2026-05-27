import { test as vitestTest, expect as vitestExpect } from "vitest";
import { recordCoverage } from "./coverage.js";
export const expect = vitestExpect;
export const test = vitestTest;
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
    vitestTest(`[${id}] ${title}`, async () => {
        const start = Date.now();
        let passed = true;
        try {
            await body();
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
                durationMs: Date.now() - start,
            });
        }
    });
}
//# sourceMappingURL=vitest.js.map