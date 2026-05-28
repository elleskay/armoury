import { relations, sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "officer"]);
export const itemKind = pgEnum("item_kind", [
  "boolean",
  "text",
  "number",
  "dropdown",
  "date_time",
  "photo",
]);
export const issueStatus = pgEnum("issue_status", ["open", "in_progress", "resolved"]);
export const agency = pgEnum("agency", ["FRS", "ICA", "SPS", "hospital"]);
export const templateStatus = pgEnum("template_status", ["draft", "published"]);
export const frequency = pgEnum("frequency", ["daily", "twice_daily", "weekly", "open"]);
export const shiftWindow = pgEnum("shift_window", ["am", "pm", "night", "any"]);
export const issueSeverity = pgEnum("issue_severity", ["low", "medium", "high", "critical"]);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  agency: agency("agency").notNull(),
  webhookUrl: varchar("webhook_url", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("officer"),
    teamId: uuid("team_id").references(() => teams.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("users_team_idx").on(t.teamId)],
);

export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    teamId: uuid("team_id").references(() => teams.id),
    createdById: uuid("created_by_id")
      .references(() => users.id)
      .notNull(),
    status: templateStatus("status").notNull().default("published"),
    frequency: frequency("frequency").notNull().default("open"),
    shiftWindow: shiftWindow("shift_window").notNull().default("any"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    schedulePausedAt: timestamp("schedule_paused_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("templates_team_idx").on(t.teamId),
    index("templates_status_idx").on(t.status),
  ],
);

export const templateItems = pgTable(
  "template_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .references(() => templates.id, { onDelete: "cascade" })
      .notNull(),
    position: integer("position").notNull(),
    label: varchar("label", { length: 300 }).notNull(),
    kind: itemKind("kind").notNull().default("boolean"),
    required: boolean("required").notNull().default(true),
    options: jsonb("options").$type<string[]>(),
  },
  (t) => [index("items_template_idx").on(t.templateId)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateId: uuid("template_id")
      .references(() => templates.id)
      .notNull(),
    officerId: uuid("officer_id")
      .references(() => users.id)
      .notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    score: integer("score").notNull().default(100),
    itemCount: integer("item_count").notNull().default(0),
    okCount: integer("ok_count").notNull().default(0),
  },
  (t) => [
    index("submissions_template_idx").on(t.templateId),
    index("submissions_officer_idx").on(t.officerId),
    index("submissions_submitted_idx").on(t.submittedAt),
    index("submissions_score_idx").on(t.score),
  ],
);

export const responses = pgTable(
  "responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .references(() => submissions.id, { onDelete: "cascade" })
      .notNull(),
    templateItemId: uuid("template_item_id")
      .references(() => templateItems.id)
      .notNull(),
    valueBoolean: boolean("value_boolean"),
    valueText: text("value_text"),
    valueNumber: integer("value_number"),
    valueDate: timestamp("value_date", { withTimezone: true }),
    hasIssue: boolean("has_issue").notNull().default(false),
    issueNote: text("issue_note"),
    // Snapshots at submission time so later template edits do not
    // retroactively change historical reports.
    itemLabelSnapshot: varchar("item_label_snapshot", { length: 300 }),
    itemKindSnapshot: varchar("item_kind_snapshot", { length: 30 }),
  },
  (t) => [index("responses_submission_idx").on(t.submissionId)],
);

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id").references(() => submissions.id, {
      onDelete: "cascade",
    }),
    templateItemId: uuid("template_item_id").references(() => templateItems.id),
    teamId: uuid("team_id").references(() => teams.id),
    raisedById: uuid("raised_by_id").references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    note: text("note").notNull(),
    severity: issueSeverity("severity").notNull().default("medium"),
    status: issueStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedById: uuid("resolved_by_id").references(() => users.id),
    resolution: text("resolution"),
  },
  (t) => [
    index("issues_status_idx").on(t.status),
    index("issues_severity_idx").on(t.severity),
    index("issues_team_idx").on(t.teamId),
    index("issues_submission_idx").on(t.submissionId),
  ],
);

export const teamsRelations = relations(teams, ({ many }) => ({
  users: many(users),
  templates: many(templates),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  team: one(teams, { fields: [users.teamId], references: [teams.id] }),
  submissions: many(submissions),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  team: one(teams, { fields: [templates.teamId], references: [teams.id] }),
  createdBy: one(users, { fields: [templates.createdById], references: [users.id] }),
  items: many(templateItems),
  submissions: many(submissions),
}));

export const templateItemsRelations = relations(templateItems, ({ one, many }) => ({
  template: one(templates, { fields: [templateItems.templateId], references: [templates.id] }),
  responses: many(responses),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  template: one(templates, { fields: [submissions.templateId], references: [templates.id] }),
  officer: one(users, { fields: [submissions.officerId], references: [users.id] }),
  responses: many(responses),
  issues: many(issues),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  submission: one(submissions, { fields: [responses.submissionId], references: [submissions.id] }),
  templateItem: one(templateItems, {
    fields: [responses.templateItemId],
    references: [templateItems.id],
  }),
}));

export const skippedChecks = pgTable(
  "skipped_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    officerId: uuid("officer_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    templateId: uuid("template_id")
      .references(() => templates.id, { onDelete: "cascade" })
      .notNull(),
    skippedFor: varchar("skipped_for", { length: 10 }).notNull(),
    reason: varchar("reason", { length: 500 }).notNull(),
    skippedAt: timestamp("skipped_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("skipped_officer_idx").on(t.officerId),
    index("skipped_template_idx").on(t.templateId),
    index("skipped_for_idx").on(t.skippedFor),
  ],
);

export type SkippedCheck = typeof skippedChecks.$inferSelect;

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    targetType: varchar("target_type", { length: 50 }).notNull(),
    targetId: uuid("target_id"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_logs_actor_idx").on(t.actorId),
    index("audit_logs_action_idx").on(t.action),
    index("audit_logs_created_idx").on(t.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;

export const issuesRelations = relations(issues, ({ one }) => ({
  submission: one(submissions, { fields: [issues.submissionId], references: [submissions.id] }),
  templateItem: one(templateItems, {
    fields: [issues.templateItemId],
    references: [templateItems.id],
  }),
  team: one(teams, { fields: [issues.teamId], references: [teams.id] }),
  raisedBy: one(users, { fields: [issues.raisedById], references: [users.id] }),
  resolvedBy: one(users, { fields: [issues.resolvedById], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type TemplateItem = typeof templateItems.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type Issue = typeof issues.$inferSelect;

export const _sql = sql;
