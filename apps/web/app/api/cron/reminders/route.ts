import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { templates, users, teams } from "@/db/schema";
import { sendEmail } from "@/lib/email";

const FROM = process.env.EMAIL_FROM ?? "Armoury <noreply@armoury.test>";

/**
 * Cron endpoint for scheduled-check email reminders.
 *
 * For each published, non-archived, non-paused template with a
 * scheduled frequency (not "open"), sends a reminder email to each
 * admin on the template's team. Gated on RESEND_API_KEY: without it,
 * sendEmail no-ops and the route reports skipped=true.
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
      teamName: teams.name,
    })
    .from(templates)
    .leftJoin(teams, eq(templates.teamId, teams.id))
    .where(
      and(
        eq(templates.status, "published"),
        isNull(templates.archivedAt),
        isNull(templates.schedulePausedAt),
      ),
    );

  const reminders = scheduledTemplates.filter((t) => t.frequency !== "open");

  let sent = 0;
  let attempted = 0;
  const errors: string[] = [];

  if (process.env.RESEND_API_KEY) {
    for (const tmpl of reminders) {
      const adminEmails = (
        await db
          .select({ email: users.email })
          .from(users)
          .where(
            and(
              eq(users.role, "admin"),
              tmpl.teamId
                ? eq(users.teamId, tmpl.teamId)
                : isNull(users.teamId),
            ),
          )
      ).map((r) => r.email);

      for (const email of adminEmails) {
        attempted += 1;
        try {
          await sendEmail({
            to: email,
            from: FROM,
            subject: `Reminder: ${tmpl.name} due soon`,
            text: [
              `Template: ${tmpl.name}`,
              `Frequency: ${tmpl.frequency}`,
              tmpl.teamName ? `Team: ${tmpl.teamName}` : "Team: All",
              "",
              "Please submit before the deadline.",
            ].join("\n"),
          });
          sent += 1;
        } catch (err) {
          errors.push((err as Error).message);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    scheduledTemplateCount: scheduledTemplates.length,
    wouldRemind: reminders.length,
    skipped: !process.env.RESEND_API_KEY,
    attempted,
    sent,
    errors,
  });
}
