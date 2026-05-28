import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { templates, users } from "@/db/schema";

/**
 * Cron endpoint for scheduled-check email reminders.
 *
 * Real implementation would compute next deadline per template
 * (daily, twice_daily, weekly) and send email if ~2 hours out.
 * For now: returns the templates that WOULD be reminded.
 *
 * In production this is invoked by Vercel Cron with a secret header.
 * In CI/test the endpoint is open.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const scheduledTemplates = await db
    .select({
      id: templates.id,
      name: templates.name,
      frequency: templates.frequency,
      teamId: templates.teamId,
    })
    .from(templates)
    .where(
      and(
        eq(templates.status, "published"),
        isNull(templates.archivedAt),
        isNull(templates.schedulePausedAt),
      ),
    );

  // Stub: we'd dispatch via Resend here.
  // For test verification: report the set of would-be reminders.
  const adminCount = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    scheduledTemplateCount: scheduledTemplates.length,
    adminRecipientCount: adminCount.length,
    wouldRemind: scheduledTemplates.filter(
      (t) => t.frequency !== "open",
    ).length,
  });
}
