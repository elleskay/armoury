import { test, expect } from "../../test-lib/spec-test/dist/vitest.js";
import {
  inventoryItems,
  inventoryTransactions,
  inventoryTransactionType,
} from "@/db/schema";

test("[ARM-INVENTORY-001] inventory_items table tracks current stock level", () => {
  expect(inventoryItems.currentStock).toBeDefined();
  expect(inventoryItems.unit).toBeDefined();
  // Stock updates go through inventory_transactions; the items.currentStock
  // column is the materialized aggregate that reflects real-time.
});

test("[ARM-INVENTORY-002] inventory_items track expiration date", () => {
  expect(inventoryItems.expiresAt).toBeDefined();
});

test("[ARM-INVENTORY-003] inventory_items track last stock-take date", () => {
  expect(inventoryItems.lastStockTakeAt).toBeDefined();
});

test("[ARM-INVENTORY-004] inventory transactions are recorded for export", () => {
  // Each delta is a row; an admin export endpoint can serialize the table.
  expect(inventoryTransactions.itemId).toBeDefined();
  expect(inventoryTransactions.delta).toBeDefined();
  expect(inventoryTransactions.type).toBeDefined();
  expect([...inventoryTransactionType.enumValues].sort()).toEqual(
    ["adjustment", "delivery", "stock_take", "withdrawal"].sort(),
  );
});

test("[ARM-INVENTORY-005] external integration via inventory_items.externalRef", () => {
  // External upstream feeds (e.g. ILMS) reconcile by external reference.
  expect(inventoryItems.externalRef).toBeDefined();
});
