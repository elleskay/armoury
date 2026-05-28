"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  submissions,
  responses,
  issues,
  templateItems,
  templates,
  teams,
  skippedChecks,
} from "@/db/schema";
import { requireOfficer } from "@/lib/session";
import { computeScore } from "@/lib/score";

async function fireIssueWebhook(
  teamId: string | null | undefined,
  payload: { title: string; note: string; severity: string; raisedBy: string },
): Promise<void> {
  if (!teamId) return;
  const team = (
    await db.select().from(teams).where(eq(teams.id, teamId)).limit(1)
  )[0];
  if (!team?.webhookUrl) return;
  try {
    await fetch(team.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "issue.raised", ...payload }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Best-effort: webhook failures must not break the issue raise.
  }
}

const submitSchema = z.object({ templateId: z.string().uuid() });

export async function submitChecklist(formData: FormData) {
  const officer = await requireOfficer();

  const parsed = submitSchema.safeParse({ templateId: formData.get("templateId") });
  if (!parsed.success) throw new Error("Invalid template id");
  const { templateId } = parsed.data;

  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, templateId))
    .limit(1);
  if (!template) throw new Error("Template not found");

  // Team scoping: officer may only submit templates assigned to their team
  // (or unassigned, cross-team templates). Reject if the officer is on a
  // different team than the template owner.
  if (template.teamId && template.teamId !== officer.teamId) {
    throw new Error("Not authorized for this template");
  }
  if (template.status !== "published" || template.archivedAt) {
    throw new Error("Template is not available for submission");
  }

  const items = await db
    .select()
    .from(templateItems)
    .where(eq(templateItems.templateId, templateId))
    .orderBy(templateItems.position);

  const newResponses: {
    templateItemId: string;
    valueBoolean: boolean | null;
    valueText: string | null;
    valueNumber: number | null;
    valueDate: Date | null;
    hasIssue: boolean;
    issueNote: string | null;
  }[] = [];

  let okCount = 0;

  for (const item of items) {
    const raw = formData.get(`v:${item.id}`);
    const note = formData.get(`note:${item.id}`);
    let valueBoolean: boolean | null = null;
    let valueText: string | null = null;
    let valueNumber: number | null = null;
    let valueDate: Date | null = null;
    let itemOk = true;

    if (item.kind === "boolean") {
      valueBoolean = raw === "yes";
      if (!valueBoolean) itemOk = false;
    } else if (item.kind === "text" || item.kind === "dropdown") {
      valueText = typeof raw === "string" ? raw.trim() : null;
      if (item.required && !valueText) itemOk = false;
    } else if (item.kind === "number") {
      const num = raw ? Number(raw) : NaN;
      if (Number.isFinite(num)) valueNumber = num;
      else if (item.required) itemOk = false;
    } else if (item.kind === "date_time") {
      if (typeof raw === "string" && raw.length > 0) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) valueDate = d;
        else if (item.required) itemOk = false;
      } else if (item.required) {
        itemOk = false;
      }
    }

    const noteStr = typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
    const hasIssue = !itemOk || !!noteStr;

    if (!hasIssue) okCount += 1;

    newResponses.push({
      templateItemId: item.id,
      valueBoolean,
      valueText,
      valueNumber,
      valueDate,
      hasIssue,
      issueNote: noteStr,
    });
  }

  const score = computeScore({ okCount, itemCount: items.length });

  const [submission] = await db
    .insert(submissions)
    .values({
      templateId,
      officerId: officer.id,
      score,
      itemCount: items.length,
      okCount,
    })
    .returning();

  await db.insert(responses).values(
    newResponses.map((r) => ({
      submissionId: submission.id,
      ...r,
    })),
  );

  const issuesToInsert = newResponses
    .filter((r) => r.hasIssue)
    .map((r) => {
      const item = items.find((it) => it.id === r.templateItemId)!;
      return {
        submissionId: submission.id,
        templateItemId: r.templateItemId,
        teamId: template.teamId,
        raisedById: officer.id,
        title: item.label,
        note: r.issueNote ?? `Flagged on ${item.label}`,
        severity: "medium" as const,
      };
    });

  if (issuesToInsert.length > 0) {
    await db.insert(issues).values(issuesToInsert);
  }

  revalidatePath("/officer");
  revalidatePath("/dashboard");
  revalidatePath("/admin/submissions");
  revalidatePath("/admin/issues");
  redirect("/officer");
}

const raiseIssueSchema = z.object({
  title: z.string().min(3).max(200),
  note: z.string().min(3).max(2000),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

export async function raiseStandaloneIssue(formData: FormData) {
  const officer = await requireOfficer();
  const parsed = raiseIssueSchema.safeParse({
    title: formData.get("title"),
    note: formData.get("note"),
    severity: formData.get("severity"),
  });
  if (!parsed.success) throw new Error("Invalid input: " + parsed.error.message);

  await db.insert(issues).values({
    teamId: officer.teamId,
    raisedById: officer.id,
    title: parsed.data.title,
    note: parsed.data.note,
    severity: parsed.data.severity,
  });

  await fireIssueWebhook(officer.teamId, {
    title: parsed.data.title,
    note: parsed.data.note,
    severity: parsed.data.severity,
    raisedBy: officer.name ?? officer.email ?? officer.id,
  });

  revalidatePath("/officer");
  revalidatePath("/admin/issues");
  redirect("/officer");
}

const resolveIssueSchema = z.object({
  issueId: z.string().uuid(),
  resolution: z.string().min(3).max(1000),
});

export async function resolveIssue(formData: FormData) {
  const officer = await requireOfficer();
  const parsed = resolveIssueSchema.safeParse({
    issueId: formData.get("issueId"),
    resolution: formData.get("resolution"),
  });
  if (!parsed.success) throw new Error("Invalid input");

  await db
    .update(issues)
    .set({
      status: "resolved",
      resolvedAt: new Date(),
      resolvedById: officer.id,
      resolution: parsed.data.resolution,
    })
    .where(eq(issues.id, parsed.data.issueId));

  revalidatePath("/admin/issues");
  redirect("/admin/issues");
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const skipSchema = z.object({
  templateId: z.string().uuid(),
  reason: z.string().min(3).max(500),
});

export async function skipCheck(formData: FormData) {
  const officer = await requireOfficer();
  const parsed = skipSchema.safeParse({
    templateId: formData.get("templateId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) throw new Error("Invalid input: " + parsed.error.message);

  await db.insert(skippedChecks).values({
    officerId: officer.id,
    templateId: parsed.data.templateId,
    skippedFor: todayISO(),
    reason: parsed.data.reason,
  });

  revalidatePath("/officer");
  redirect("/officer");
}

const unskipSchema = z.object({ templateId: z.string().uuid() });

export async function unskipCheck(formData: FormData) {
  const officer = await requireOfficer();
  const parsed = unskipSchema.safeParse({
    templateId: formData.get("templateId"),
  });
  if (!parsed.success) throw new Error("Invalid input");

  await db
    .delete(skippedChecks)
    .where(
      and(
        eq(skippedChecks.officerId, officer.id),
        eq(skippedChecks.templateId, parsed.data.templateId),
        eq(skippedChecks.skippedFor, todayISO()),
      ),
    );

  revalidatePath("/officer");
  redirect("/officer");
}
