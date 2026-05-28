import { desc, eq, lt, gte, sql } from "drizzle-orm";
import { Package, AlertCircle } from "lucide-react";

import { db } from "@/db/client";
import { inventoryItems, teams } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

/* eslint-disable react-hooks/purity */
export default async function InventoryPage() {
  await requireAdmin();

  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: inventoryItems.id,
      name: inventoryItems.name,
      category: inventoryItems.category,
      unit: inventoryItems.unit,
      currentStock: inventoryItems.currentStock,
      expiresAt: inventoryItems.expiresAt,
      lastStockTakeAt: inventoryItems.lastStockTakeAt,
      externalRef: inventoryItems.externalRef,
      teamName: teams.name,
      teamAgency: teams.agency,
    })
    .from(inventoryItems)
    .leftJoin(teams, eq(inventoryItems.teamId, teams.id))
    .orderBy(inventoryItems.name);

  const lowStock = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryItems)
    .where(lt(inventoryItems.currentStock, 5));
  const expiringSoon = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(inventoryItems)
    .where(
      sql`${inventoryItems.expiresAt} IS NOT NULL AND ${inventoryItems.expiresAt} < ${thirtyDaysOut.toISOString()}`,
    );
  void gte;
  void desc;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory"
        description="Pulse: live stock and expiry across teams."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Items tracked</div>
          <div className="mt-1 text-2xl font-semibold">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Low stock (&lt;5)</div>
          <div className="mt-1 text-2xl font-semibold">
            {lowStock[0]?.count ?? 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Expiring within 30 days</div>
          <div className="mt-1 text-2xl font-semibold">
            {expiringSoon[0]?.count ?? 0}
          </div>
        </Card>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory items"
          description="Items added via the admin UI or upstream ILMS sync will appear here."
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Last stock-take</TableHead>
                <TableHead>External ref</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const lowStock = row.currentStock < 5;
                const expiringSoonFlag =
                  row.expiresAt !== null && row.expiresAt < thirtyDaysOut;
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.category ?? "(uncategorised)"} · {row.unit}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.teamName ?? "All"}
                      {row.teamAgency && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {row.teamAgency}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={lowStock ? "destructive" : "secondary"}>
                        {row.currentStock}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.expiresAt
                        ? row.expiresAt.toISOString().slice(0, 10)
                        : "n/a"}
                      {expiringSoonFlag && (
                        <AlertCircle className="ml-2 inline h-3 w-3 text-amber-600" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.lastStockTakeAt
                        ? row.lastStockTakeAt.toISOString().slice(0, 10)
                        : "never"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.externalRef ?? "(none)"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
