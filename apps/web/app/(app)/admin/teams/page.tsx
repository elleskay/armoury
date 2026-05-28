import { eq, and, gt, isNull, asc } from "drizzle-orm";
import { Copy, Users } from "lucide-react";

import { db } from "@/db/client";
import { teams, users, inviteCodes } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { generateInviteCode } from "./actions";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  await requireAdmin();

  const allTeams = await db.select().from(teams).orderBy(asc(teams.name));
  const allUsers = await db.select().from(users).orderBy(asc(users.name));
  const now = new Date();
  const openInvites = await db
    .select()
    .from(inviteCodes)
    .where(and(gt(inviteCodes.expiresAt, now), isNull(inviteCodes.redeemedAt)));

  const usersByTeam = new Map<string, typeof allUsers>();
  for (const u of allUsers) {
    if (!u.teamId) continue;
    const arr = usersByTeam.get(u.teamId) ?? [];
    arr.push(u);
    usersByTeam.set(u.teamId, arr);
  }
  const invitesByTeam = new Map<string, typeof openInvites>();
  for (const inv of openInvites) {
    if (!inv.teamId) continue;
    const arr = invitesByTeam.get(inv.teamId) ?? [];
    arr.push(inv);
    invitesByTeam.set(inv.teamId, arr);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader
        title="Teams"
        description="Members and active invite codes per team. Share an invite link to onboard new officers from any device."
      />

      {allTeams.length === 0 ? (
        <EmptyState icon={Users} title="No teams yet" description="Teams will appear here once created." />
      ) : (
        <div className="space-y-4">
          {allTeams.map((team) => {
            const members = usersByTeam.get(team.id) ?? [];
            const invites = invitesByTeam.get(team.id) ?? [];
            return (
              <Card key={team.id}>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold">{team.name}</h2>
                      <Badge variant="secondary">{team.agency}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {members.length} member{members.length === 1 ? "" : "s"}
                      {team.telegramChatId ? " , Telegram wired" : ""}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {members.length > 0 && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Members</div>
                      <ul className="space-y-1 text-sm">
                        {members.map((m) => (
                          <li key={m.id} className="flex items-center justify-between border-b pb-1 last:border-none">
                            <span>{m.name}</span>
                            <span className="flex items-center gap-2 text-muted-foreground text-xs">
                              <span>{m.email}</span>
                              <Badge variant="outline" className="capitalize">{m.role}</Badge>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Active invite codes</div>
                    {invites.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active invites. Generate one below.</p>
                    ) : (
                      <ul className="space-y-2">
                        {invites.map((inv) => (
                          <li key={inv.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <div className="flex items-center gap-3">
                              <code className="font-mono text-sm">{inv.code}</code>
                              <Badge variant="outline" className="capitalize">{inv.role}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              expires {inv.expiresAt.toISOString().slice(0, 10)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <form action={generateInviteCode} className="flex flex-wrap items-end gap-2 pt-2 border-t">
                    <input type="hidden" name="teamId" value={team.id} />
                    <div className="space-y-1">
                      <label htmlFor={`role-${team.id}`} className="text-xs text-muted-foreground">Role</label>
                      <Select name="role" defaultValue="officer">
                        <SelectTrigger id={`role-${team.id}`} className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="officer">Officer</SelectItem>
                          <SelectItem value="logs_ic">Logs IC</SelectItem>
                          <SelectItem value="team_admin">Team admin</SelectItem>
                          <SelectItem value="hq">HQ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label htmlFor={`ttl-${team.id}`} className="text-xs text-muted-foreground">Expires in (hours)</label>
                      <Select name="ttlHours" defaultValue="168">
                        <SelectTrigger id={`ttl-${team.id}`} className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24 hours</SelectItem>
                          <SelectItem value="168">7 days</SelectItem>
                          <SelectItem value="720">30 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit">
                      <Copy className="h-4 w-4" />
                      Generate code
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
