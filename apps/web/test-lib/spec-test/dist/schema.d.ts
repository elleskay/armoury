import { z } from "zod";
export declare const RequirementCategory: z.ZodEnum<{
    functional: "functional";
    ui: "ui";
    security: "security";
    data: "data";
    a11y: "a11y";
}>;
export declare const RequirementSeverity: z.ZodEnum<{
    critical: "critical";
    high: "high";
    medium: "medium";
    low: "low";
}>;
export declare const Requirement: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    category: z.ZodEnum<{
        functional: "functional";
        ui: "ui";
        security: "security";
        data: "data";
        a11y: "a11y";
    }>;
    severity: z.ZodEnum<{
        critical: "critical";
        high: "high";
        medium: "medium";
        low: "low";
    }>;
    given: z.ZodString;
    when: z.ZodString;
    then: z.ZodString;
    tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    depends_on: z.ZodDefault<z.ZodArray<z.ZodString>>;
    notes: z.ZodOptional<z.ZodString>;
}, z.core.$strict>;
export declare const SpecFile: z.ZodObject<{
    app: z.ZodString;
    version: z.ZodNumber;
    requirements: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        category: z.ZodEnum<{
            functional: "functional";
            ui: "ui";
            security: "security";
            data: "data";
            a11y: "a11y";
        }>;
        severity: z.ZodEnum<{
            critical: "critical";
            high: "high";
            medium: "medium";
            low: "low";
        }>;
        given: z.ZodString;
        when: z.ZodString;
        then: z.ZodString;
        tags: z.ZodDefault<z.ZodArray<z.ZodString>>;
        depends_on: z.ZodDefault<z.ZodArray<z.ZodString>>;
        notes: z.ZodOptional<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type Requirement = z.infer<typeof Requirement>;
export type SpecFile = z.infer<typeof SpecFile>;
export type RequirementCategory = z.infer<typeof RequirementCategory>;
export type RequirementSeverity = z.infer<typeof RequirementSeverity>;
//# sourceMappingURL=schema.d.ts.map