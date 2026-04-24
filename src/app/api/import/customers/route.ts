import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AdmZip from "adm-zip";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^﻿/, "").trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").trim(); });
    return row;
  }).filter((r) => Object.values(r).some((v) => v));
  return { headers, rows };
}

/* ── POST /api/import/customers ─────────────────────────────────────────────
   Body: multipart/form-data
     file  — ZIP file
   Returns on action=parse: { headers, preview, total }
   Returns on action=import: { created, skipped }
*/
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const action = (formData.get("action") as string) ?? "parse";

  if (!file) return NextResponse.json({ error: "لم يتم اختيار ملف" }, { status: 400 });

  let csvContent: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries().filter((e) => !e.isDirectory && e.entryName.endsWith(".csv"));
    if (entries.length === 0) return NextResponse.json({ error: "لا يوجد ملف CSV داخل الـ ZIP" }, { status: 400 });
    // Prefer files with customer-related names
    const preferred = entries.find((e) =>
      /customer|عميل|زبون|client/i.test(e.entryName)
    ) ?? entries[0];
    csvContent = preferred.getData().toString("utf-8");
  } catch {
    return NextResponse.json({ error: "فشل فتح ملف ZIP — تأكد أنه ملف ZIP صحيح" }, { status: 400 });
  }

  const { headers, rows } = parseCSV(csvContent);
  if (headers.length === 0) return NextResponse.json({ error: "الـ CSV فارغ أو تعذّرت قراءته" }, { status: 400 });

  if (action === "parse") {
    return NextResponse.json({ headers, preview: rows.slice(0, 8), total: rows.length });
  }

  // action === "import"
  const mapping = JSON.parse((formData.get("mapping") as string) ?? "{}") as Record<string, string>;
  // mapping: { name: "colName", instagram: "colName", phone: "colName", city: "colName", area: "colName" }

  if (!mapping.name) return NextResponse.json({ error: "يجب تحديد عمود الاسم" }, { status: 400 });

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = row[mapping.name]?.trim();
    if (!name) { skipped++; continue; }

    try {
      await db.customer.create({
        data: {
          name,
          instagram: mapping.instagram ? (row[mapping.instagram]?.trim() || null) : null,
          phone:     mapping.phone     ? (row[mapping.phone]?.trim()     || null) : null,
          city:      mapping.city      ? (row[mapping.city]?.trim()      || null) : null,
          area:      mapping.area      ? (row[mapping.area]?.trim()      || null) : null,
        },
      });
      created++;
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({ created, skipped });
}
