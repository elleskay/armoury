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
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "officer"]);
export const itemKind = pgEnum("item_kind", ["boolean", "text", "number"]);
export const issueStatus = pgEnum("issue_status", ["open", "resolved"]);
export const agency = pgEnum("agency", ["FRS", "ICA", "SPS", "hospital"]);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull(),
  agency: agency("agency").notNull(),
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
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("templates_team_idx").on(t.teamId)],
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
    allOk: boolean("all_ok").notNull().default(true),
  },
  (t) => [
    index("submissions_template_idx").on(t.templateId),
    index("submissions_officer_idx").on(t.officerId),
    index("submissions_submitted_idx").on(t.submittedAt),
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
    hasIssue: boolean("has_issue").notNull().default(false),
    issueNote: text("issue_note"),
  },
  (t) => [index("responses_submission_idx").on(t.submissionId)],
);

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .references(() => submissions.id, { onDelete: "cascade" })
      .notNull(),
    templateItemId: uuid("template_item_id")
      .references(() => templateItems.id)
      .notNull(),
    note: text("note").notNull(),
    status: issueStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [
    index("issues_status_idx").on(t.status),
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

export const issuesRelations = relations(issues, ({ one }) => ({
  submission: one(submissions, { fields: [issues.submissionId], references: [submissions.id] }),
  templateItem: one(templateItems, {
    fields: [issues.templateItemId],
    references: [templateItems.id],
  }),
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
