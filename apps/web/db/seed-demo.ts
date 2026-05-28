import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
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

  await pool.end();
  console.warn("Demo seed complete (idempotent).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
