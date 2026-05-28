import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { templates } from "@/db/schema";
import { requireOfficer } from "@/lib/session";
import { skipCheck, unskipCheck } from "../../actions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function SkipCheckPage({
  params,
  searchParams,
}: {
  params: Promise<{ templateId: string }>;
  searchParams: Promise<{ action?: string }>;
}) {
  await requireOfficer();
  const { templateId } = await params;
  const { action } = await searchParams;
  const isUnskip = action === "unskip";

  const template = (
    await db.select().from(templates).where(eq(templates.id, templateId)).limit(1)
  )[0];
  if (!template) notFound();

  if (isUnskip) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <PageHeader
          title={`Unskip ${template.name}?`}
          description="Restore this check to your list for today."
        />
        <form action={unskipCheck}>
          <input type="hidden" name="templateId" value={template.id} />
          <Card>
            <CardContent className="flex items-center justify-end gap-3 p-6">
              <Button variant="outline" asChild>
                <Link href="/officer">Cancel</Link>
              </Button>
              <Button type="submit">Unskip</Button>
            </CardContent>
          </Card>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <PageHeader
        title={`Skip ${template.name}?`}
        description="Mark this check as skipped for today. Provide a reason so HQ can audit the gap."
      />
      <form action={skipCheck}>
        <input type="hidden" name="templateId" value={template.id} />
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                name="reason"
                type="text"
                required
                minLength={3}
                maxLength={500}
                placeholder="e.g. Callsign not running today"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/officer">Cancel</Link>
              </Button>
              <Button type="submit">Skip check</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
