/**
 * Group existing orders into monthly batches.
 *
 * For every unique year+month found in orders.createdAt, creates a Batch
 * named e.g. "حزيران 2023" and links all orders from that month to it.
 * Orders that already have a batchId are skipped.
 *
 * Dry-run (default):  npx tsx scripts/group-orders-into-batches.ts
 * Execute:            npx tsx scripts/group-orders-into-batches.ts --execute
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const db = new PrismaClient();
const EXECUTE = process.argv.includes("--execute");

const ARABIC_MONTHS = [
  "كانون الثاني", // 1
  "شباط",         // 2
  "آذار",         // 3
  "نيسان",        // 4
  "أيار",         // 5
  "حزيران",       // 6
  "تموز",         // 7
  "آب",           // 8
  "أيلول",        // 9
  "تشرين الأول",  // 10
  "تشرين الثاني", // 11
  "كانون الأول",  // 12
];

function monthName(year: number, month: number): string {
  return `${ARABIC_MONTHS[month - 1]} ${year}`;
}

async function main() {
  // Load only orders without a batch
  const orders = await db.order.findMany({
    where: { batchId: null },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (orders.length === 0) {
    console.log("لا توجد طلبات بدون شحنة.");
    return;
  }

  // Group by "YYYY-MM"
  const groups = new Map<string, { year: number; month: number; ids: string[] }>();

  for (const order of orders) {
    const d = new Date(order.createdAt);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, { year, month, ids: [] });
    groups.get(key)!.ids.push(order.id);
  }

  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  console.log(`\nالطلبات بدون شحنة: ${orders.length}`);
  console.log(`المجموعات (الأشهر): ${sorted.length}\n`);

  for (const [key, { year, month, ids }] of sorted) {
    const name = monthName(year, month);
    console.log(`  ${key}  →  "${name}"  (${ids.length} طلب)`);
  }

  if (!EXECUTE) {
    console.log("\nهذا عرض فقط. لا شيء تغيّر.");
    console.log("للتنفيذ: npx tsx scripts/group-orders-into-batches.ts --execute");
    return;
  }

  console.log("\nجاري الإنشاء...");

  for (const [, { year, month, ids }] of sorted) {
    const name = monthName(year, month);
    const openDate = new Date(year, month - 1, 1);
    const closeDate = new Date(year, month, 0, 23, 59, 59); // last day of month

    // Create or find existing batch with same name
    let batch = await db.batch.findFirst({ where: { name } });
    if (!batch) {
      batch = await db.batch.create({
        data: {
          name,
          openDate,
          closeDate,
          status: "completed",
          createdAt: openDate,
        },
      });
    }

    await db.order.updateMany({
      where: { id: { in: ids } },
      data: { batchId: batch.id },
    });

    console.log(`  ✓  "${name}" — ${ids.length} طلب`);
  }

  console.log("\nتم. جميع الطلبات وُزِّعت على شحناتها الشهرية.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
