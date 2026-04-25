/**
 * Customer deduplication script.
 *
 * Dry-run (default):  npx tsx scripts/dedup-customers.ts
 * Execute:            npx tsx scripts/dedup-customers.ts --execute
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const db = new PrismaClient();
const EXECUTE = process.argv.includes("--execute");

/** Extract the bare username from instagram field.
 *  "https://www.instagram.com/queen_s/" → "queen_s"
 *  "@queen_s" → "queen_s"
 *  "queen_s"  → "queen_s"
 */
function parseInstagram(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const urlMatch = raw.match(/instagram\.com\/([^/?#\s]+)/i);
  if (urlMatch) return urlMatch[1].toLowerCase().replace(/\/$/, "");
  return raw.replace(/^@/, "").trim().toLowerCase();
}

/** Normalize phone: digits only */
function parsePhone(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

async function main() {
  const customers = await db.customer.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Build groups keyed by instagram username, falling back to phone
  const groups = new Map<string, typeof customers>();

  for (const c of customers) {
    const igKey = parseInstagram(c.instagram);
    const phoneKey = parsePhone(c.phone);
    const key = igKey ? `ig:${igKey}` : phoneKey ? `ph:${phoneKey}` : null;

    if (!key) continue; // can't safely group without an identifier

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  // Filter to groups that actually have duplicates
  const dupGroups = [...groups.values()].filter((g) => g.length > 1);

  // Stats
  let totalDuplicates = 0;
  let totalOrdersToRelink = 0;

  for (const group of dupGroups) {
    // Sort: most orders first, then oldest record
    group.sort((a, b) => {
      const orderDiff = b._count.orders - a._count.orders;
      if (orderDiff !== 0) return orderDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    const [keeper, ...dupes] = group;
    const dupOrderCount = dupes.reduce((s, d) => s + d._count.orders, 0);
    totalDuplicates += dupes.length;
    totalOrdersToRelink += dupOrderCount;

    if (EXECUTE) {
      // Re-link all orders from duplicates to the keeper
      for (const dupe of dupes) {
        await db.order.updateMany({
          where: { customerId: dupe.id },
          data: { customerId: keeper.id },
        });
      }

      // Patch keeper's empty fields from duplicates (name, phone, city, area)
      const fields: Array<"name" | "phone" | "city" | "area"> = ["name", "phone", "city", "area"];
      const patch: Record<string, string> = {};
      for (const field of fields) {
        if (!keeper[field]) {
          const donor = dupes.find((d) => d[field]);
          if (donor) patch[field] = donor[field]!;
        }
      }
      if (Object.keys(patch).length > 0) {
        await db.customer.update({ where: { id: keeper.id }, data: patch });
      }

      // Delete duplicates
      await db.customer.deleteMany({ where: { id: { in: dupes.map((d) => d.id) } } });
    } else {
      // Dry-run: print each group
      const igKey = parseInstagram(keeper.instagram) ?? parsePhone(keeper.phone);
      console.log(
        `  [${igKey}]  keep: ${keeper.id} (${keeper._count.orders} orders)  ` +
          `delete: ${dupes.length} records (${dupOrderCount} orders to re-link)`
      );
    }
  }

  const uniqueAfter = customers.length - totalDuplicates;

  console.log("\n========= SUMMARY =========");
  console.log(`Total customer records now : ${customers.length}`);
  console.log(`Duplicate groups found     : ${dupGroups.length}`);
  console.log(`Records that will be kept  : ${uniqueAfter}`);
  console.log(`Records that will be deleted: ${totalDuplicates}`);
  console.log(`Orders that will be re-linked: ${totalOrdersToRelink}`);

  if (!EXECUTE) {
    console.log("\nThis was a DRY RUN. Nothing was changed.");
    console.log("To apply: npx tsx scripts/dedup-customers.ts --execute");
  } else {
    console.log("\nDone. Changes applied.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
