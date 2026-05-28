"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { templates, templateItems, teams, auditLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

async function recordAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      actorId,
      action,
      targetType,
      targetId,
      payload: payload ?? null,
    });
  } catch {
    // Best-effort: audit must not block the action.
  }
}

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
  const teamIdNormalized =
    teamIdRaw && teamIdRaw !== "" && teamIdRaw !== "__all__"
      ? teamIdRaw
      : undefined;
  const parsed = createTemplateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    teamId: teamIdNormalized,
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

  await recordAudit(admin.id, "template.create", "template", created.id, {
    name: data.name,
    status: data.status,
    frequency: data.frequency,
    shiftWindow: data.shiftWindow,
    itemCount: data.items.length,
  });

  revalidatePath("/admin/templates");
  redirect("/admin/templates");
}

export async function listTeams() {
  await requireAdmin();
  return db.select().from(teams).orderBy(teams.name);
}

const templateIdSchema = z.object({ templateId: z.string().uuid() });

export async function archiveTemplate(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = templateIdSchema.safeParse({
    templateId: formData.get("templateId"),
  });
  if (!parsed.success) throw new Error("Invalid template id");

  await db
    .update(templates)
    .set({ archivedAt: new Date() })
    .where(eq(templates.id, parsed.data.templateId));

  await recordAudit(admin.id, "template.archive", "template", parsed.data.templateId);

  revalidatePath("/admin/templates");
  revalidatePath("/officer");
}

const updateTemplateSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  teamId: z.string().uuid().optional(),
  status: z.enum(["draft", "published"]),
  frequency: z.enum(["daily", "twice_daily", "weekly", "open"]),
  shiftWindow: z.enum(["am", "pm", "night", "any"]),
});

export async function updateTemplate(formData: FormData) {
  const admin = await requireAdmin();

  const teamIdRaw = formData.get("teamId");
  const teamIdNormalized =
    teamIdRaw && teamIdRaw !== "" && teamIdRaw !== "__all__"
      ? teamIdRaw
      : undefined;

  const parsed = updateTemplateSchema.safeParse({
    templateId: formData.get("templateId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    teamId: teamIdNormalized,
    status: formData.get("status") ?? "published",
    frequency: formData.get("frequency") ?? "open",
    shiftWindow: formData.get("shiftWindow") ?? "any",
  });

  if (!parsed.success) {
    throw new Error("Invalid input: " + parsed.error.message);
  }
  const data = parsed.data;

  const [before] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, data.templateId))
    .limit(1);

  await db
    .update(templates)
    .set({
      name: data.name,
      description: data.description ?? null,
      teamId: data.teamId ?? null,
      status: data.status,
      frequency: data.frequency,
      shiftWindow: data.shiftWindow,
      updatedAt: new Date(),
    })
    .where(eq(templates.id, data.templateId));

  await recordAudit(admin.id, "template.update", "template", data.templateId, {
    before: before
      ? {
          name: before.name,
          description: before.description,
          teamId: before.teamId,
          status: before.status,
          frequency: before.frequency,
          shiftWindow: before.shiftWindow,
        }
      : null,
    after: {
      name: data.name,
      description: data.description ?? null,
      teamId: data.teamId ?? null,
      status: data.status,
      frequency: data.frequency,
      shiftWindow: data.shiftWindow,
    },
  });

  revalidatePath("/admin/templates");
  revalidatePath("/officer");
  redirect("/admin/templates");
}

export async function pauseTemplate(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = templateIdSchema.safeParse({
    templateId: formData.get("templateId"),
  });
  if (!parsed.success) throw new Error("Invalid template id");

  await db
    .update(templates)
    .set({ schedulePausedAt: new Date() })
    .where(eq(templates.id, parsed.data.templateId));

  await recordAudit(admin.id, "template.pause", "template", parsed.data.templateId);

  revalidatePath("/admin/templates");
  revalidatePath("/officer");
}

export async function resumeTemplate(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = templateIdSchema.safeParse({
    templateId: formData.get("templateId"),
  });
  if (!parsed.success) throw new Error("Invalid template id");

  await db
    .update(templates)
    .set({ schedulePausedAt: null })
    .where(eq(templates.id, parsed.data.templateId));

  await recordAudit(admin.id, "template.resume", "template", parsed.data.templateId);

  revalidatePath("/admin/templates");
  revalidatePath("/officer");
}

export async function unarchiveTemplate(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = templateIdSchema.safeParse({
    templateId: formData.get("templateId"),
  });
  if (!parsed.success) throw new Error("Invalid template id");

  await db
    .update(templates)
    .set({ archivedAt: null })
    .where(eq(templates.id, parsed.data.templateId));

  await recordAudit(admin.id, "template.unarchive", "template", parsed.data.templateId);

  revalidatePath("/admin/templates");
  revalidatePath("/officer");
}
