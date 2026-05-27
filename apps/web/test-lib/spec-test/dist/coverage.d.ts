export interface CoverageEntry {
    id: string;
    status: "passed" | "failed";
    category?: string;
    file?: string;
    durationMs?: number;
    timestamp: string;
}
export declare function getCoveragePath(): string;
export declare function recordCoverage(entry: Omit<CoverageEntry, "timestamp">): void;
export declare function readCoverage(path?: string): CoverageEntry[];
export declare function resetCoverage(path?: string): void;
//# sourceMappingURL=coverage.d.ts.map