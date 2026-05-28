import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryItems, issues } from "@/db/schema";

/**
 * Reconcile inventory stock against an upstream feed (ILMS).
 *
 * Without ILMS_FEED_URL set, the endpoint reports configured=false.
 * With it set, fetches { externalRef -> currentStock } pairs and
 * updates matching inventory_items. On fetch failure, raises a
 * high-severity issue (best-effort, no team scoping).
 */
export async function GET() {
  const url = process.env.ILMS_FEED_URL;
  if (!url) {
    return NextResponse.json({
      ok: true,
      configured: false,
      reconciled: 0,
      timestamp: new Date().toISOString(),
    });
  }

  let upstream: Array<{ externalRef: string; currentStock: number }> = [];
  try {
    const r = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const json = (await r.json()) as Array<{
      externalRef: string;
      currentStock: number;
    }>;
    upstream = Array.isArray(json) ? json : [];
  } catch (err) {
    try {
      await db.insert(issues).values({
        title: "ILMS reconcile failed",
        note: `Upstream fetch error: ${(err as Error).message}`,
        severity: "high",
      });
    } catch {
      // best-effort
    }
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: (err as Error).message,
        reconciled: 0,
        timestamp: new Date().toISOString(),
      },
      { status: 502 },
    );
  }

  let reconciled = 0;
  for (const u of upstream) {
    if (!u.externalRef || typeof u.currentStock !== "number") continue;
    await db
      .update(inventoryItems)
      .set({ currentStock: u.currentStock, updatedAt: new Date() })
      .where(eq(inventoryItems.externalRef, u.externalRef));
    reconciled += 1;
  }

  return NextResponse.json({
    ok: true,
    configured: true,
    reconciled,
    timestamp: new Date().toISOString(),
  });
}
