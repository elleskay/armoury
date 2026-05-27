import Link from "next/link";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { CheckCircle2, ChevronRight, ClipboardList, FileCheck2 } from "lucide-react";

import { db } from "@/db/client";
import { templates, teams, submissions, users } from "@/db/schema";
import { requireOfficer } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function OfficerHome() {
  const me = await requireOfficer();

  const myTemplates = await db
    .select({
      id: templates.id,
      name: templates.name,
      description: templates.description,
      teamName: teams.name,
      teamAgency: teams.agency,
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
      <PageHeader
        title="My checklists"
        description="Checklists assigned to your team. Pick one to start."
      />

      {myTemplates.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No checklists assigned"
          description="Your team has no active checklists. Ask your admin to assign one."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {myTemplates.map((t) => (
            <Link key={t.id} href={`/officer/submit/${t.id}`} className="block">
              <Card className="group flex h-full flex-col gap-3 p-5 transition-colors hover:border-primary/50 hover:bg-accent/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
                <div className="space-y-1.5">
                  <div className="font-medium leading-tight">{t.name}</div>
                  {t.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {t.description}
                    </p>
                  )}
                </div>
                <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">
                    {t.teamName ?? "All teams"}
                  </Badge>
                  {t.teamAgency && (
                    <Badge variant="outline" className="text-xs">
                      {t.teamAgency}
                    </Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent submissions</h2>
        {recent.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="Nothing submitted yet"
            description="Once you submit a checklist, it'll show up here."
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">
                      {r.submittedAt.toISOString().replace("T", " ").slice(0, 16)}
                    </TableCell>
                    <TableCell className="font-medium">{r.templateName}</TableCell>
                    <TableCell className="text-right">
                      {r.allOk ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          All OK
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Issues</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}
