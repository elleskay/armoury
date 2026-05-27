export function buildReport(spec, entries) {
    const byId = new Map();
    for (const e of entries) {
        const arr = byId.get(e.id) ?? [];
        arr.push(e);
        byId.set(e.id, arr);
    }
    const uncovered = [];
    const failing = [];
    const categoryMismatches = [];
    for (const req of spec.requirements) {
        const hits = byId.get(req.id) ?? [];
        const passing = hits.filter((h) => h.status === "passed");
        const failures = hits.filter((h) => h.status === "failed");
        if (hits.length === 0) {
            uncovered.push(req);
            continue;
        }
        if (passing.length === 0) {
            failing.push({ req, failingTests: failures });
            continue;
        }
        const observedCategories = new Set(hits.map((h) => h.category).filter((c) => Boolean(c)));
        if (observedCategories.size > 0 && !observedCategories.has(req.category)) {
            categoryMismatches.push({ req, observed: observedCategories });
        }
    }
    const covered = spec.requirements.length - uncovered.length - failing.length;
    const total = spec.requirements.length;
    return {
        totalRequirements: total,
        coveredRequirements: covered,
        uncoveredRequirements: uncovered,
        failingRequirements: failing,
        categoryMismatches,
        coveragePct: total === 0 ? 100 : Math.round((covered / total) * 1000) / 10,
        passed: uncovered.length === 0 &&
            failing.length === 0 &&
            categoryMismatches.length === 0,
    };
}
export function renderMarkdown(spec, report) {
    const lines = [];
    lines.push(`# Spec coverage: ${spec.app} v${spec.version}`);
    lines.push("");
    lines.push(`**${report.coveragePct}% covered** (${report.coveredRequirements}/${report.totalRequirements} requirements passed at least one test)`);
    lines.push("");
    if (report.passed) {
        lines.push("All requirements covered by passing tests.");
        lines.push("");
    }
    if (report.uncoveredRequirements.length > 0) {
        lines.push(`## Uncovered (${report.uncoveredRequirements.length})`);
        lines.push("");
        lines.push("| ID | Title | Category | Severity |");
        lines.push("|---|---|---|---|");
        for (const req of report.uncoveredRequirements) {
            lines.push(`| \`${req.id}\` | ${req.title} | ${req.category} | ${req.severity} |`);
        }
        lines.push("");
    }
    if (report.failingRequirements.length > 0) {
        lines.push(`## Failing (${report.failingRequirements.length})`);
        lines.push("");
        lines.push("| ID | Title | Failing tests |");
        lines.push("|---|---|---|");
        for (const { req, failingTests } of report.failingRequirements) {
            lines.push(`| \`${req.id}\` | ${req.title} | ${failingTests.length} |`);
        }
        lines.push("");
    }
    if (report.categoryMismatches.length > 0) {
        lines.push(`## Category mismatches (${report.categoryMismatches.length})`);
        lines.push("");
        lines.push("Spec declares a category but the only passing test runs in a different layer (e.g. `category: ui` covered only by a Vitest unit test).");
        lines.push("");
        lines.push("| ID | Spec category | Test categories |");
        lines.push("|---|---|---|");
        for (const m of report.categoryMismatches) {
            lines.push(`| \`${m.req.id}\` | ${m.req.category} | ${[...m.observed].join(", ") || "(none)"} |`);
        }
        lines.push("");
    }
    return lines.join("\n");
}
//# sourceMappingURL=report.js.map