import { desc, eq } from "drizzle-orm";
import { FileCheck2 } from "lucide-react";

import { db } from "@/db/client";
import { submissions, templates, users } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
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

export default async function SubmissionsPage() {
  await requireAdmin();

  const rows = await db
    .select({
      id: submissions.id,
      submittedAt: submissions.submittedAt,
      score: submissions.score,
      itemCount: submissions.itemCount,
      okCount: submissions.okCount,
      templateName: templates.name,
      officerName: users.name,
    })
    .from(submissions)
    .innerJoin(templates, eq(submissions.templateId, templates.id))
    .innerJoin(users, eq(submissions.officerId, users.id))
    .orderBy(desc(submissions.submittedAt))
    .limit(100);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recent submissions"
        description="All checklist submissions across teams. Score = % of items passing."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={FileCheck2}
          title="No submissions yet"
          description="Submissions from officers will appear here."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Officer</TableHead>
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
                  <TableCell>{row.officerName}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {row.okCount} / {row.itemCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <ScoreBadge score={row.score} />
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

function ScoreBadge({ score }: { score: number }) {
  if (score === 100) {
    return (
      <Badge
        variant="secondary"
        className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      >
        100%
      </Badge>
    );
  }
  if (score >= 80) return <Badge variant="secondary">{score}%</Badge>;
  return <Badge variant="destructive">{score}%</Badge>;
}
