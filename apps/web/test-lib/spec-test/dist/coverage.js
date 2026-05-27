import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, } from "node:fs";
import { dirname } from "node:path";
const DEFAULT_PATH = process.env.SPEC_COVERAGE_FILE ?? ".spec-coverage/results.jsonl";
export function getCoveragePath() {
    return DEFAULT_PATH;
}
export function recordCoverage(entry) {
    const path = getCoveragePath();
    const dir = dirname(path);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    const line = JSON.stringify({
        ...entry,
        timestamp: new Date().toISOString(),
    });
    appendFileSync(path, line + "\n", "utf8");
}
export function readCoverage(path = getCoveragePath()) {
    if (!existsSync(path))
        return [];
    const raw = readFileSync(path, "utf8");
    return raw
        .split("\n")
        .filter((l) => l.trim().length > 0)
        .map((l) => JSON.parse(l));
}
export function resetCoverage(path = getCoveragePath()) {
    if (existsSync(path)) {
        unlinkSync(path);
    }
}
//# sourceMappingURL=coverage.js.map