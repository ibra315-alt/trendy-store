import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Force Node.js runtime — required for adm-zip (binary module)
export const runtime = "nodejs";

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

function parseCSV(raw: string): { headers: string[]; rows: Record<string, string>[] } {
  // Strip UTF-8 BOM and normalize line endings
  const content = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").trim(); });
    return row;
  }).filter((r) => Object.values(r).some((v) => v));

  return { headers, rows };
}

function extractCSVFromZip(buffer: Buffer): { csvContent: string; filename: string } {
  // Dynamic require so Next.js doesn't try to bundle it for Edge
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const AdmZip = require("adm-zip");
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().filter(
    (e: { isDirectory: boolean; entryName: string }) =>
      !e.isDirectory && e.entryName.toLowerCase().endsWith(".csv")
  );

  if (entries.length === 0) throw new Error("no_csv");

  // Prefer file with customer/client/زبون in name, else first CSV
  const preferred =
    entries.find((e: { entryName: string }) =>
      /customer|عميل|زبون|client/i.test(e.entryName)
    ) ?? entries[0];

  return {
    csvContent: preferred.getData().toString("utf-8"),
    filename: preferred.entryName as string,
  };
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    console.error("formData parse error:", e);
    return NextResponse.json({ error: "تعذّر قراءة الملف — تأكد من رفعه بشكل صحيح" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const action = (formData.get("action") as string) ?? "parse";

  if (!file) return NextResponse.json({ error: "لم يتم اختيار ملف" }, { status: 400 });

  const name = file.name.toLowerCase();
  let csvContent = "";

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    if (name.endsWith(".csv")) {
      // Plain CSV upload
      csvContent = buffer.toString("utf-8");
    } else if (name.endsWith(".zip")) {
      // ZIP containing CSV
      const result = extractCSVFromZip(buffer);
      csvContent = result.csvContent;
    } else {
      return NextResponse.json({ error: "الملف غير مدعوم — ارفع ملف ZIP أو CSV" }, { status: 400 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "no_csv") {
      return NextResponse.json({ error: "لا يوجد ملف CSV داخل الـ ZIP" }, { status: 400 });
    }
    console.error("file read error:", e);
    return NextResponse.json({ error: "فشل فتح الملف — تأكد أنه ملف ZIP أو CSV صحيح" }, { status: 400 });
  }

  const { headers, rows } = parseCSV(csvContent);
  if (headers.length === 0) {
    return NextResponse.json({ error: "الملف فارغ أو تعذّرت قراءته" }, { status: 400 });
  }

  if (action === "parse") {
    return NextResponse.json({ headers, preview: rows.slice(0, 8), total: rows.length });
  }

  // action === "import"
  let mapping: Record<string, string> = {};
  try {
    mapping = JSON.parse((formData.get("mapping") as string) ?? "{}");
  } catch {
    return NextResponse.json({ error: "بيانات الربط غير صحيحة" }, { status: 400 });
  }

  if (!mapping.name) return NextResponse.json({ error: "يجب تحديد عمود الاسم" }, { status: 400 });

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const customerName = row[mapping.name]?.trim();
    if (!customerName) { skipped++; continue; }
    try {
      await db.customer.create({
        data: {
          name: customerName,
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
