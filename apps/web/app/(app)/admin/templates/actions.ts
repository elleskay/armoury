"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { templates, templateItems, teams } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

const createTemplateSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  teamId: z.string().uuid().optional(),
  items: z
    .array(
      z.object({
        label: z.string().min(1).max(300),
        kind: z.enum(["boolean", "text", "number"]),
        required: z.boolean().default(true),
      }),
    )
    .min(1),
});

export async function createTemplate(formData: FormData) {
  const admin = await requireAdmin();

  const labels = formData.getAll("itemLabel").map(String);
  const kinds = formData.getAll("itemKind").map(String);

  const items = labels
    .map((label, i) => ({
      label: label.trim(),
      kind: (kinds[i] ?? "boolean") as "boolean" | "text" | "number",
      required: true,
    }))
    .filter((it) => it.label.length > 0);

  const teamIdRaw = formData.get("teamId");
  const parsed = createTemplateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    teamId: teamIdRaw && teamIdRaw !== "" ? teamIdRaw : undefined,
    items,
  });

  if (!parsed.success) {
    throw new Error("Invalid input: " + parsed.error.message);
  }

  const data = parsed.data;

  const [created] = await db
    .insert(templates)
    .values({
      name: data.name,
      description: data.description ?? null,
      teamId: data.teamId ?? null,
      createdById: admin.id,
    })
    .returning();

  await db.insert(templateItems).values(
    data.items.map((it, i) => ({
      templateId: created.id,
      position: i + 1,
      label: it.label,
      kind: it.kind,
      required: it.required,
    })),
  );

  revalidatePath("/admin/templates");
  redirect("/admin/templates");
}

export async function listTeams() {
  await requireAdmin();
  return db.select().from(teams).orderBy(teams.name);
}
