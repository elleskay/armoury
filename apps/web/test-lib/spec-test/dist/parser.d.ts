import type { SpecFile as SpecFileT } from "./schema.js";
export interface ParseResult {
    spec: SpecFileT;
    path: string;
}
export declare class SpecParseError extends Error {
    readonly path: string;
    readonly issues?: unknown | undefined;
    constructor(message: string, path: string, issues?: unknown | undefined);
}
export declare function parseSpec(path: string): ParseResult;
export declare function getRequirementIds(spec: SpecFileT): Set<string>;
//# sourceMappingURL=parser.d.ts.map