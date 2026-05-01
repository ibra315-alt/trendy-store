import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

// POST /api/warehouse/[id]/variants — add variant to product
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: productId } = await params;
    const { color, size, purchaseCost, sellingPrice, stock } = await req.json();
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        color:        color        ?? null,
        size:         size         ?? null,
        purchaseCost: purchaseCost ?? 0,
        sellingPrice: sellingPrice ?? 0,
        stock:        stock        ?? 0,
      },
    });
    return NextResponse.json(variant, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add variant" }, { status: 500 });
  }
}
