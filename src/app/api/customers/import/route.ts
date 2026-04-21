import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

interface ImportRow {
  name: string;
  phone?: string;
  phone2?: string;
  instagram?: string;
  city?: string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { rows } = (await req.json()) as { rows: ImportRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ imported: 0, skipped: 0 });
    }

    // Fetch all existing phone / instagram values for duplicate detection
    const existing = await db.customer.findMany({
      select: { phone: true, instagram: true },
    });

    const phones = new Set(existing.map((c) => c.phone).filter(Boolean) as string[]);
    const instas = new Set(existing.map((c) => c.instagram).filter(Boolean) as string[]);

    const toInsert: { name: string; phone: string | null; instagram: string | null; city: string | null }[] = [];
    let skipped = 0;

    for (const row of rows) {
      const name = row.name?.trim();
      if (!name) { skipped++; continue; }

      const phone = row.phone?.trim() || null;
      const instagram = row.instagram?.trim() || null;
      const city = row.city?.trim() || null;

      // Duplicate: same phone OR same instagram as any existing/already-queued customer
      const isDup =
        (phone && phones.has(phone)) ||
        (instagram && instas.has(instagram));

      if (isDup) { skipped++; continue; }

      toInsert.push({ name, phone, instagram, city });

      // Track within-batch duplicates
      if (phone) phones.add(phone);
      if (instagram) instas.add(instagram);
    }

    if (toInsert.length > 0) {
      await db.customer.createMany({ data: toInsert });
    }

    return NextResponse.json({ imported: toInsert.length, skipped });
  } catch (err) {
    console.error("Customer import error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
