import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { requireOfficer } from "@/lib/session";
import { raiseStandaloneIssue } from "../actions";
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

export default async function RaiseIssuePage() {
  await requireOfficer();

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader
        title="Raise an issue"
        description="Report a problem outside of a scheduled checklist."
      />

      <Card>
        <form action={raiseStandaloneIssue}>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                minLength={3}
                maxLength={200}
                placeholder="e.g. Compressor pump making loud noise"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select name="severity" defaultValue="medium">
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low — minor, can wait</SelectItem>
                  <SelectItem value="medium">Medium — should fix soon</SelectItem>
                  <SelectItem value="high">High — affects readiness</SelectItem>
                  <SelectItem value="critical">Critical — out of service</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Detail</Label>
              <Textarea
                id="note"
                name="note"
                rows={5}
                required
                minLength={3}
                maxLength={2000}
                placeholder="What happened, when, and any actions already taken."
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <Button asChild variant="outline">
                <Link href="/officer">Cancel</Link>
              </Button>
              <Button type="submit">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Raise issue
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
