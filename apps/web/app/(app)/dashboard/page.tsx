import { sql, eq, desc, gte } from "drizzle-orm";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";

import { db } from "@/db/client";
import { submissions, issues, teams, templates } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { SubmissionsChart, type ChartPoint } from "@/components/SubmissionsChart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DashboardPage() {
  const user = await requireUser();

  const since = new Date();
  since.setDate(since.getDate() - 14);

  const totals = await db
    .select({
      total: sql<number>`count(*)::int`,
      avgScore: sql<number>`coalesce(avg(${submissions.score}), 100)::int`,
      perfectCount: sql<number>`count(*) filter (where ${submissions.score} = 100)::int`,
    })
    .from(submissions);

  const recent = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(submissions)
    .where(gte(submissions.submittedAt, since));

  const openIssues = await db
    .select({
      count: sql<number>`count(*)::int`,
      high: sql<number>`count(*) filter (where ${issues.severity} in ('high','critical'))::int`,
    })
    .from(issues)
    .where(eq(issues.status, "open"));

  const byTemplate = await db
    .select({
      templateName: templates.name,
      teamName: teams.name,
      agency: teams.agency,
      submissions: sql<number>`count(${submissions.id})::int`,
      avgScore: sql<number>`coalesce(round(avg(${submissions.score})), 0)::int`,
    })
    .from(templates)
    .leftJoin(teams, eq(templates.teamId, teams.id))
    .leftJoin(submissions, eq(submissions.templateId, templates.id))
    .groupBy(templates.id, templates.name, teams.name, teams.agency)
    .orderBy(desc(sql`count(${submissions.id})`));

  const recentIssues = await db
    .select({
      id: issues.id,
      title: issues.title,
      note: issues.note,
      severity: issues.severity,
      createdAt: issues.createdAt,
    })
    .from(issues)
    .where(eq(issues.status, "open"))
    .orderBy(desc(issues.createdAt))
    .limit(6);

  const chartRaw = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${submissions.submittedAt}), 'YYYY-MM-DD')`,
      ok: sql<number>`count(*) filter (where ${submissions.score} = 100)::int`,
      issues: sql<number>`count(*) filter (where ${submissions.score} < 100)::int`,
    })
    .from(submissions)
    .where(gte(submissions.submittedAt, since))
    .groupBy(sql`date_trunc('day', ${submissions.submittedAt})`)
    .orderBy(sql`date_trunc('day', ${submissions.submittedAt})`);

  const chartData: ChartPoint[] = chartRaw.map((r) => ({
    date: r.day.slice(5),
    ok: r.ok,
    issues: r.issues,
  }));

  const total = totals[0]?.total ?? 0;
  const avgScore = totals[0]?.avgScore ?? 100;
  const openIssuesCount = openIssues[0]?.count ?? 0;
  const highIssuesCount = openIssues[0]?.high ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`Welcome back, ${user.name}.`} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total submissions"
          value={total}
          icon={ClipboardCheck}
          hint="All time"
        />
        <StatCard
          label="Last 14 days"
          value={recent[0]?.total ?? 0}
          icon={Activity}
          hint="Rolling window"
        />
        <StatCard
          label="Average readiness score"
          value={`${avgScore}%`}
          icon={ShieldCheck}
          tone={avgScore >= 90 ? "success" : avgScore >= 70 ? "info" : "alert"}
          hint={`${totals[0]?.perfectCount ?? 0} perfect submissions`}
        />
        <StatCard
          label="Open issues"
          value={openIssuesCount}
          icon={AlertTriangle}
          tone={openIssuesCount > 0 ? "alert" : "success"}
          hint={highIssuesCount > 0 ? `${highIssuesCount} high/critical` : "All clear"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions over time</CardTitle>
          <CardDescription>
            Last 14 days. Perfect runs in green, runs with issues in orange.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No submissions yet"
              description="Once officers start submitting checklists, the trend will appear here."
            />
          ) : (
            <SubmissionsChart data={chartData} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Per template</CardTitle>
            <CardDescription>
              Average readiness score across all submissions. &lt;80% needs attention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                  <TableHead className="text-right">Avg score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byTemplate.map((t) => (
                  <TableRow key={t.templateName}>
                    <TableCell className="font-medium">{t.templateName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{t.agency ?? "n/a"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{t.submissions}</TableCell>
                    <TableCell className="text-right">
                      {t.submissions > 0 ? (
                        <Badge
                          variant={
                            t.avgScore >= 90
                              ? "default"
                              : t.avgScore >= 80
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {t.avgScore}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">n/a</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open issues</CardTitle>
            <CardDescription>Most recent first.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentIssues.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No open issues"
                description="All flagged items have been resolved."
              />
            ) : (
              <ul className="space-y-3">
                {recentIssues.map((issue) => (
                  <li key={issue.id} className="flex gap-3">
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        issue.severity === "critical" || issue.severity === "high"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium leading-tight">{issue.title}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{issue.note}</p>
                      <p className="text-xs text-muted-foreground">
                        {issue.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
