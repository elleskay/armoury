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
        description="Create a checklist, set its schedule, and assign it to a team."
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

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue="published">
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
                <Select name="frequency" defaultValue="open">
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
                <Select name="shiftWindow" defaultValue="any">
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
              <Select name="teamId" defaultValue="__all__">
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

            <fieldset className="space-y-3">
              <Label className="text-sm font-medium">Checklist items</Label>
              <p className="text-xs text-muted-foreground">
                For dropdown items, list options comma-separated. Empty items are ignored.
              </p>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_140px_1fr]">
                  <Input
                    name="itemLabel"
                    type="text"
                    placeholder={
                      i === 0
                        ? "e.g. Tyres in good condition"
                        : "Add another item"
                    }
                  />
                  <Select name="itemKind" defaultValue="boolean">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boolean">Yes/No</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                      <SelectItem value="date_time">Date/Time</SelectItem>
                      <SelectItem value="photo">Photo</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    name="itemOptions"
                    type="text"
                    placeholder="Dropdown options (a,b,c)"
                  />
                </div>
              ))}
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
