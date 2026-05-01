import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

// PUT /api/warehouse/[id] — update product name/type/description
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, type, description } = await req.json();
    const product = await prisma.product.update({
      where: { id },
      data: { name, type, description: description ?? null },
      include: { variants: true },
    });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/warehouse/[id] — delete product (cascades to variants)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
