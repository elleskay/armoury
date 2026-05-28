import Link from "next/link";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileCheck2,
  Megaphone,
  Sun,
  Sunset,
  Moon,
} from "lucide-react";

import { db } from "@/db/client";
import { templates, teams, submissions, users, skippedChecks } from "@/db/schema";
import { requireOfficer } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
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

export const dynamic = "force-dynamic";

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  twice_daily: "Twice daily",
  weekly: "Weekly",
  open: "Open",
};

const shiftMeta: Record<string, { label: string; icon: typeof Sun }> = {
  am: { label: "AM shift", icon: Sun },
  pm: { label: "PM shift", icon: Sunset },
  night: { label: "Night shift", icon: Moon },
  any: { label: "Any shift", icon: Clock },
};

export default async function OfficerHome() {
  const me = await requireOfficer();

  const myTemplates = await db
    .select({
      id: templates.id,
      name: templates.name,
      description: templates.description,
      frequency: templates.frequency,
      shiftWindow: templates.shiftWindow,
      status: templates.status,
      teamName: teams.name,
      teamAgency: teams.agency,
    })
    .from(templates)
    .leftJoin(teams, eq(templates.teamId, teams.id))
    .where(
      and(
        eq(templates.status, "published"),
        isNull(templates.archivedAt),
        isNull(templates.schedulePausedAt),
        or(isNull(templates.teamId), eq(templates.teamId, me.teamId ?? "")),
      ),
    )
    .orderBy(templates.name);

  const today = new Date().toISOString().slice(0, 10);
  const skippedToday = new Set(
    (
      await db
        .select({ templateId: skippedChecks.templateId })
        .from(skippedChecks)
        .where(
          and(
            eq(skippedChecks.officerId, me.id),
            eq(skippedChecks.skippedFor, today),
          ),
        )
    ).map((r) => r.templateId),
  );

  const recent = await db
    .select({
      id: submissions.id,
      submittedAt: submissions.submittedAt,
      score: submissions.score,
      itemCount: submissions.itemCount,
      okCount: submissions.okCount,
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
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="My checklists"
          description="Checklists assigned to your team. Pick one to start."
        />
        <Button asChild variant="outline" size="sm">
          <Link href="/officer/raise-issue">
            <Megaphone className="mr-2 h-4 w-4" />
            Raise issue
          </Link>
        </Button>
      </div>

      {myTemplates.filter((t) => !skippedToday.has(t.id)).length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No checklists assigned"
          description="Your team has no active checklists. Ask your admin to assign one."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {myTemplates.filter((t) => !skippedToday.has(t.id)).map((t) => {
            const shift = shiftMeta[t.shiftWindow] ?? shiftMeta.any;
            const ShiftIcon = shift.icon;
            return (
              <Card
                key={t.id}
                className="group flex h-full flex-col gap-3 p-5 transition-colors hover:border-primary/50"
              >
                <Link
                  href={`/officer/submit/${t.id}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
                <Link href={`/officer/submit/${t.id}`} className="space-y-1.5">
                  <div className="font-medium leading-tight">{t.name}</div>
                  {t.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {t.description}
                    </p>
                  )}
                </Link>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Clock className="h-3 w-3" />
                      {frequencyLabels[t.frequency] ?? t.frequency}
                    </Badge>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <ShiftIcon className="h-3 w-3" />
                      {shift.label}
                    </Badge>
                    {t.teamAgency && (
                      <Badge variant="outline" className="text-xs">
                        {t.teamAgency}
                      </Badge>
                    )}
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/officer/skip/${t.id}`}>Skip</Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {myTemplates.filter((t) => skippedToday.has(t.id)).length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Skipped today</h2>
          <Card className="p-4">
            <ul className="space-y-2">
              {myTemplates.filter((t) => skippedToday.has(t.id)).map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span>{t.name}</span>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/officer/skip/${t.id}?action=unskip`}>
                      Unskip
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
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
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">
                      {r.submittedAt.toISOString().replace("T", " ").slice(0, 16)}
                    </TableCell>
                    <TableCell className="font-medium">{r.templateName}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {r.okCount} / {r.itemCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.score === 100 ? (
                        <Badge
                          variant="secondary"
                          className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          100%
                        </Badge>
                      ) : r.score >= 80 ? (
                        <Badge variant="secondary">{r.score}%</Badge>
                      ) : (
                        <Badge variant="destructive">{r.score}%</Badge>
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
