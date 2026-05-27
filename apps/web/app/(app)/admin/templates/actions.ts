"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { templates, templateItems, teams } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

const itemKindEnum = z.enum(["boolean", "text", "number", "dropdown", "date_time"]);

const createTemplateSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  teamId: z.string().uuid().optional(),
  status: z.enum(["draft", "published"]).default("published"),
  frequency: z.enum(["daily", "twice_daily", "weekly", "open"]).default("open"),
  shiftWindow: z.enum(["am", "pm", "night", "any"]).default("any"),
  items: z
    .array(
      z.object({
        label: z.string().min(1).max(300),
        kind: itemKindEnum,
        required: z.boolean().default(true),
        options: z.array(z.string()).optional(),
      }),
    )
    .min(1),
});

export async function createTemplate(formData: FormData) {
  const admin = await requireAdmin();

  const labels = formData.getAll("itemLabel").map(String);
  const kinds = formData.getAll("itemKind").map(String);
  const optionsRaw = formData.getAll("itemOptions").map(String);

  const items = labels
    .map((label, i) => {
      const trimmed = label.trim();
      if (!trimmed) return null;
      const kindStr = kinds[i] ?? "boolean";
      const kindParse = itemKindEnum.safeParse(kindStr);
      const kind = kindParse.success ? kindParse.data : "boolean";
      const options =
        kind === "dropdown" && optionsRaw[i]
          ? optionsRaw[i].split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;
      return {
        label: trimmed,
        kind,
        required: true,
        options,
      };
    })
    .filter((it): it is NonNullable<typeof it> => it !== null);

  const teamIdRaw = formData.get("teamId");
  const parsed = createTemplateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    teamId: teamIdRaw && teamIdRaw !== "" ? teamIdRaw : undefined,
    status: formData.get("status") ?? "published",
    frequency: formData.get("frequency") ?? "open",
    shiftWindow: formData.get("shiftWindow") ?? "any",
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
      status: data.status,
      frequency: data.frequency,
      shiftWindow: data.shiftWindow,
    })
    .returning();

  await db.insert(templateItems).values(
    data.items.map((it, i) => ({
      templateId: created.id,
      position: i + 1,
      label: it.label,
      kind: it.kind,
      required: it.required,
      options: it.options ?? null,
    })),
  );

  revalidatePath("/admin/templates");
  redirect("/admin/templates");
}

export async function listTeams() {
  await requireAdmin();
  return db.select().from(teams).orderBy(teams.name);
}
