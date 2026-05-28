import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as schema from "./schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  const passwordHash = await bcrypt.hash("password123", 10);

  await db.delete(schema.responses);
  await db.delete(schema.issues);
  await db.delete(schema.submissions);
  await db.delete(schema.templateItems);
  await db.delete(schema.templates);
  await db.delete(schema.users);
  await db.delete(schema.teams);

  const [team1, team2, team3] = await db
    .insert(schema.teams)
    .values([
      { name: "Central Fire Station", agency: "FRS" },
      { name: "Tuas Checkpoint", agency: "ICA" },
      { name: "Tan Tock Seng A&E", agency: "hospital" },
    ])
    .returning();

  const [admin] = await db
    .insert(schema.users)
    .values([
      {
        email: "admin@armoury.test",
        name: "Admin User",
        passwordHash,
        role: "admin",
        teamId: team1.id,
      },
      {
        email: "officer@armoury.test",
        name: "Officer One",
        passwordHash,
        role: "officer",
        teamId: team1.id,
      },
      {
        email: "officer2@armoury.test",
        name: "Officer Two",
        passwordHash,
        role: "officer",
        teamId: team2.id,
      },
      {
        email: "nurse@armoury.test",
        name: "Nurse Lim",
        passwordHash,
        role: "officer",
        teamId: team3.id,
      },
    ])
    .returning();

  const [tmpl1, tmpl2, tmpl3, tmpl4, tmpl5, tmpl6] = await db
    .insert(schema.templates)
    .values([
      {
        name: "Fire Truck Daily Check",
        description: "Pre-shift readiness check for engine 1",
        teamId: team1.id,
        createdById: admin.id,
        status: "published",
        frequency: "daily",
        shiftWindow: "am",
      },
      {
        name: "Ambulance Equipment Audit",
        description: "End-of-shift equipment audit",
        teamId: team1.id,
        createdById: admin.id,
        status: "published",
        frequency: "twice_daily",
        shiftWindow: "any",
      },
      {
        name: "A&E Crash Cart HOTO",
        description: "HandOverTakeOver between shifts: AM 0700, PM 1900, Night 2300.",
        teamId: team3.id,
        createdById: admin.id,
        status: "published",
        frequency: "twice_daily",
        shiftWindow: "any",
      },
      {
        name: "Engine 1 Vehicle Parade",
        description: "Daily vehicle parade with full history per chassis",
        teamId: team1.id,
        createdById: admin.id,
        status: "published",
        frequency: "daily",
        shiftWindow: "am",
      },
      {
        name: "Weekly Hazmat Inspection",
        description: "Weekly EMS Hazmat readiness check",
        teamId: team1.id,
        createdById: admin.id,
        status: "published",
        frequency: "weekly",
        shiftWindow: "any",
      },
      {
        name: "MRT Shelter Bishan Daily",
        description: "Location-bound checklist for MRT Shelter Bishan",
        teamId: null,
        createdById: admin.id,
        status: "published",
        frequency: "daily",
        shiftWindow: "any",
      },
    ])
    .returning();

  await db.insert(schema.templateItems).values([
    // Fire Truck Daily
    { templateId: tmpl1.id, position: 1, label: "Tyres in good condition", kind: "boolean" },
    { templateId: tmpl1.id, position: 2, label: "Fuel above 75%", kind: "boolean" },
    { templateId: tmpl1.id, position: 3, label: "Hose connections secure", kind: "boolean" },
    { templateId: tmpl1.id, position: 4, label: "Mileage reading", kind: "number" },
    {
      templateId: tmpl1.id,
      position: 5,
      label: "Cabin condition",
      kind: "dropdown",
      options: ["Clean", "Needs cleaning", "Damaged"],
    },
    { templateId: tmpl1.id, position: 6, label: "Notes", kind: "text", required: false },
    {
      templateId: tmpl1.id,
      position: 7,
      label: "Dashboard photo",
      kind: "photo",
      required: false,
    },

    // Ambulance Equipment
    { templateId: tmpl2.id, position: 1, label: "Defibrillator charged", kind: "boolean" },
    { templateId: tmpl2.id, position: 2, label: "Oxygen tank above 50%", kind: "boolean" },
    { templateId: tmpl2.id, position: 3, label: "PPE supply count", kind: "number" },
    {
      templateId: tmpl2.id,
      position: 4,
      label: "Last drug kit expiry check",
      kind: "date_time",
      required: true,
    },

    // A&E Crash Cart
    { templateId: tmpl3.id, position: 1, label: "Adrenaline (1mg) in stock", kind: "boolean" },
    { templateId: tmpl3.id, position: 2, label: "Amiodarone (150mg) in stock", kind: "boolean" },
    { templateId: tmpl3.id, position: 3, label: "Crash trolley seals intact", kind: "boolean" },
    {
      templateId: tmpl3.id,
      position: 4,
      label: "Shift handover",
      kind: "dropdown",
      options: ["AM to PM", "PM to Night", "Night to AM"],
    },
    {
      templateId: tmpl3.id,
      position: 5,
      label: "Drug expiry next 7 days",
      kind: "text",
      required: false,
    },

    // Engine 1 Vehicle Parade
    {
      templateId: tmpl4.id,
      position: 1,
      label: "Outgoing callsign",
      kind: "text",
    },
    {
      templateId: tmpl4.id,
      position: 2,
      label: "Incoming callsign",
      kind: "text",
    },
    { templateId: tmpl4.id, position: 3, label: "Vehicle ID", kind: "text" },
    {
      templateId: tmpl4.id,
      position: 4,
      label: "Mileage at parade",
      kind: "number",
    },

    // Weekly Hazmat Inspection
    { templateId: tmpl5.id, position: 1, label: "Decon shower operational", kind: "boolean" },
    { templateId: tmpl5.id, position: 2, label: "Level A suits in stock", kind: "number" },
    { templateId: tmpl5.id, position: 3, label: "Air monitors calibrated", kind: "boolean" },

    // MRT Shelter Bishan
    { templateId: tmpl6.id, position: 1, label: "Shelter location", kind: "text" },
    { templateId: tmpl6.id, position: 2, label: "Ventilation operational", kind: "boolean" },
    { templateId: tmpl6.id, position: 3, label: "Emergency exits clear", kind: "boolean" },
  ]);

  // Inventory items for Pulse module
  await db.insert(schema.inventoryItems).values([
    {
      teamId: team1.id,
      name: "Adrenaline 1mg",
      category: "drug",
      unit: "vial",
      currentStock: 24,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      lastStockTakeAt: new Date(),
      externalRef: "ILMS-DRUG-1001",
    },
    {
      teamId: team1.id,
      name: "Oxygen tank D-size",
      category: "consumable",
      unit: "tank",
      currentStock: 8,
      expiresAt: null,
      lastStockTakeAt: new Date(),
      externalRef: "ILMS-CONS-2034",
    },
    {
      teamId: team3.id,
      name: "Suction catheter 14Fr",
      category: "disposable",
      unit: "each",
      currentStock: 42,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      lastStockTakeAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      externalRef: "ILMS-DISP-3127",
    },
  ]);

  await pool.end();
  console.warn("Seed complete.");
  console.warn("Admin login: admin@armoury.test / password123");
  console.warn("Officer login: officer@armoury.test / password123");
  console.warn("Nurse login: nurse@armoury.test / password123");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
