import { NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";

// GET /api/warehouse — all products with variants
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: { variants: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch {
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

// POST /api/warehouse — create product (with optional variants)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, description, variants = [] } = body;

    const product = await prisma.product.create({
      data: {
        name,
        type,
        description: description || null,
        variants: {
          create: variants.map((v: { color?: string; size?: string; purchaseCost?: number; sellingPrice?: number; stock?: number }) => ({
            color:        v.color        ?? null,
            size:         v.size         ?? null,
            purchaseCost: v.purchaseCost ?? 0,
            sellingPrice: v.sellingPrice ?? 0,
            stock:        v.stock        ?? 0,
          })),
        },
      },
      include: { variants: true },
    });

    return NextResponse.json(product, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
