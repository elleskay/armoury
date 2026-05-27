import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { templates } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { listTeams, updateTemplate } from "../../actions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const template = (
    await db.select().from(templates).where(eq(templates.id, id)).limit(1)
  )[0];

  if (!template) notFound();

  const teams = await listTeams();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title={`Edit: ${template.name}`}
        description="Items cannot be changed in-place because past submissions reference them. Use a new template if the items need to change."
      />

      <form action={updateTemplate}>
        <input type="hidden" name="templateId" value={template.id} />
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                minLength={3}
                maxLength={200}
                defaultValue={template.name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                rows={2}
                defaultValue={template.description ?? ""}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={template.status}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select name="frequency" defaultValue={template.frequency}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open (anytime)</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="twice_daily">Twice daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shiftWindow">Shift</Label>
                <Select name="shiftWindow" defaultValue={template.shiftWindow}>
                  <SelectTrigger id="shiftWindow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any shift</SelectItem>
                    <SelectItem value="am">AM</SelectItem>
                    <SelectItem value="pm">PM</SelectItem>
                    <SelectItem value="night">Night</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamId">Assign to team</Label>
              <Select
                name="teamId"
                defaultValue={template.teamId ?? "__all__"}
              >
                <SelectTrigger id="teamId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.agency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/admin/templates">Cancel</Link>
          </Button>
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </div>
  );
}
