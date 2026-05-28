import Link from "next/link";
import { eq, and, gt, isNull } from "drizzle-orm";
import { Shield, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

import { db } from "@/db/client";
import { inviteCodes, teams } from "@/db/schema";
import { auth } from "@/auth";
import { redeemInviteCode } from "@/app/(app)/admin/teams/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const now = new Date();

  const rows = await db
    .select({
      invite: inviteCodes,
      team: teams,
    })
    .from(inviteCodes)
    .leftJoin(teams, eq(inviteCodes.teamId, teams.id))
    .where(eq(inviteCodes.code, code))
    .limit(1);

  const row = rows[0];
  const session = await auth();

  const valid =
    row && row.invite.expiresAt > now && row.invite.redeemedAt == null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <CardTitle>Armoury invitation</CardTitle>
          <CardDescription>
            {valid
              ? "Join a team to start submitting equipment checks."
              : "This invite is no longer usable."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!row ? (
            <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <div className="font-medium">Code not found</div>
                <div className="text-muted-foreground">
                  Double-check the link, or ask your admin to generate a new invite.
                </div>
              </div>
            </div>
          ) : !valid ? (
            <div className="flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <div className="font-medium">
                  {row.invite.redeemedAt ? "Already redeemed" : "Expired"}
                </div>
                <div className="text-muted-foreground">
                  Ask your admin to generate a new invite.
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Team</span>
                  <span className="font-medium">{row.team?.name ?? "Unassigned"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Agency</span>
                  <Badge variant="secondary">{row.team?.agency ?? "n/a"}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <Badge variant="outline" className="capitalize">{row.invite.role}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Expires</span>
                  <span>{row.invite.expiresAt.toISOString().slice(0, 16).replace("T", " ")}</span>
                </div>
              </div>

              {session?.user ? (
                <form action={redeemInviteCode}>
                  <input type="hidden" name="code" value={code} />
                  <Button type="submit" className="w-full">
                    <CheckCircle2 className="h-4 w-4" />
                    Join {row.team?.name ?? "team"} as signed-in user
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Signed in as {session.user.email}
                  </p>
                </form>
              ) : (
                <div className="space-y-2">
                  <Button asChild className="w-full">
                    <Link href={`/login?callbackUrl=${encodeURIComponent(`/invite/${code}`)}`}>
                      Sign in to accept
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Sign in first; we will bring you back here to accept the invite.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
