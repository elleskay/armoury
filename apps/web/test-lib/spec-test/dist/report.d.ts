import type { Requirement, SpecFile } from "./schema.js";
import type { CoverageEntry } from "./coverage.js";
export interface CoverageReport {
    totalRequirements: number;
    coveredRequirements: number;
    uncoveredRequirements: Requirement[];
    failingRequirements: {
        req: Requirement;
        failingTests: CoverageEntry[];
    }[];
    categoryMismatches: {
        req: Requirement;
        observed: Set<string>;
    }[];
    coveragePct: number;
    passed: boolean;
}
export declare function buildReport(spec: SpecFile, entries: CoverageEntry[]): CoverageReport;
export declare function renderMarkdown(spec: SpecFile, report: CoverageReport): string;
//# sourceMappingURL=report.d.ts.map