import { desc, eq } from "drizzle-orm";
import { History } from "lucide-react";

import { db } from "@/db/client";
import { submissions, templates } from "@/db/schema";
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

export const dynamic = "force-dynamic";

export default async function PastChecksPage() {
  const officer = await requireOfficer();

  const rows = await db
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
    .where(eq(submissions.officerId, officer.id))
    .orderBy(desc(submissions.submittedAt))
    .limit(500);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Past checks"
        description="Every checklist you have submitted."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={History}
          title="No submissions yet"
          description="Submitted checklists will appear here."
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
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">
                    {row.submittedAt.toISOString().replace("T", " ").slice(0, 16)}
                  </TableCell>
                  <TableCell className="font-medium">{row.templateName}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.okCount} / {row.itemCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        row.score >= 90
                          ? "default"
                          : row.score >= 80
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {row.score}%
                    </Badge>
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
