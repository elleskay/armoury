import Link from "next/link";
import { createTemplate, listTeams } from "../actions";
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

export default async function NewTemplatePage() {
  const teams = await listTeams();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title="New checklist template"
        description="Create a checklist and assign it to a team."
      />

      <form action={createTemplate}>
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
                placeholder="Fire Truck Daily Check"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" name="description" rows={2} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamId">Assign to team</Label>
              <Select name="teamId">
                <SelectTrigger id="teamId">
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.agency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <fieldset className="space-y-3">
              <Label className="text-sm font-medium">Checklist items</Label>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    name="itemLabel"
                    type="text"
                    placeholder={
                      i === 0
                        ? "Required, e.g. Tyres in good condition"
                        : "Add another item"
                    }
                  />
                  <Select name="itemKind" defaultValue="boolean">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boolean">Yes/No</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Empty items are ignored. At least one is required.
              </p>
            </fieldset>
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/admin/templates">Cancel</Link>
          </Button>
          <Button type="submit">Create template</Button>
        </div>
      </form>
    </div>
  );
}
