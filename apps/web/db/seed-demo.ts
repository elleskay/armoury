import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { and, eq, gte, inArray } from "drizzle-orm";
import * as schema from "./schema";

// Prod-safe demo seed. Idempotent: looks up by natural key, only inserts if
// missing. Never deletes, never touches user-generated data (submissions,
// responses, issues, audit_logs). Safe to run on every deploy.

type AgencyValue = "FRS" | "ICA" | "SPS" | "hospital";
type RoleValue = "admin" | "officer" | "logs_ic" | "team_admin" | "hq";
type FrequencyValue = "daily" | "twice_daily" | "weekly" | "open";
type ShiftValue = "am" | "pm" | "night" | "any";
type ItemKindValue = "boolean" | "text" | "number" | "dropdown" | "date_time" | "photo";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const passwordHash = await bcrypt.hash("password123", 10);

  async function ensureTeam(name: string, agency: AgencyValue) {
    const existing = await db
      .select()
      .from(schema.teams)
      .where(and(eq(schema.teams.name, name), eq(schema.teams.agency, agency)))
      .limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db.insert(schema.teams).values({ name, agency }).returning();
    return created;
  }

  async function ensureUser(
    email: string,
    name: string,
    role: RoleValue,
    teamId: string | null,
  ) {
    const existing = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(schema.users)
      .values({ email, name, passwordHash, role, teamId })
      .returning();
    return created;
  }

  type TemplateInput = {
    name: string;
    description: string;
    teamId: string | null;
    createdById: string;
    frequency: FrequencyValue;
    shiftWindow: ShiftValue;
  };
  type ItemInput = {
    position: number;
    label: string;
    kind: ItemKindValue;
    options?: string[];
    required?: boolean;
  };

  async function ensureTemplate(input: TemplateInput, items: ItemInput[]) {
    const existing = await db
      .select()
      .from(schema.templates)
      .where(eq(schema.templates.name, input.name))
      .limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db
      .insert(schema.templates)
      .values({ ...input, status: "published" })
      .returning();
    await db.insert(schema.templateItems).values(
      items.map((it) => ({
        templateId: created.id,
        position: it.position,
        label: it.label,
        kind: it.kind,
        options: it.options,
        required: it.required ?? true,
      })),
    );
    return created;
  }

  async function ensureInventoryItem(input: {
    externalRef: string;
    teamId: string;
    name: string;
    category: string;
    unit: string;
    currentStock: number;
    expiresAt: Date | null;
    lastStockTakeAt: Date | null;
  }) {
    const existing = await db
      .select()
      .from(schema.inventoryItems)
      .where(eq(schema.inventoryItems.externalRef, input.externalRef))
      .limit(1);
    if (existing[0]) return existing[0];
    const [created] = await db.insert(schema.inventoryItems).values(input).returning();
    return created;
  }

  const team1 = await ensureTeam("Central Fire Station", "FRS");
  const team2 = await ensureTeam("Tuas Checkpoint", "ICA");
  const team3 = await ensureTeam("Tan Tock Seng A&E", "hospital");

  const admin = await ensureUser("admin@armoury.test", "Admin User", "admin", team1.id);
  await ensureUser("officer@armoury.test", "Officer One", "officer", team1.id);
  await ensureUser("officer2@armoury.test", "Officer Two", "officer", team2.id);
  await ensureUser("nurse@armoury.test", "Nurse Lim", "officer", team3.id);

  await ensureTemplate(
    {
      name: "Fire Truck Daily Check",
      description: "Pre-shift readiness check for engine 1",
      teamId: team1.id,
      createdById: admin.id,
      frequency: "daily",
      shiftWindow: "am",
    },
    [
      { position: 1, label: "Tyres in good condition", kind: "boolean" },
      { position: 2, label: "Fuel above 75%", kind: "boolean" },
      { position: 3, label: "Hose connections secure", kind: "boolean" },
      { position: 4, label: "Mileage reading", kind: "number" },
      {
        position: 5,
        label: "Cabin condition",
        kind: "dropdown",
        options: ["Clean", "Needs cleaning", "Damaged"],
      },
      { position: 6, label: "Notes", kind: "text", required: false },
    ],
  );

  await ensureTemplate(
    {
      name: "Ambulance Equipment Audit",
      description: "End-of-shift equipment audit",
      teamId: team1.id,
      createdById: admin.id,
      frequency: "twice_daily",
      shiftWindow: "any",
    },
    [
      { position: 1, label: "Defibrillator charged", kind: "boolean" },
      { position: 2, label: "Oxygen tank above 50%", kind: "boolean" },
      { position: 3, label: "PPE supply count", kind: "number" },
      { position: 4, label: "Last drug kit expiry check", kind: "date_time" },
    ],
  );

  await ensureTemplate(
    {
      name: "A&E Crash Cart HOTO",
      description: "HandOverTakeOver between shifts: AM 0700, PM 1900, Night 2300.",
      teamId: team3.id,
      createdById: admin.id,
      frequency: "twice_daily",
      shiftWindow: "any",
    },
    [
      { position: 1, label: "Adrenaline (1mg) in stock", kind: "boolean" },
      { position: 2, label: "Amiodarone (150mg) in stock", kind: "boolean" },
      { position: 3, label: "Crash trolley seals intact", kind: "boolean" },
      {
        position: 4,
        label: "Shift handover",
        kind: "dropdown",
        options: ["AM to PM", "PM to Night", "Night to AM"],
      },
      { position: 5, label: "Drug expiry next 7 days", kind: "text", required: false },
    ],
  );

  await ensureTemplate(
    {
      name: "Engine 1 Vehicle Parade",
      description: "Daily vehicle parade with full history per chassis",
      teamId: team1.id,
      createdById: admin.id,
      frequency: "daily",
      shiftWindow: "am",
    },
    [
      { position: 1, label: "Outgoing callsign", kind: "text" },
      { position: 2, label: "Incoming callsign", kind: "text" },
      { position: 3, label: "Vehicle ID", kind: "text" },
      { position: 4, label: "Mileage at parade", kind: "number" },
    ],
  );

  await ensureTemplate(
    {
      name: "Weekly Hazmat Inspection",
      description: "Weekly EMS Hazmat readiness check",
      teamId: team1.id,
      createdById: admin.id,
      frequency: "weekly",
      shiftWindow: "any",
    },
    [
      { position: 1, label: "Decon shower operational", kind: "boolean" },
      { position: 2, label: "Level A suits in stock", kind: "number" },
      { position: 3, label: "Air monitors calibrated", kind: "boolean" },
    ],
  );

  await ensureTemplate(
    {
      name: "MRT Shelter Bishan Daily",
      description: "Location-bound checklist for MRT Shelter Bishan",
      teamId: null,
      createdById: admin.id,
      frequency: "daily",
      shiftWindow: "any",
    },
    [
      { position: 1, label: "Shelter location", kind: "text" },
      { position: 2, label: "Ventilation operational", kind: "boolean" },
      { position: 3, label: "Emergency exits clear", kind: "boolean" },
    ],
  );

  await ensureInventoryItem({
    externalRef: "ILMS-DRUG-1001",
    teamId: team1.id,
    name: "Adrenaline 1mg",
    category: "drug",
    unit: "vial",
    currentStock: 24,
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    lastStockTakeAt: new Date(),
  });

  await ensureInventoryItem({
    externalRef: "ILMS-CONS-2034",
    teamId: team1.id,
    name: "Oxygen tank D-size",
    category: "consumable",
    unit: "tank",
    currentStock: 8,
    expiresAt: null,
    lastStockTakeAt: new Date(),
  });

  await ensureInventoryItem({
    externalRef: "ILMS-DISP-3127",
    teamId: team3.id,
    name: "Suction catheter 14Fr",
    category: "disposable",
    unit: "each",
    currentStock: 42,
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    lastStockTakeAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  });

  // Extra inventory variety: low-stock and expiring-soon to populate the
  // Pulse stat cards. expiresAt uses Date.now() at first-insert only; the
  // value gets frozen because ensureInventoryItem skips on duplicate ref.
  await ensureInventoryItem({
    externalRef: "ILMS-CONS-2210",
    teamId: team1.id,
    name: "Splints (assorted)",
    category: "consumable",
    unit: "each",
    currentStock: 3,
    expiresAt: null,
    lastStockTakeAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  });
  await ensureInventoryItem({
    externalRef: "ILMS-CONS-2211",
    teamId: team1.id,
    name: "Defibrillator pads (adult)",
    category: "consumable",
    unit: "pair",
    currentStock: 2,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    lastStockTakeAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });
  await ensureInventoryItem({
    externalRef: "ILMS-DRUG-1099",
    teamId: team1.id,
    name: "Atropine 1mg",
    category: "drug",
    unit: "vial",
    currentStock: 12,
    expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    lastStockTakeAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });
  await ensureInventoryItem({
    externalRef: "ILMS-CONS-2300",
    teamId: team3.id,
    name: "Saline 0.9% 500ml bag",
    category: "consumable",
    unit: "bag",
    currentStock: 30,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    lastStockTakeAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  });
  await ensureInventoryItem({
    externalRef: "ILMS-DISP-3201",
    teamId: team1.id,
    name: "Bandages 10cm",
    category: "disposable",
    unit: "roll",
    currentStock: 100,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    lastStockTakeAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  });
  await ensureInventoryItem({
    externalRef: "ILMS-DISP-3202",
    teamId: team3.id,
    name: "IV cannula 18G",
    category: "disposable",
    unit: "each",
    currentStock: 60,
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    lastStockTakeAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  });

  await seedSyntheticActivity(db);

  await pool.end();
  console.warn("Demo seed complete (idempotent).");
}

// Deterministic anchor for synthetic activity. Bump this date to refresh the
// "last 30 days" demo window; otherwise reruns are no-ops once seeded.
const DEMO_ANCHOR = new Date("2026-05-29T07:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

async function seedSyntheticActivity(db: ReturnType<typeof drizzle<typeof schema>>) {
  // Pull everything we need to reference once.
  const allTemplates = await db.select().from(schema.templates);
  const allUsers = await db.select().from(schema.users);
  const officers = allUsers.filter((u) => u.role === "officer");
  const admin = allUsers.find((u) => u.role === "admin");
  if (!admin || officers.length === 0) return;

  const templateItemsByTpl = new Map<string, (typeof schema.templateItems.$inferSelect)[]>();
  if (allTemplates.length > 0) {
    const items = await db
      .select()
      .from(schema.templateItems)
      .where(
        inArray(
          schema.templateItems.templateId,
          allTemplates.map((t) => t.id),
        ),
      );
    for (const it of items) {
      const arr = templateItemsByTpl.get(it.templateId) ?? [];
      arr.push(it);
      templateItemsByTpl.set(it.templateId, arr);
    }
  }

  // Existing synthetic submissions: skip days we've already filled in.
  const windowStart = new Date(DEMO_ANCHOR.getTime() - 30 * DAY_MS);
  const existing = await db
    .select({ templateId: schema.submissions.templateId, submittedAt: schema.submissions.submittedAt })
    .from(schema.submissions)
    .where(gte(schema.submissions.submittedAt, windowStart));
  const haveSub = new Set(
    existing.map((s) => `${s.templateId}|${s.submittedAt.toISOString()}`),
  );

  function pickOfficer(teamId: string | null): typeof officers[number] {
    const scoped = teamId ? officers.filter((o) => o.teamId === teamId) : officers;
    const pool = scoped.length > 0 ? scoped : officers;
    return pool[0];
  }

  // Walk 30 days backward from anchor, generate deterministic activity.
  for (let dayIdx = 1; dayIdx <= 30; dayIdx++) {
    const dayBase = new Date(DEMO_ANCHOR.getTime() - dayIdx * DAY_MS);
    dayBase.setUTCHours(7, 0, 0, 0);

    for (let tplIdx = 0; tplIdx < allTemplates.length; tplIdx++) {
      const tpl = allTemplates[tplIdx];

      // ~70% inclusion rate, deterministic by (day, template) pair.
      if (((dayIdx * 13 + tplIdx * 7) % 10) >= 7) continue;

      const submittedAt = new Date(dayBase.getTime() + tplIdx * 30 * 60 * 1000);
      const key = `${tpl.id}|${submittedAt.toISOString()}`;
      if (haveSub.has(key)) continue;

      const items = templateItemsByTpl.get(tpl.id) ?? [];
      if (items.length === 0) continue;

      const failedMod = (dayIdx * 11 + tplIdx * 5) % 21;
      const failedCount =
        failedMod === 0 ? Math.min(2, items.length) :
        failedMod === 7 ? Math.min(2, items.length) :
        failedMod === 14 ? 1 : 0;
      const okCount = items.length - failedCount;
      const score = Math.round((okCount / items.length) * 100);

      const officer = pickOfficer(tpl.teamId);

      const [sub] = await db
        .insert(schema.submissions)
        .values({
          templateId: tpl.id,
          officerId: officer.id,
          submittedAt,
          itemCount: items.length,
          okCount,
          score,
        })
        .returning();

      await db.insert(schema.responses).values(
        items.map((item, idx) => {
          const isFail = idx >= items.length - failedCount;
          const v: typeof schema.responses.$inferInsert = {
            submissionId: sub.id,
            templateItemId: item.id,
            hasIssue: isFail,
            issueNote: isFail ? "Flagged during shift check, escalated to LIC." : null,
            itemLabelSnapshot: item.label,
            itemKindSnapshot: item.kind,
          };
          if (item.kind === "boolean") v.valueBoolean = !isFail;
          else if (item.kind === "number") v.valueNumber = isFail ? 30 : 85;
          else if (item.kind === "text") v.valueText = isFail ? "Needs follow-up" : "OK";
          else if (item.kind === "date_time") v.valueDate = submittedAt;
          else if (item.kind === "dropdown") {
            const opts = item.options ?? [];
            v.valueText = opts[isFail ? Math.min(opts.length - 1, 2) : 0] ?? "OK";
          }
          return v;
        }),
      );

      // Severe failures raise an issue; older ones are resolved.
      if (failedCount >= 2) {
        const severity: "low" | "medium" | "high" | "critical" =
          dayIdx % 14 === 0 ? "critical" :
          dayIdx % 7 === 0 ? "high" :
          dayIdx % 3 === 0 ? "medium" : "low";
        const resolved = dayIdx > 5;
        await db.insert(schema.issues).values({
          submissionId: sub.id,
          templateItemId: items[items.length - 1].id,
          teamId: tpl.teamId,
          raisedById: officer.id,
          title: `${tpl.name}: item failed during check`,
          note: "Found during shift readiness check, requires immediate follow-up before next deployment window.",
          severity,
          status: resolved ? "resolved" : "open",
          createdAt: submittedAt,
          resolvedAt: resolved ? new Date(submittedAt.getTime() + 3 * 60 * 60 * 1000) : null,
          resolvedById: resolved ? admin.id : null,
          resolution: resolved ? "Parts replaced, system verified operational by workshop." : null,
        });
      }
    }
  }

  // Skipped checks: 3 historical entries, idempotent by (officer, template, skippedAt).
  const skipPlan: Array<{ officer: typeof officers[number]; templateName: string; daysAgo: number; reason: string }> = [
    { officer: officers[0], templateName: "Fire Truck Daily Check", daysAgo: 5, reason: "Engine 1 out of service for inspection" },
    { officer: officers[0], templateName: "Ambulance Equipment Audit", daysAgo: 12, reason: "Vehicle dispatched, returned outside check window" },
    { officer: officers[2] ?? officers[0], templateName: "A&E Crash Cart HOTO", daysAgo: 3, reason: "Combined with morning consolidated audit" },
  ];
  for (const plan of skipPlan) {
    const tpl = allTemplates.find((t) => t.name === plan.templateName);
    if (!tpl) continue;
    const skippedAt = new Date(DEMO_ANCHOR.getTime() - plan.daysAgo * DAY_MS);
    const dup = await db
      .select()
      .from(schema.skippedChecks)
      .where(
        and(
          eq(schema.skippedChecks.officerId, plan.officer.id),
          eq(schema.skippedChecks.templateId, tpl.id),
          eq(schema.skippedChecks.skippedAt, skippedAt),
        ),
      )
      .limit(1);
    if (dup[0]) continue;
    const skippedFor = skippedAt.toISOString().slice(0, 10);
    await db.insert(schema.skippedChecks).values({
      officerId: plan.officer.id,
      templateId: tpl.id,
      skippedFor,
      reason: plan.reason,
      skippedAt,
    });
  }

  // Audit log: deterministic entries idempotent by (actor, action, createdAt).
  const auditPlan: Array<{ action: string; targetType: string; targetTemplateName: string | null; daysAgo: number; payload: Record<string, unknown> }> = [
    { action: "template.create", targetType: "template", targetTemplateName: "Engine 1 Vehicle Parade", daysAgo: 28, payload: { status: "published" } },
    { action: "template.publish", targetType: "template", targetTemplateName: "Engine 1 Vehicle Parade", daysAgo: 28, payload: {} },
    { action: "template.edit", targetType: "template", targetTemplateName: "Ambulance Equipment Audit", daysAgo: 15, payload: { changed: ["description"] } },
    { action: "template.pause", targetType: "template", targetTemplateName: "Weekly Hazmat Inspection", daysAgo: 8, payload: { reason: "Awaiting calibration certificate" } },
    { action: "template.resume", targetType: "template", targetTemplateName: "Weekly Hazmat Inspection", daysAgo: 6, payload: {} },
    { action: "invite.create", targetType: "invite", targetTemplateName: null, daysAgo: 20, payload: { role: "officer", expiresInDays: 7 } },
    { action: "issue.resolve", targetType: "issue", targetTemplateName: null, daysAgo: 4, payload: { severity: "high" } },
    { action: "template.edit", targetType: "template", targetTemplateName: "Fire Truck Daily Check", daysAgo: 11, payload: { changed: ["items"] } },
    { action: "inventory.adjust", targetType: "inventory_item", targetTemplateName: null, daysAgo: 9, payload: { itemName: "Adrenaline 1mg", delta: -2 } },
    { action: "team.update", targetType: "team", targetTemplateName: null, daysAgo: 22, payload: { field: "telegram_chat_id" } },
  ];
  for (const plan of auditPlan) {
    const createdAt = new Date(DEMO_ANCHOR.getTime() - plan.daysAgo * DAY_MS);
    const dup = await db
      .select()
      .from(schema.auditLogs)
      .where(
        and(
          eq(schema.auditLogs.actorId, admin.id),
          eq(schema.auditLogs.action, plan.action),
          eq(schema.auditLogs.createdAt, createdAt),
        ),
      )
      .limit(1);
    if (dup[0]) continue;
    const targetTpl = plan.targetTemplateName
      ? allTemplates.find((t) => t.name === plan.targetTemplateName) ?? null
      : null;
    await db.insert(schema.auditLogs).values({
      actorId: admin.id,
      action: plan.action,
      targetType: plan.targetType,
      targetId: targetTpl?.id ?? null,
      payload: plan.payload,
      createdAt,
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
