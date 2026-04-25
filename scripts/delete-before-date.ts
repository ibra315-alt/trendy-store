/**
 * Delete customers created before a given date (imported ones).
 *
 * Dry-run:  npx tsx scripts/delete-before-date.ts
 * Execute:  npx tsx scripts/delete-before-date.ts --execute
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const db = new PrismaClient();
const EXECUTE = process.argv.includes("--execute");

// Keep customers created ON or AFTER this date
const KEEP_FROM = new Date("2026-04-20T00:00:00.000Z");

async function main() {
  const old = await db.customer.findMany({
    where: { createdAt: { lt: KEEP_FROM } },
    include: { _count: { select: { orders: true } } },
  });

  const withOrders    = old.filter((c) => c._count.orders > 0);
  const withoutOrders = old.filter((c) => c._count.orders === 0);

  console.log(`\nZبائن قبل ${KEEP_FROM.toLocaleDateString("ar-IQ")}:`);
  console.log(`  إجمالي     : ${old.length}`);
  console.log(`  بدون طلبات : ${withoutOrders.length}  ← سيُحذفون`);
  console.log(`  لديهم طلبات: ${withOrders.length}  ← لن يُحذفوا (محمية)`);

  if (withOrders.length > 0) {
    console.log("\nالزبائن المحميون (لديهم طلبات):");
    withOrders.slice(0, 10).forEach((c) =>
      console.log(`  - ${c.instagram ?? c.name} (${c._count.orders} طلب)`)
    );
    if (withOrders.length > 10) console.log(`  ... و ${withOrders.length - 10} آخرين`);
  }

  if (!EXECUTE) {
    console.log("\nهذا عرض فقط. لا شيء تغيّر.");
    console.log("للتنفيذ: npx tsx scripts/delete-before-date.ts --execute");
    return;
  }

  if (withoutOrders.length === 0) {
    console.log("\nلا يوجد ما يُحذف.");
    return;
  }

  const result = await db.customer.deleteMany({
    where: {
      createdAt: { lt: KEEP_FROM },
      orders: { none: {} },
    },
  });

  console.log(`\n✓ تم حذف ${result.count} زبون.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
