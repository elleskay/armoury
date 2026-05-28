"use server";

import { z } from "zod";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { db } from "@/db/client";
import { inviteCodes, users, teams } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/session";

const generateInviteSchema = z.object({
  teamId: z.string().uuid(),
  role: z.enum(["officer", "logs_ic", "team_admin", "hq"]).default("officer"),
  ttlHours: z.number().int().min(1).max(720).default(168),
});

function freshCode(): string {
  return randomBytes(6).toString("base64url").toUpperCase();
}

export async function generateInviteCode(formData: FormData) {
  await requireAdmin();
  const parsed = generateInviteSchema.safeParse({
    teamId: formData.get("teamId"),
    role: formData.get("role") ?? "officer",
    ttlHours: Number(formData.get("ttlHours") ?? "168"),
  });
  if (!parsed.success) throw new Error("Invalid input: " + parsed.error.message);

  const code = freshCode();
  const expiresAt = new Date(Date.now() + parsed.data.ttlHours * 3_600_000);

  await db.insert(inviteCodes).values({
    code,
    teamId: parsed.data.teamId,
    role: parsed.data.role,
    expiresAt,
  });

  revalidatePath("/admin/teams");
}

const redeemSchema = z.object({ code: z.string().min(4).max(32) });

export async function redeemInviteCode(formData: FormData) {
  const me = await requireUser();
  const parsed = redeemSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) throw new Error("Invalid code");

  const now = new Date();
  const [invite] = await db
    .select()
    .from(inviteCodes)
    .where(
      and(
        eq(inviteCodes.code, parsed.data.code),
        gt(inviteCodes.expiresAt, now),
        isNull(inviteCodes.redeemedAt),
      ),
    )
    .limit(1);

  if (!invite) throw new Error("Invite code not found or already used");

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ teamId: invite.teamId, role: invite.role })
      .where(eq(users.id, me.id));
    await tx
      .update(inviteCodes)
      .set({ redeemedAt: now, redeemedById: me.id })
      .where(eq(inviteCodes.id, invite.id));
  });

  revalidatePath("/officer");
  revalidatePath("/admin/teams");
  redirect("/officer");
}

export async function listTeamsWithInvites() {
  await requireAdmin();
  const teamsList = await db.select().from(teams).orderBy(teams.name);
  return teamsList;
}

export async function listOpenInvitesForTeam(teamId: string) {
  await requireAdmin();
  const now = new Date();
  return db
    .select()
    .from(inviteCodes)
    .where(
      and(
        eq(inviteCodes.teamId, teamId),
        isNull(inviteCodes.redeemedAt),
        gt(inviteCodes.expiresAt, now),
      ),
    );
}

export async function expiredInviteCount() {
  await requireAdmin();
  const now = new Date();
  const rows = await db
    .select({ id: inviteCodes.id })
    .from(inviteCodes)
    .where(lt(inviteCodes.expiresAt, now));
  return rows.length;
}
