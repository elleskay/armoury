import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import {
  Archive,
  ArchiveRestore,
  ClipboardList,
  Clock,
  Pause,
  Pencil,
  Play,
  Plus,
} from "lucide-react";

import { db } from "@/db/client";
import { templates, teams, users } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import {
  archiveTemplate,
  pauseTemplate,
  resumeTemplate,
  unarchiveTemplate,
} from "./actions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

const shiftLabels: Record<string, string> = {
  am: "AM",
  pm: "PM",
  night: "Night",
  any: "Any",
};

export default async function TemplatesPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: templates.id,
      name: templates.name,
      description: templates.description,
      status: templates.status,
      frequency: templates.frequency,
      shiftWindow: templates.shiftWindow,
      createdAt: templates.createdAt,
      archivedAt: templates.archivedAt,
      schedulePausedAt: templates.schedulePausedAt,
      teamName: teams.name,
      teamAgency: teams.agency,
      createdByName: users.name,
    })
    .from(templates)
    .leftJoin(teams, eq(templates.teamId, teams.id))
    .leftJoin(users, eq(templates.createdById, users.id))
    .orderBy(desc(templates.createdAt));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Checklist templates"
        description="Author equipment checks and assign them to teams. Drafts are not visible to officers."
        actions={
          <Button asChild>
            <Link href="/admin/templates/new">
              <Plus className="mr-2 h-4 w-4" />
              New template
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No templates yet"
          description="Create your first checklist template to deploy it to a team."
          action={
            <Button asChild>
              <Link href="/admin/templates/new">
                <Plus className="mr-2 h-4 w-4" />
                Create template
              </Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className={row.archivedAt ? "opacity-60" : undefined}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    {row.description && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {row.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.archivedAt ? (
                      <Badge variant="outline">Archived</Badge>
                    ) : row.schedulePausedAt ? (
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Paused
                      </Badge>
                    ) : row.status === "published" ? (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {frequencyLabels[row.frequency] ?? row.frequency}
                      </Badge>
                      <Badge variant="outline">{shiftLabels[row.shiftWindow] ?? row.shiftWindow}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.teamName ?? "All teams"}
                    {row.teamAgency && (
                      <span className="ml-1.5">
                        <Badge variant="outline" className="text-xs">{row.teamAgency}</Badge>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.createdAt.toISOString().slice(0, 10)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!row.archivedAt && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          aria-label={`Edit ${row.name}`}
                        >
                          <Link href={`/admin/templates/${row.id}/edit`}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Link>
                        </Button>
                      )}
                      {!row.archivedAt && (
                        row.schedulePausedAt ? (
                          <form action={resumeTemplate}>
                            <input type="hidden" name="templateId" value={row.id} />
                            <Button
                              type="submit"
                              variant="outline"
                              size="sm"
                              aria-label={`Resume ${row.name}`}
                            >
                              <Play className="mr-1 h-3.5 w-3.5" />
                              Resume
                            </Button>
                          </form>
                        ) : (
                          <form action={pauseTemplate}>
                            <input type="hidden" name="templateId" value={row.id} />
                            <Button
                              type="submit"
                              variant="outline"
                              size="sm"
                              aria-label={`Pause ${row.name}`}
                            >
                              <Pause className="mr-1 h-3.5 w-3.5" />
                              Pause
                            </Button>
                          </form>
                        )
                      )}
                    {row.archivedAt ? (
                      <form action={unarchiveTemplate}>
                        <input type="hidden" name="templateId" value={row.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          aria-label={`Unarchive ${row.name}`}
                        >
                          <ArchiveRestore className="mr-1 h-3.5 w-3.5" />
                          Unarchive
                        </Button>
                      </form>
                    ) : (
                      <form action={archiveTemplate}>
                        <input type="hidden" name="templateId" value={row.id} />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          aria-label={`Archive ${row.name}`}
                        >
                          <Archive className="mr-1 h-3.5 w-3.5" />
                          Archive
                        </Button>
                      </form>
                    )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
