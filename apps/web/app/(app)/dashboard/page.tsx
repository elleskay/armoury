import { sql, eq, desc, gte } from "drizzle-orm";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Inbox,
  ShieldCheck,
} from "lucide-react";

import { db } from "@/db/client";
import { submissions, issues, teams, templates, users } from "@/db/schema";
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
      allOk: sql<number>`count(*) filter (where ${submissions.allOk} = true)::int`,
    })
    .from(submissions);

  const recent = await db
    .select({ total: sql<number>`count(*)::int` })
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
    .limit(6);

  const chartRaw = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${submissions.submittedAt}), 'YYYY-MM-DD')`,
      ok: sql<number>`count(*) filter (where ${submissions.allOk} = true)::int`,
      issues: sql<number>`count(*) filter (where ${submissions.allOk} = false)::int`,
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
  const allOk = totals[0]?.allOk ?? 0;
  const complianceRate = total > 0 ? Math.round((allOk / total) * 100) : 0;
  const openIssuesCount = openIssues[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome back, ${user.name}.`}
      />

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
          label="Compliance rate"
          value={`${complianceRate}%`}
          icon={ShieldCheck}
          tone={complianceRate >= 90 ? "success" : complianceRate >= 70 ? "info" : "alert"}
          hint="All-OK submissions"
        />
        <StatCard
          label="Open issues"
          value={openIssuesCount}
          icon={AlertTriangle}
          tone={openIssuesCount > 0 ? "alert" : "success"}
          hint={openIssuesCount > 0 ? "Needs action" : "All clear"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions over time</CardTitle>
          <CardDescription>Daily submissions in the last 14 days.</CardDescription>
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
            <CardTitle>Per team</CardTitle>
            <CardDescription>Submissions and compliance by team.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Agency</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                  <TableHead className="text-right">Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byTeam.map((t) => {
                  const rate =
                    t.submissions > 0 ? Math.round((t.allOk / t.submissions) * 100) : 0;
                  return (
                    <TableRow key={t.teamName}>
                      <TableCell className="font-medium">{t.teamName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{t.agency}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{t.submissions}</TableCell>
                      <TableCell className="text-right">
                        {t.submissions > 0 ? (
                          <Badge
                            variant={rate >= 90 ? "default" : rate >= 70 ? "secondary" : "destructive"}
                          >
                            {rate}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">n/a</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium leading-tight">
                        {issue.templateName}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {issue.note}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {issue.createdAt.toISOString().replace("T", " ").slice(0, 16)}
                      </p>
                    </div>
                  </li>
                ))}
                {recentIssues.length === 0 && (
                  <EmptyState
                    icon={Inbox}
                    title="Nothing to show"
                  />
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
