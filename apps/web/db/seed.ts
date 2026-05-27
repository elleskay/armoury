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

  const [tmpl1, tmpl2, tmpl3] = await db
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
