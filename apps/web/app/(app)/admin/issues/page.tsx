import { desc, eq } from "drizzle-orm";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { db } from "@/db/client";
import { issues, teams, users } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { resolveIssue } from "../../officer/actions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function IssuesPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: issues.id,
      title: issues.title,
      note: issues.note,
      severity: issues.severity,
      status: issues.status,
      createdAt: issues.createdAt,
      resolvedAt: issues.resolvedAt,
      resolution: issues.resolution,
      teamName: teams.name,
      raisedByName: users.name,
    })
    .from(issues)
    .leftJoin(teams, eq(issues.teamId, teams.id))
    .leftJoin(users, eq(issues.raisedById, users.id))
    .orderBy(desc(issues.createdAt))
    .limit(100);

  const open = rows.filter((r) => r.status !== "resolved");
  const resolved = rows.filter((r) => r.status === "resolved");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issues"
        description="Flagged items from checks plus standalone reports from officers."
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Open ({open.length})
        </h2>
        {open.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No open issues"
            description="Everything is resolved."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {open.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Resolved (last {resolved.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {resolved.slice(0, 10).map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function IssueCard({
  issue,
}: {
  issue: {
    id: string;
    title: string;
    note: string;
    severity: "low" | "medium" | "high" | "critical";
    status: "open" | "in_progress" | "resolved";
    createdAt: Date;
    resolvedAt: Date | null;
    resolution: string | null;
    teamName: string | null;
    raisedByName: string | null;
  };
}) {
  const sevColor: Record<string, string> = {
    low: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
    critical: "bg-destructive/15 text-destructive",
  };
  const isResolved = issue.status === "resolved";

  return (
    <Card className={isResolved ? "opacity-70" : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                isResolved
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {isResolved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold leading-tight">
                {issue.title}
              </CardTitle>
              <CardDescription className="text-xs">
                {issue.teamName ?? "Unassigned"} · {issue.raisedByName ?? "anonymous"} ·{" "}
                {issue.createdAt.toISOString().slice(0, 10)}
              </CardDescription>
            </div>
          </div>
          <Badge className={sevColor[issue.severity]} variant="secondary">
            {issue.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{issue.note}</p>
        {isResolved ? (
          <div className="rounded-md border bg-emerald-50/50 p-3 text-xs dark:bg-emerald-950/30">
            <span className="font-medium">Resolution:</span> {issue.resolution ?? "(none)"}
            {issue.resolvedAt && (
              <span className="ml-2 text-muted-foreground">
                ({issue.resolvedAt.toISOString().slice(0, 10)})
              </span>
            )}
          </div>
        ) : (
          <form action={resolveIssue} className="flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="issueId" value={issue.id} />
            <Input
              name="resolution"
              type="text"
              required
              minLength={3}
              maxLength={1000}
              placeholder="Resolution note"
              className="text-xs"
            />
            <Button type="submit" size="sm" variant="default">
              Resolve
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
