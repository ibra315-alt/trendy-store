import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await db.settings.findUnique({ where: { id: "default" } });
  if (!settings) {
    // Create default settings
    const created = await db.settings.create({
      data: {
        id: "default",
        storeName: "Trendy Store",
        usdToTry: 38.0,
        usdToIqd: 1460.0,
        tryToIqd: 38.4,
      },
    });
    return NextResponse.json(created);
  }

  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const settings = await db.settings.update({
      where: { id: "default" },
      data: {
        ...(data.storeName && { storeName: data.storeName }),
        ...(data.logo !== undefined && { logo: data.logo }),
        ...(data.usdToTry !== undefined && { usdToTry: parseFloat(data.usdToTry) }),
        ...(data.usdToIqd !== undefined && { usdToIqd: parseFloat(data.usdToIqd) }),
        ...(data.tryToIqd !== undefined && { tryToIqd: parseFloat(data.tryToIqd) }),
        ...(data.invoiceTemplate !== undefined && { invoiceTemplate: data.invoiceTemplate || null }),
      },
    });

    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
