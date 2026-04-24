"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { formatUSD, formatTRY } from "@/lib/utils";
import { ChevronDown, Users, Truck, TrendingDown, Wallet, MessageCircle, Check, ArrowRightLeft, MapPin, TrendingUp } from "lucide-react";

interface Order {
  id: string;
  productName: string;
  productType: string;
  sellingPrice: number;
  purchaseCost: number;
  deliveryCost: number;
  deposit: number;
  paymentStatus: string;
  phone: string | null;
  customer: { id: string; name: string; phone: string | null } | null;
}

interface Batch {
  id: string;
  name: string;
  status: string;
  shippingCost: number;
  openDate: string;
  orders: Order[];
}

interface Settings {
  usdToIqd: number;
  tryToIqd: number;
}

const STATUS_LABEL: Record<string, string> = {
  open: "مفتوحة",
  shipped: "شُحنت",
  in_distribution: "قيد التوزيع",
  completed: "مكتملة",
};

const STATUS_COLOR: Record<string, string> = {
  open: "#3b82f6",
  shipped: "#f97316",
  in_distribution: "#a855f7",
  completed: "#22c55e",
};

const PAYMENT_OPTIONS = [
  { value: "paid",    label: "مدفوع",        color: "#22c55e" },
  { value: "partial", label: "جزئي",          color: "#f59e0b" },
  { value: "unpaid",  label: "غير مدفوع",    color: "#ef4444" },
];

function num(n: number) {
  return n.toLocaleString("en-IQ");
}

function InfoRow({ label, value, sub, valueColor }: {
  label: string; value: string; sub?: string; valueColor?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px]" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-sm font-semibold tabular-nums" style={{ color: valueColor ?? "var(--foreground)" }}>{value}</span>
      {sub && <span className="text-[10px]" style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

function BatchCard({
  batch,
  settings,
  allBatches,
  onOrdersChange,
}: {
  batch: Batch;
  settings: Settings;
  allBatches: Batch[];
  onOrdersChange: (batchId: string, updatedOrders: Order[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>(batch.orders);
  const [updating, setUpdating] = useState<string | null>(null);
  const [payDropId, setPayDropId] = useState<string | null>(null);
  const [moveDropId, setMoveDropId] = useState<string | null>(null);
  const { usdToIqd, tryToIqd } = settings;

  // Keep local orders in sync if batch.orders changes externally
  useEffect(() => { setOrders(batch.orders); }, [batch.orders]);

  const totalPurchaseTRY  = orders.reduce((s, o) => s + o.purchaseCost, 0);
  const totalSellIQD      = orders.reduce((s, o) => s + o.sellingPrice, 0);
  const totalDeliveryIQD  = orders.reduce((s, o) => s + o.deliveryCost, 0);
  const totalDeposit      = orders.reduce((s, o) => s + o.deposit, 0);
  const totalRemaining    = orders.reduce((s, o) => {
    const owed = o.sellingPrice - o.deposit;
    return s + (owed > 0 && o.paymentStatus !== "paid" ? owed : 0);
  }, 0);

  const purchaseIQD     = totalPurchaseTRY * tryToIqd;
  const purchaseUSD     = usdToIqd > 0 ? purchaseIQD / usdToIqd : 0;
  const sellUSD         = usdToIqd > 0 ? totalSellIQD / usdToIqd : 0;
  const deliveryUSD     = usdToIqd > 0 ? totalDeliveryIQD / usdToIqd : 0;
  const depositUSD      = usdToIqd > 0 ? totalDeposit / usdToIqd : 0;
  const remainingUSD    = usdToIqd > 0 ? totalRemaining / usdToIqd : 0;
  const profit          = totalSellIQD - totalDeliveryIQD - purchaseIQD;
  const profitUSD       = usdToIqd > 0 ? profit / usdToIqd : 0;
  const deliveryGroups  = Object.entries(
    orders.reduce((acc, o) => {
      if (o.deliveryCost > 0) { const k = String(o.deliveryCost); acc[k] = (acc[k] || 0) + 1; }
      return acc;
    }, {} as Record<string, number>)
  ).sort(([a], [b]) => Number(b) - Number(a));

  const unpaidCount  = orders.filter((o) => o.paymentStatus !== "paid").length;
  const statusColor  = STATUS_COLOR[batch.status] ?? "#6b7280";
  const statusLabel  = STATUS_LABEL[batch.status] ?? batch.status;

  const updateOrder = async (orderId: string, patch: Record<string, unknown>) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        // If moved to another batch, remove from this batch
        if (patch.batchId !== undefined && patch.batchId !== batch.id) {
          const next = orders.filter((o) => o.id !== orderId);
          setOrders(next);
          onOrdersChange(batch.id, next);
        } else {
          // Update payment status locally
          const next = orders.map((o) =>
            o.id === orderId ? { ...o, ...patch } : o
          ) as Order[];
          setOrders(next);
          onOrdersChange(batch.id, next);
        }
      }
    } catch { /* ignore */ }
    setUpdating(null);
    setPayDropId(null);
    setMoveDropId(null);
  };

  return (
    <div className="rounded-2xl border overflow-visible" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{batch.name}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: statusColor + "22", color: statusColor }}>{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {new Date(batch.openDate).toLocaleDateString("ar-IQ", { day: "numeric", month: "short" })}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
            <Users size={12} />{orders.length}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
        {/* TRY cost + IQD + USD faint */}
        <div className="px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface)" }}>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>تكلفة الشراء</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--foreground)" }}>{formatTRY(totalPurchaseTRY)}</span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>≈ {num(Math.round(purchaseIQD))} IQD</span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)", opacity: 0.6 }}>≈ {formatUSD(Math.round(purchaseUSD * 100) / 100)}</span>
        </div>

        {/* IQD selling + USD faint */}
        <div className="px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface)" }}>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>إجمالي البيع</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: "#22c55e" }}>{num(totalSellIQD)} IQD</span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)", opacity: 0.6 }}>≈ {formatUSD(Math.round(sellUSD * 100) / 100)}</span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>{orders.length} طلب</span>
        </div>

        {/* Delivery fees + breakdown */}
        <div className="px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface)" }}>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>أجور التوصيل</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: "#f59e0b" }}>{num(Math.round(totalDeliveryIQD))} IQD</span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)", opacity: 0.6 }}>≈ {formatUSD(Math.round(deliveryUSD * 100) / 100)}</span>
          {deliveryGroups.length > 0
            ? deliveryGroups.map(([cost, count]) => (
                <span key={cost} className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
                  {num(Number(cost))} × {count} طلب
                </span>
              ))
            : <span className="text-[10px]" style={{ color: "var(--muted)" }}>لا يوجد توصيل</span>
          }
        </div>

        {/* Deposit + USD faint */}
        <div className="px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface)" }}>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>العربون المحصل</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: "#22c55e" }}>{num(totalDeposit)} IQD</span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)", opacity: 0.6 }}>≈ {formatUSD(Math.round(depositUSD * 100) / 100)}</span>
        </div>

        {/* Remaining + USD faint */}
        <div className="px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface)" }}>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>المتبقي للتحصيل</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: totalRemaining > 0 ? "#ef4444" : "#22c55e" }}>{num(totalRemaining)} IQD</span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)", opacity: 0.6 }}>≈ {formatUSD(Math.round(remainingUSD * 100) / 100)}</span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>{unpaidCount} طلب غير مكتمل</span>
        </div>

        {/* Profit + USD faint */}
        <div className="px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface)" }}>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>الربح التقديري</span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: profit >= 0 ? "#22c55e" : "#ef4444" }}>{num(Math.round(profit))} IQD</span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)", opacity: 0.6 }}>≈ {formatUSD(Math.round(profitUSD * 100) / 100)}</span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>بيع − توصيل − تكلفة</span>
        </div>
      </div>

      {/* Customers toggle */}
      {orders.length > 0 && (
        <div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors hover:brightness-110"
            style={{
              color: unpaidCount > 0 ? "#ef4444" : "#22c55e",
              background: unpaidCount > 0 ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)",
              borderTop: "1px solid var(--border)",
            }}
          >
            <span>
              {unpaidCount > 0
                ? `${unpaidCount} زبون لم يكمل الدفع — متبقي ${num(totalRemaining)} IQD`
                : `${orders.length} زبون — الكل دفعوا ✓`}
            </span>
            <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </button>

          {open && (
            <div className="divide-y" style={{ borderTop: "1px solid var(--border)" }}>
              {orders.map((o) => {
                const owed  = o.sellingPrice - o.deposit;
                const phone = o.customer?.phone ?? o.phone ?? "";
                const wa    = phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : null;
                const pay   = PAYMENT_OPTIONS.find((p) => p.value === o.paymentStatus) ?? PAYMENT_OPTIONS[2];
                const isUpdating = updating === o.id;

                return (
                  <div key={o.id} className="flex items-center gap-2 px-3 py-2.5 overflow-visible" dir="rtl">
                    {/* Name + product */}
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-medium block truncate" style={{ color: "var(--foreground)" }}>
                        {o.customer?.name ?? "غير معروف"}
                      </span>
                      <span className="text-[11px] block truncate" style={{ color: "var(--muted)" }}>
                        {o.productType || o.productName || "—"}
                      </span>
                    </div>

                    {/* Amount owed */}
                    {o.paymentStatus !== "paid" && (
                      <span className="text-[12px] font-bold tabular-nums shrink-0" style={{ color: "#ef4444" }}>
                        {num(owed)} IQD
                      </span>
                    )}

                    {/* Payment status dropdown */}
                    <div className="relative shrink-0" style={{ zIndex: payDropId === o.id ? 60 : "auto" }}>
                      <button
                        onClick={() => { setPayDropId(payDropId === o.id ? null : o.id); setMoveDropId(null); }}
                        disabled={isUpdating}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:brightness-110 disabled:opacity-50"
                        style={{ background: pay.color + "22", color: pay.color }}
                      >
                        {pay.label}
                        <ChevronDown size={10} />
                      </button>
                      {payDropId === o.id && (
                        <div className="absolute left-0 top-full mt-1 rounded-xl shadow-xl overflow-hidden py-1 min-w-[120px]"
                          style={{ background: "#1e1e2e", border: "1px solid #333", zIndex: 60 }}>
                          {PAYMENT_OPTIONS.map((p) => (
                            <button key={p.value}
                              onClick={() => updateOrder(o.id, { paymentStatus: p.value })}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:brightness-125"
                              style={{
                                background: o.paymentStatus === p.value ? p.color + "22" : "transparent",
                                color: p.color,
                              }}
                            >
                              {o.paymentStatus === p.value && <Check size={10} />}
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Move to batch */}
                    <div className="relative shrink-0" style={{ zIndex: moveDropId === o.id ? 60 : "auto" }}>
                      <button
                        onClick={() => { setMoveDropId(moveDropId === o.id ? null : o.id); setPayDropId(null); }}
                        disabled={isUpdating}
                        title="نقل إلى شحنة"
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:bg-[var(--surface-secondary)] disabled:opacity-50"
                        style={{ color: "var(--muted)" }}
                      >
                        <ArrowRightLeft size={12} />
                      </button>
                      {moveDropId === o.id && (
                        <div className="absolute left-0 top-full mt-1 rounded-xl shadow-xl overflow-hidden py-1 min-w-[150px]"
                          style={{ background: "#1e1e2e", border: "1px solid #333", zIndex: 60 }}>
                          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide"
                            style={{ color: "var(--muted)" }}>نقل إلى شحنة</div>
                          {allBatches.filter((b) => b.id !== batch.id).map((b) => (
                            <button key={b.id}
                              onClick={() => updateOrder(o.id, { batchId: b.id })}
                              className="w-full text-start px-3 py-2 text-[12px] transition-colors hover:brightness-125"
                              style={{ color: "#e5e7eb", background: "transparent" }}
                            >
                              {b.name}
                            </button>
                          ))}
                          <button
                            onClick={() => updateOrder(o.id, { batchId: null })}
                            className="w-full text-start px-3 py-2 text-[12px] transition-colors hover:brightness-125"
                            style={{ color: "#9ca3af", background: "transparent" }}
                          >
                            بدون شحنة
                          </button>
                        </div>
                      )}
                    </div>

                    {/* WhatsApp */}
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors hover:brightness-110 shrink-0"
                        style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                        <MessageCircle size={12} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FinancePage() {
  const { isAdmin } = useAuthStore();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [batchesRes, settingsRes] = await Promise.all([
          fetch("/api/batches"),
          fetch("/api/settings"),
        ]);
        if (batchesRes.ok) setBatches(await batchesRes.json());
        if (settingsRes.ok) setSettings(await settingsRes.json());
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleOrdersChange = (batchId: string, updatedOrders: Order[]) => {
    setBatches((prev) =>
      prev.map((b) => b.id === batchId ? { ...b, orders: updatedOrders } : b)
    );
  };

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p style={{ color: "var(--muted)" }}>صلاحية المسؤول مطلوبة.</p>
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p style={{ color: "var(--muted)" }}>جاري تحميل البيانات...</p>
      </div>
    );
  }

  const { usdToIqd, tryToIqd } = settings;
  const allOrders          = batches.flatMap((b) => b.orders);
  const totalShippingUSD   = batches.reduce((s, b) => s + b.shippingCost, 0);
  const totalPurchaseTRY   = allOrders.reduce((s, o) => s + o.purchaseCost, 0);
  const totalPurchaseIQD   = totalPurchaseTRY * tryToIqd;
  const totalPurchaseUSD   = usdToIqd > 0 ? totalPurchaseIQD / usdToIqd : 0;
  const totalDeliveryIQD   = allOrders.reduce((s, o) => s + o.deliveryCost, 0);
  const totalDeliveryUSD   = usdToIqd > 0 ? totalDeliveryIQD / usdToIqd : 0;
  const totalSellIQD       = allOrders.reduce((s, o) => s + o.sellingPrice, 0);
  const totalSellUSD       = usdToIqd > 0 ? totalSellIQD / usdToIqd : 0;
  const totalRemaining     = allOrders.reduce((s, o) => {
    const owed = o.sellingPrice - o.deposit;
    return s + (owed > 0 && o.paymentStatus !== "paid" ? owed : 0);
  }, 0);
  const totalRemainingUSD  = usdToIqd > 0 ? totalRemaining / usdToIqd : 0;
  const totalProfit        = totalSellIQD - totalDeliveryIQD - totalPurchaseIQD;
  const totalProfitUSD     = usdToIqd > 0 ? totalProfit / usdToIqd : 0;
  const allDeliveryGroups  = Object.entries(
    allOrders.reduce((acc, o) => {
      if (o.deliveryCost > 0) { const k = String(o.deliveryCost); acc[k] = (acc[k] || 0) + 1; }
      return acc;
    }, {} as Record<string, number>)
  ).sort(([a], [b]) => Number(b) - Number(a));

  return (
    <div className="pb-8" dir="rtl">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {/* TRY cost + IQD + USD faint */}
        <div className="rounded-2xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
            <TrendingDown size={12} />إجمالي التكلفة
          </div>
          <span className="text-base font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{formatTRY(totalPurchaseTRY)}</span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>≈ {num(Math.round(totalPurchaseIQD))} IQD</span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)", opacity: 0.6 }}>≈ {formatUSD(Math.round(totalPurchaseUSD * 100) / 100)}</span>
        </div>

        {/* Delivery fees + USD + breakdown */}
        <div className="rounded-2xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
            <MapPin size={12} />إجمالي التوصيل
          </div>
          <span className="text-base font-bold tabular-nums" style={{ color: "#f59e0b" }}>{num(Math.round(totalDeliveryIQD))} IQD</span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)", opacity: 0.6 }}>≈ {formatUSD(Math.round(totalDeliveryUSD * 100) / 100)}</span>
          {allDeliveryGroups.map(([cost, count]) => (
            <span key={cost} className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
              {num(Number(cost))} × {count} طلب
            </span>
          ))}
        </div>

        {/* IQD selling + USD faint */}
        <div className="rounded-2xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
            <Wallet size={12} />إجمالي البيع
          </div>
          <span className="text-base font-bold tabular-nums" style={{ color: "#22c55e" }}>{num(totalSellIQD)} IQD</span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)", opacity: 0.6 }}>≈ {formatUSD(Math.round(totalSellUSD * 100) / 100)}</span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>{allOrders.length} طلب</span>
        </div>

        {/* Remaining + USD faint */}
        <div className="rounded-2xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
            <Users size={12} />المتبقي للتحصيل
          </div>
          <span className="text-base font-bold tabular-nums" style={{ color: totalRemaining > 0 ? "#ef4444" : "#22c55e" }}>
            {num(totalRemaining)} IQD
          </span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)", opacity: 0.6 }}>≈ {formatUSD(Math.round(totalRemainingUSD * 100) / 100)}</span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
            {allOrders.filter((o) => o.paymentStatus !== "paid").length} طلب غير مكتمل
          </span>
        </div>

        {/* International shipping (reference only) */}
        <div className="rounded-2xl px-4 py-3 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
            <Truck size={12} />أجرة الشحن الدولي
          </div>
          <span className="text-base font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{formatUSD(totalShippingUSD)}</span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>{batches.length} شحنة</span>
        </div>

        {/* Net profit + USD faint */}
        <div className="rounded-2xl px-4 py-3 flex flex-col gap-0.5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
            <TrendingUp size={12} />صافي الربح
          </div>
          <span className="text-base font-bold tabular-nums" style={{ color: totalProfit >= 0 ? "#22c55e" : "#ef4444" }}>
            {num(Math.round(totalProfit))} IQD
          </span>
          <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)", opacity: 0.6 }}>≈ {formatUSD(Math.round(totalProfitUSD * 100) / 100)}</span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>بيع − توصيل − تكلفة</span>
        </div>
      </div>

      {/* Per-batch cards */}
      <div className="flex flex-col gap-4">
        {batches.length === 0 ? (
          <div className="flex items-center justify-center h-40 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p style={{ color: "var(--muted)" }}>لا توجد شحنات بعد.</p>
          </div>
        ) : (
          batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              settings={settings}
              allBatches={batches}
              onOrdersChange={handleOrdersChange}
            />
          ))
        )}
      </div>
    </div>
  );
}
