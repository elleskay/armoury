import Link from "next/link";
import { desc, eq, isNull } from "drizzle-orm";
import { ClipboardList, Plus } from "lucide-react";

import { db } from "@/db/client";
import { templates, teams, users } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
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

export default async function TemplatesPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: templates.id,
      name: templates.name,
      description: templates.description,
      createdAt: templates.createdAt,
      teamName: teams.name,
      teamAgency: teams.agency,
      createdByName: users.name,
    })
    .from(templates)
    .leftJoin(teams, eq(templates.teamId, teams.id))
    .leftJoin(users, eq(templates.createdById, users.id))
    .where(isNull(templates.archivedAt))
    .orderBy(desc(templates.createdAt));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Checklist templates"
        description="Author equipment checks and assign them to teams."
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
                <TableHead>Team</TableHead>
                <TableHead>Agency</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    {row.description && (
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {row.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.teamName ?? "All teams"}
                  </TableCell>
                  <TableCell>
                    {row.teamAgency ? (
                      <Badge variant="secondary">{row.teamAgency}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.createdByName ?? "n/a"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.createdAt.toISOString().slice(0, 10)}
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
