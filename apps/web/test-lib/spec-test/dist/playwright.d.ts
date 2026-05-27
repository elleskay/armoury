import { type PlaywrightTestArgs, type PlaywrightTestOptions, type PlaywrightWorkerArgs, type PlaywrightWorkerOptions, type TestInfo } from "@playwright/test";
import type { RequirementCategory } from "./schema.js";
export declare const expect: import("playwright/test").Expect<{}>;
export declare const test: import("playwright/test").TestType<PlaywrightTestArgs & PlaywrightTestOptions, PlaywrightWorkerArgs & PlaywrightWorkerOptions>;
export interface SpecTestOptions {
    category?: RequirementCategory;
}
export type SpecTestFixtures = PlaywrightTestArgs & PlaywrightTestOptions & PlaywrightWorkerArgs & PlaywrightWorkerOptions;
export type SpecTestBody = (fixtures: SpecTestFixtures, testInfo: TestInfo) => void | Promise<void>;
export declare function specTest(id: string, fn: SpecTestBody): void;
export declare function specTest(id: string, fn: SpecTestBody, opts: SpecTestOptions): void;
export declare function specTest(id: string, title: string, fn: SpecTestBody): void;
export declare function specTest(id: string, title: string, fn: SpecTestBody, opts: SpecTestOptions): void;
//# sourceMappingURL=playwright.d.ts.map