import { NextResponse } from "next/server";
import { and, eq, gte, lt, desc } from "drizzle-orm";
import JSZip from "jszip";
import { db } from "@/db/client";
import {
  submissions,
  responses,
  templateItems,
  templates,
  users,
} from "@/db/schema";
import { requireAdmin } from "@/lib/session";

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

  const zip = new JSZip();
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        month: `${y}-${String(m).padStart(2, "0")}`,
        count: rows.length,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

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

    const payload = {
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
        itemLabelSnapshot: r.itemLabelSnapshot,
        itemKindSnapshot: r.itemKindSnapshot,
        valueBoolean: r.valueBoolean,
        valueText: r.valueText,
        valueNumber: r.valueNumber,
        valueDate: r.valueDate ? r.valueDate.toISOString() : null,
        hasIssue: r.hasIssue,
        issueNote: r.issueNote,
      })),
    };
    const fileName = `${row.submittedAt.toISOString().replace(/[:.]/g, "-")}__${row.templateName.replace(/[^a-z0-9-]+/gi, "_")}__${row.id.slice(0, 8)}.json`;
    zip.file(fileName, JSON.stringify(payload, null, 2));
  }

  const buffer = await zip.generateAsync({ type: "uint8array" });
  const filename = `armoury-export-${y}-${String(m).padStart(2, "0")}.zip`;
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(buffer.length),
    },
  });
}
