import { NextResponse } from "next/server";
import { and, eq, gte, lt, desc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  submissions,
  responses,
  templateItems,
  templates,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/session";

interface ExportItem {
  id: string;
  position: number;
  label: string;
  kind: string;
}

interface ExportResponse {
  itemId: string;
  valueBoolean: boolean | null;
  valueText: string | null;
  valueNumber: number | null;
  valueDate: string | null;
  hasIssue: boolean;
  issueNote: string | null;
}

interface ExportSubmission {
  id: string;
  submittedAt: string;
  officer: string;
  template: string;
  score: number;
  okCount: number;
  itemCount: number;
  items: ExportItem[];
  responses: ExportResponse[];
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  await requireAdmin();
  const { year, month } = await params;
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  if (Number.isNaN(y) || Number.isNaN(m) || m < 1 || m > 12) {
    return NextResponse.json({ error: "invalid year/month" }, { status: 400 });
  }

  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1));

  const rows = await db
    .select({
      id: submissions.id,
      submittedAt: submissions.submittedAt,
      score: submissions.score,
      okCount: submissions.okCount,
      itemCount: submissions.itemCount,
      templateId: submissions.templateId,
      officerName: users.name,
      templateName: templates.name,
    })
    .from(submissions)
    .innerJoin(users, eq(submissions.officerId, users.id))
    .innerJoin(templates, eq(submissions.templateId, templates.id))
    .where(
      and(
        gte(submissions.submittedAt, start),
        lt(submissions.submittedAt, end),
      ),
    )
    .orderBy(desc(submissions.submittedAt))
    .limit(5000);

  const result: ExportSubmission[] = [];
  for (const row of rows) {
    const items = await db
      .select({
        id: templateItems.id,
        position: templateItems.position,
        label: templateItems.label,
        kind: templateItems.kind,
      })
      .from(templateItems)
      .where(eq(templateItems.templateId, row.templateId))
      .orderBy(templateItems.position);
    const responseRows = await db
      .select()
      .from(responses)
      .where(eq(responses.submissionId, row.id));

    result.push({
      id: row.id,
      submittedAt: row.submittedAt.toISOString(),
      officer: row.officerName,
      template: row.templateName,
      score: row.score,
      okCount: row.okCount,
      itemCount: row.itemCount,
      items,
      responses: responseRows.map((r) => ({
        itemId: r.templateItemId,
        valueBoolean: r.valueBoolean,
        valueText: r.valueText,
        valueNumber: r.valueNumber,
        valueDate: r.valueDate ? r.valueDate.toISOString() : null,
        hasIssue: r.hasIssue,
        issueNote: r.issueNote,
      })),
    });
  }

  const filename = `armoury-export-${year}-${month.padStart(2, "0")}.json`;
  return new NextResponse(
    JSON.stringify({ month: `${y}-${String(m).padStart(2, "0")}`, count: result.length, submissions: result }, null, 2),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    },
  );
}
