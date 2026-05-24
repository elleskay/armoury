import { sql, eq, desc, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { submissions, issues, teams, templates, users } from "@/db/schema";
import { requireUser } from "@/lib/session";

export default async function DashboardPage() {
  const user = await requireUser();

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const totals = await db
    .select({
      total: sql<number>`count(*)::int`,
      allOk: sql<number>`count(*) filter (where ${submissions.allOk} = true)::int`,
    })
    .from(submissions);

  const recent = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(submissions)
    .where(gte(submissions.submittedAt, since));

  const openIssues = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(issues)
    .where(eq(issues.status, "open"));

  const byTeam = await db
    .select({
      teamName: teams.name,
      agency: teams.agency,
      submissions: sql<number>`count(${submissions.id})::int`,
      allOk: sql<number>`count(*) filter (where ${submissions.allOk} = true)::int`,
    })
    .from(teams)
    .leftJoin(users, eq(users.teamId, teams.id))
    .leftJoin(submissions, eq(submissions.officerId, users.id))
    .groupBy(teams.id, teams.name, teams.agency)
    .orderBy(teams.name);

  const recentIssues = await db
    .select({
      id: issues.id,
      note: issues.note,
      createdAt: issues.createdAt,
      templateName: templates.name,
    })
    .from(issues)
    .innerJoin(submissions, eq(issues.submissionId, submissions.id))
    .innerJoin(templates, eq(submissions.templateId, templates.id))
    .where(eq(issues.status, "open"))
    .orderBy(desc(issues.createdAt))
    .limit(8);

  const total = totals[0]?.total ?? 0;
  const allOk = totals[0]?.allOk ?? 0;
  const complianceRate = total > 0 ? Math.round((allOk / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Welcome back, {user.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total submissions" value={total.toString()} />
        <StatCard label="Last 7 days" value={(recent[0]?.total ?? 0).toString()} />
        <StatCard label="Compliance rate" value={`${complianceRate}%`} />
        <StatCard
          label="Open issues"
          value={(openIssues[0]?.count ?? 0).toString()}
          tone={openIssues[0]?.count ? "alert" : "default"}
        />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Per team</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Team</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Agency</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Submissions</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {byTeam.map((t) => {
                const rate = t.submissions > 0 ? Math.round((t.allOk / t.submissions) * 100) : 0;
                return (
                  <tr key={t.teamName}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{t.teamName}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{t.agency}</td>
                    <td className="px-4 py-2 text-right text-sm text-gray-700">{t.submissions}</td>
                    <td className="px-4 py-2 text-right text-sm text-gray-700">
                      {t.submissions > 0 ? `${rate}%` : "n/a"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Open issues</h2>
        {recentIssues.length === 0 ? (
          <p className="text-sm text-gray-500">No open issues.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {recentIssues.map((issue) => (
              <li key={issue.id} className="px-4 py-3">
                <div className="text-sm font-medium text-gray-900">{issue.templateName}</div>
                <div className="mt-1 text-sm text-gray-700">{issue.note}</div>
                <div className="mt-1 text-xs text-gray-400">
                  {issue.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "alert";
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</div>
      <div
        className={`mt-2 text-3xl font-semibold ${
          tone === "alert" ? "text-red-600" : "text-gray-900"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
