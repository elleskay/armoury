"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { submissions, responses, issues, templateItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOfficer } from "@/lib/session";

const submitSchema = z.object({
  templateId: z.string().uuid(),
});

export async function submitChecklist(formData: FormData) {
  const officer = await requireOfficer();

  const parsed = submitSchema.safeParse({
    templateId: formData.get("templateId"),
  });
  if (!parsed.success) throw new Error("Invalid template id");
  const { templateId } = parsed.data;

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
    hasIssue: boolean;
    issueNote: string | null;
  }[] = [];

  let allOk = true;

  for (const item of items) {
    const raw = formData.get(`v:${item.id}`);
    const note = formData.get(`note:${item.id}`);
    let valueBoolean: boolean | null = null;
    let valueText: string | null = null;
    let valueNumber: number | null = null;
    let hasIssue = false;

    if (item.kind === "boolean") {
      valueBoolean = raw === "yes";
      if (!valueBoolean) {
        hasIssue = true;
        allOk = false;
      }
    } else if (item.kind === "text") {
      valueText = typeof raw === "string" ? raw.trim() : null;
      if (item.required && !valueText) {
        hasIssue = true;
        allOk = false;
      }
    } else if (item.kind === "number") {
      const num = raw ? Number(raw) : NaN;
      if (Number.isFinite(num)) valueNumber = num;
      else if (item.required) {
        hasIssue = true;
        allOk = false;
      }
    }

    const noteStr = typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
    if (noteStr) {
      hasIssue = true;
      allOk = false;
    }

    newResponses.push({
      templateItemId: item.id,
      valueBoolean,
      valueText,
      valueNumber,
      hasIssue,
      issueNote: noteStr,
    });
  }

  const [submission] = await db
    .insert(submissions)
    .values({
      templateId,
      officerId: officer.id,
      allOk,
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
    .map((r) => ({
      submissionId: submission.id,
      templateItemId: r.templateItemId,
      note: r.issueNote ?? "Item flagged",
    }));

  if (issuesToInsert.length > 0) {
    await db.insert(issues).values(issuesToInsert);
  }

  revalidatePath("/officer");
  revalidatePath("/dashboard");
  revalidatePath("/admin/submissions");
  redirect("/officer");
}
