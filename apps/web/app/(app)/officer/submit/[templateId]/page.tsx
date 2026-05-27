import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { templates, templateItems } from "@/db/schema";
import { requireOfficer } from "@/lib/session";
import { submitChecklist } from "../../actions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChecklistSearch } from "./ChecklistSearch";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const officer = await requireOfficer();
  const { templateId } = await params;

  const template = (
    await db.select().from(templates).where(eq(templates.id, templateId)).limit(1)
  )[0];

  if (!template) notFound();
  if (template.teamId && template.teamId !== officer.teamId) notFound();
  if (template.status !== "published" || template.archivedAt) notFound();

  const items = await db
    .select()
    .from(templateItems)
    .where(eq(templateItems.templateId, templateId))
    .orderBy(templateItems.position);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title={template.name}
        description={template.description ?? undefined}
      />

      <form action={submitChecklist}>
        <input type="hidden" name="templateId" value={template.id} />
        <Card>
          <CardContent className="space-y-6 p-6">
            <ChecklistSearch labels={items.map((it) => it.label)}>
            {items.map((item, idx) => (
              <div key={item.id} className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <Label className="text-sm font-medium">
                    <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                    {item.label}
                    {item.required && <span className="ml-1 text-destructive">*</span>}
                  </Label>

                  {item.kind === "boolean" ? (
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`v:${item.id}`}
                          value="yes"
                          defaultChecked
                          className="h-4 w-4 accent-primary"
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`v:${item.id}`}
                          value="no"
                          className="h-4 w-4 accent-primary"
                        />
                        <span>No</span>
                      </label>
                    </div>
                  ) : item.kind === "number" ? (
                    <Input
                      type="number"
                      name={`v:${item.id}`}
                      required={item.required}
                      className="w-32"
                    />
                  ) : item.kind === "dropdown" ? (
                    <Select name={`v:${item.id}`} required={item.required}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(item.options ?? []).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : item.kind === "date_time" ? (
                    <Input
                      type="datetime-local"
                      name={`v:${item.id}`}
                      required={item.required}
                      className="w-64"
                    />
                  ) : (
                    <Input
                      type="text"
                      name={`v:${item.id}`}
                      required={item.required}
                      className="w-64"
                    />
                  )}
                </div>
                <Input
                  type="text"
                  name={`note:${item.id}`}
                  placeholder="Optional issue note (blank = no problem)"
                  className="text-xs"
                />
              </div>
            ))}
            </ChecklistSearch>
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/officer">Cancel</Link>
          </Button>
          <Button type="submit">Submit checklist</Button>
        </div>
      </form>
    </div>
  );
}
