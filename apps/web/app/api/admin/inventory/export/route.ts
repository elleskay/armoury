import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryTransactions } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  await requireAdmin();

  const rows = await db
    .select()
    .from(inventoryTransactions)
    .orderBy(desc(inventoryTransactions.createdAt))
    .limit(5000);

  const header = "id,item_id,delta,type,note,created_by_id,created_at\n";
  const csv =
    header +
    rows
      .map(
        (r) =>
          [
            r.id,
            r.itemId,
            r.delta,
            r.type,
            (r.note ?? "").replace(/[\r\n,]/g, " "),
            r.createdById ?? "",
            r.createdAt.toISOString(),
          ].join(","),
      )
      .join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv",
      "content-disposition": `attachment; filename="inventory-transactions.csv"`,
    },
  });
}
