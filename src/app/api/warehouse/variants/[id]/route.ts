import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

// PUT /api/warehouse/variants/[id] — update variant fields or adjust stock
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // stockDelta: +N or -N relative adjustment
    if (typeof body.stockDelta === "number") {
      const current = await prisma.productVariant.findUnique({ where: { id }, select: { stock: true } });
      const newStock = Math.max(0, (current?.stock ?? 0) + body.stockDelta);
      const variant = await prisma.productVariant.update({
        where: { id },
        data: { stock: newStock },
      });
      return NextResponse.json(variant);
    }

    const { color, size, purchaseCost, sellingPrice, stock } = body;
    const variant = await prisma.productVariant.update({
      where: { id },
      data: {
        color:        color        ?? null,
        size:         size         ?? null,
        purchaseCost: purchaseCost ?? 0,
        sellingPrice: sellingPrice ?? 0,
        ...(typeof stock === "number" ? { stock } : {}),
      },
    });
    return NextResponse.json(variant);
  } catch {
    return NextResponse.json({ error: "Failed to update variant" }, { status: 500 });
  }
}

// DELETE /api/warehouse/variants/[id] — delete a single variant
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.productVariant.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete variant" }, { status: 500 });
  }
}
