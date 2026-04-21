import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const paymentStatus = url.searchParams.get("paymentStatus");
  const batchId = url.searchParams.get("batchId");
  const search = url.searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (status === "active") {
    where.status = { in: ["new", "in_progress"] };
  } else if (status && status !== "all") {
    where.status = status;
  }
  if (paymentStatus && paymentStatus !== "all") where.paymentStatus = paymentStatus;
  if (batchId) where.batchId = batchId;
  if (search) {
    where.OR = [
      { customer: { name: { contains: search } } },
      { productName: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  const orders = await db.order.findMany({
    where,
    include: { customer: true, batch: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await req.json();

    // Find or create customer
    let customerId = data.customerId;
    if (!customerId && data.customerName) {
      const existing = await db.customer.findFirst({
        where: { name: data.customerName },
      });
      if (existing) {
        customerId = existing.id;
        // Update customer info if provided
        await db.customer.update({
          where: { id: existing.id },
          data: {
            ...(data.customerPhone && { phone: data.customerPhone }),
            ...(data.customerInstagram && { instagram: data.customerInstagram }),
            ...(data.governorate && { city: data.governorate }),
            ...(data.area && { area: data.area }),
          },
        });
      } else {
        const customer = await db.customer.create({
          data: {
            name: data.customerName,
            phone: data.customerPhone || data.phone,
            instagram: data.customerInstagram,
            city: data.governorate,
            area: data.area,
          },
        });
        customerId = customer.id;
      }
    }

    const order = await db.order.create({
      data: {
        customerId,
        batchId: data.batchId || null,
        productType: data.productType,
        productName: data.productName,
        color: data.color,
        size: data.size,
        instagramLink: data.instagramLink,
        productLink: data.productLink,
        governorate: data.governorate,
        area: data.area,
        phone: data.phone || data.customerPhone,
        purchaseCost: parseFloat(data.purchaseCost) || 0,
        sellingPrice: parseFloat(data.sellingPrice) || 0,
        deliveryCost: parseFloat(data.deliveryCost) || 0,
        deposit: parseFloat(data.deposit) || 0,
        status: data.status || "new",
        paymentStatus: data.paymentStatus || "unpaid",
        notes: data.notes,
        images: data.images,
        items: data.items || null,
      },
      include: { customer: true, batch: true },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
