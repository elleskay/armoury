import Link from "next/link";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { templates, teams, submissions, users } from "@/db/schema";
import { requireOfficer } from "@/lib/session";

export default async function OfficerHome() {
  const me = await requireOfficer();

  const myTemplates = await db
    .select({
      id: templates.id,
      name: templates.name,
      description: templates.description,
      teamName: teams.name,
    })
    .from(templates)
    .leftJoin(teams, eq(templates.teamId, teams.id))
    .where(
      and(
        isNull(templates.archivedAt),
        or(isNull(templates.teamId), eq(templates.teamId, me.teamId ?? "")),
      ),
    )
    .orderBy(templates.name);

  const recent = await db
    .select({
      id: submissions.id,
      submittedAt: submissions.submittedAt,
      allOk: submissions.allOk,
      templateName: templates.name,
    })
    .from(submissions)
    .innerJoin(templates, eq(submissions.templateId, templates.id))
    .innerJoin(users, eq(submissions.officerId, users.id))
    .where(eq(submissions.officerId, me.id))
    .orderBy(desc(submissions.submittedAt))
    .limit(10);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">My checklists</h1>
        {myTemplates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
            <p className="text-gray-500">No checklists assigned to your team yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {myTemplates.map((t) => (
              <Link
                key={t.id}
                href={`/officer/submit/${t.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-400"
              >
                <div className="font-medium text-gray-900">{t.name}</div>
                {t.description ? (
                  <div className="mt-1 text-sm text-gray-500">{t.description}</div>
                ) : null}
                <div className="mt-3 text-xs text-gray-400">
                  {t.teamName ?? "All teams"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent submissions</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing submitted yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">When</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Template</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {r.submittedAt.toISOString().replace("T", " ").slice(0, 16)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">{r.templateName}</td>
                    <td className="px-4 py-2 text-sm">
                      {r.allOk ? (
                        <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          All OK
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          Issues
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
