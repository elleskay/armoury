import type { RequirementCategory } from "./schema.js";
export declare const expect: import("vitest").ExpectStatic;
export declare const test: import("vitest").TestAPI;
export interface SpecTestOptions {
    category?: RequirementCategory;
}
export type SpecTestBody = () => void | Promise<void>;
export declare function specTest(id: string, fn: SpecTestBody): void;
export declare function specTest(id: string, fn: SpecTestBody, opts: SpecTestOptions): void;
export declare function specTest(id: string, title: string, fn: SpecTestBody): void;
export declare function specTest(id: string, title: string, fn: SpecTestBody, opts: SpecTestOptions): void;
//# sourceMappingURL=vitest.d.ts.map