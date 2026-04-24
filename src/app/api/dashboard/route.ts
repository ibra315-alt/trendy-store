import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalOrders,
    pendingOrders,
    allOrders,
    openBatch,
    recentOrders,
    unpaidDelivered,
    settings,
    last7DaysOrders,
    statusGroups,
  ] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { status: { in: ["new", "in_progress"] } } }),
    db.order.findMany({ select: { sellingPrice: true, deposit: true, paymentStatus: true } }),
    db.batch.findFirst({
      where: { status: "open" },
      include: {
        orders: true,
        _count: { select: { orders: true } },
      },
    }),
    db.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { customer: true, batch: true },
    }),
    db.order.findMany({
      where: { status: "delivered", paymentStatus: { not: "paid" } },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    }),
    db.settings.findUnique({ where: { id: "default" } }),
    db.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, sellingPrice: true },
    }),
    db.order.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ]);

  const arDays = ["أحد", "اثن", "ثلا", "أرب", "خمس", "جمع", "سبت"];
  const dailyStats = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(0, 0, 0, 0);
    const dayOrders = last7DaysOrders.filter((o) => {
      const od = new Date(o.createdAt);
      return od.getFullYear() === d.getFullYear() &&
             od.getMonth() === d.getMonth() &&
             od.getDate() === d.getDate();
    });
    return {
      date: d.toISOString().slice(0, 10),
      label: arDays[d.getDay()],
      count: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + o.sellingPrice, 0),
    };
  });

  const totalRevenue = allOrders.reduce((sum, o) => sum + o.sellingPrice, 0);
  const outstandingDebts = allOrders
    .filter((o) => o.paymentStatus !== "paid")
    .reduce((sum, o) => sum + (o.sellingPrice - o.deposit), 0);

  const boughtInBatch = openBatch
    ? openBatch.orders.filter((o) => o.status !== "new" && o.status !== "cancelled").length
    : 0;

  return NextResponse.json({
    stats: {
      totalOrders,
      pendingOrders,
      totalRevenue,
      outstandingDebts,
    },
    openBatch: openBatch
      ? {
          ...openBatch,
          boughtCount: boughtInBatch,
          totalCount: openBatch._count.orders,
        }
      : null,
    recentOrders,
    unpaidDelivered,
    settings,
    dailyStats,
    statusCounts: statusGroups.map((g) => ({ status: g.status, count: g._count.id })),
  });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[dashboard] DB error:", msg);
    return NextResponse.json({ error: "db_error", detail: msg }, { status: 500 });
  }
}
