import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { CheckCircle2, XCircle } from "lucide-react";

import { db } from "@/db/client";
import { submissions, responses, templates, users, teams } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [submission] = await db
    .select({
      id: submissions.id,
      submittedAt: submissions.submittedAt,
      score: submissions.score,
      itemCount: submissions.itemCount,
      okCount: submissions.okCount,
      officerName: users.name,
      templateName: templates.name,
      templateDescription: templates.description,
      templateFrequency: templates.frequency,
      templateShiftWindow: templates.shiftWindow,
      teamName: teams.name,
    })
    .from(submissions)
    .innerJoin(templates, eq(submissions.templateId, templates.id))
    .innerJoin(users, eq(submissions.officerId, users.id))
    .leftJoin(teams, eq(templates.teamId, teams.id))
    .where(eq(submissions.id, id))
    .limit(1);

  if (!submission) notFound();

  const responseRows = await db
    .select()
    .from(responses)
    .where(eq(responses.submissionId, id))
    .orderBy(asc(responses.id));

  return (
    <div className="space-y-4">
      <PageHeader
        title={submission.templateName}
        description={`Submitted by ${submission.officerName} on ${submission.submittedAt.toISOString().replace("T", " ").slice(0, 16)}`}
      />

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>
        <TabsContent value="status">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">
                    {submission.okCount} of {submission.itemCount} items OK
                  </div>
                </div>
                <Badge
                  variant={
                    submission.score >= 90
                      ? "default"
                      : submission.score >= 80
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-lg"
                >
                  {submission.score}%
                </Badge>
              </div>
              <ul className="space-y-2">
                {responseRows.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 text-sm">
                    {r.hasIssue ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">
                        {r.itemLabelSnapshot ?? "(question)"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Type: {r.itemKindSnapshot ?? "unknown"}
                      </div>
                      {r.issueNote && (
                        <div className="mt-1 rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                          {r.issueNote}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="about">
          <Card>
            <CardContent className="space-y-3 p-6 text-sm">
              <div>
                <span className="text-muted-foreground">Template:</span>{" "}
                {submission.templateName}
              </div>
              {submission.templateDescription && (
                <div>
                  <span className="text-muted-foreground">Description:</span>{" "}
                  {submission.templateDescription}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Frequency:</span>{" "}
                {submission.templateFrequency}
              </div>
              <div>
                <span className="text-muted-foreground">Shift:</span>{" "}
                {submission.templateShiftWindow}
              </div>
              {submission.teamName && (
                <div>
                  <span className="text-muted-foreground">Team:</span>{" "}
                  {submission.teamName}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Officer:</span>{" "}
                {submission.officerName}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
