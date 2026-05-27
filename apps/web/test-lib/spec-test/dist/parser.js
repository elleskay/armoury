import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { SpecFile } from "./schema.js";
export class SpecParseError extends Error {
    path;
    issues;
    constructor(message, path, issues) {
        super(message);
        this.path = path;
        this.issues = issues;
        this.name = "SpecParseError";
    }
}
export function parseSpec(path) {
    let raw;
    try {
        raw = readFileSync(path, "utf8");
    }
    catch (err) {
        throw new SpecParseError(`Failed to read spec file: ${err.message}`, path);
    }
    let doc;
    try {
        doc = parseYaml(raw);
    }
    catch (err) {
        throw new SpecParseError(`Invalid YAML in spec file: ${err.message}`, path);
    }
    const result = SpecFile.safeParse(doc);
    if (!result.success) {
        throw new SpecParseError(`Spec schema validation failed for ${path}`, path, result.error.issues);
    }
    return { spec: result.data, path };
}
export function getRequirementIds(spec) {
    return new Set(spec.requirements.map((r) => r.id));
}
//# sourceMappingURL=parser.js.map