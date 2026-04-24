"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { formatIQD, formatUSD, formatTRY } from "@/lib/utils";
import { ChevronDown, Users, Truck, TrendingDown, Wallet, MessageCircle } from "lucide-react";

interface Order {
  id: string;
  productName: string;
  sellingPrice: number;
  purchaseCost: number;
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

function num(n: number) {
  return n.toLocaleString("en-IQ");
}

function InfoRow({ label, value, sub, valueColor }: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px]" style={{ color: "var(--muted)" }}>{label}</span>
      <span className="text-sm font-semibold tabular-nums" style={{ color: valueColor ?? "var(--foreground)" }}>{value}</span>
      {sub && <span className="text-[10px]" style={{ color: "var(--muted)" }}>{sub}</span>}
    </div>
  );
}

function BatchCard({ batch, settings }: { batch: Batch; settings: Settings }) {
  const [open, setOpen] = useState(false);
  const { usdToIqd, tryToIqd } = settings;

  const totalPurchaseTRY = batch.orders.reduce((s, o) => s + o.purchaseCost, 0);
  const totalSellIQD = batch.orders.reduce((s, o) => s + o.sellingPrice, 0);
  const totalDeposit = batch.orders.reduce((s, o) => s + o.deposit, 0);
  const totalRemaining = batch.orders.reduce((s, o) => {
    const owed = o.sellingPrice - o.deposit;
    return s + (owed > 0 && o.paymentStatus !== "paid" ? owed : 0);
  }, 0);

  const shippingIQD = batch.shippingCost * usdToIqd;
  const purchaseIQD = totalPurchaseTRY * tryToIqd;
  const profit = totalSellIQD - purchaseIQD - shippingIQD;

  const unpaidOrders = batch.orders.filter((o) => {
    const owed = o.sellingPrice - o.deposit;
    return owed > 0 && o.paymentStatus !== "paid";
  });

  const statusColor = STATUS_COLOR[batch.status] ?? "#6b7280";
  const statusLabel = STATUS_LABEL[batch.status] ?? batch.status;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{batch.name}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: statusColor + "22", color: statusColor }}>
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {new Date(batch.openDate).toLocaleDateString("ar-IQ", { day: "numeric", month: "short" })}
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted)" }}>
            <Users size={12} />
            {batch.orders.length}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-px" style={{ background: "var(--border)" }}>
        {/* Shipping */}
        <div className="px-4 py-3" style={{ background: "var(--surface)" }}>
          <InfoRow
            label="أجرة الشحن"
            value={`${num(Math.round(shippingIQD))} IQD`}
            sub={`${formatUSD(batch.shippingCost)} × ${num(usdToIqd)}`}
          />
        </div>

        {/* Purchase cost TRY */}
        <div className="px-4 py-3" style={{ background: "var(--surface)" }}>
          <InfoRow
            label="مجموع الليرة (تكلفة)"
            value={formatTRY(totalPurchaseTRY)}
            sub={`≈ ${num(Math.round(purchaseIQD))} IQD`}
          />
        </div>

        {/* Selling total IQD */}
        <div className="px-4 py-3" style={{ background: "var(--surface)" }}>
          <InfoRow
            label="مجموع الدينار (بيع)"
            value={`${num(totalSellIQD)} IQD`}
          />
        </div>

        {/* Deposit collected */}
        <div className="px-4 py-3" style={{ background: "var(--surface)" }}>
          <InfoRow
            label="العربون المحصل"
            value={`${num(totalDeposit)} IQD`}
            valueColor="#22c55e"
          />
        </div>

        {/* Remaining */}
        <div className="px-4 py-3" style={{ background: "var(--surface)" }}>
          <InfoRow
            label="المتبقي للتحصيل"
            value={`${num(totalRemaining)} IQD`}
            valueColor={totalRemaining > 0 ? "#ef4444" : "#22c55e"}
          />
        </div>

        {/* Profit estimate */}
        <div className="px-4 py-3" style={{ background: "var(--surface)" }}>
          <InfoRow
            label="الربح التقديري"
            value={`${num(Math.round(profit))} IQD`}
            valueColor={profit >= 0 ? "#22c55e" : "#ef4444"}
            sub="بيع − تكلفة − شحن"
          />
        </div>
      </div>

      {/* Unpaid customers toggle */}
      {unpaidOrders.length > 0 && (
        <div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors hover:brightness-110"
            style={{ color: "#ef4444", background: "rgba(239,68,68,0.06)", borderTop: "1px solid var(--border)" }}
          >
            <span>{unpaidOrders.length} زبون لم يكمل الدفع — متبقي {num(totalRemaining)} IQD</span>
            <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
          </button>

          {open && (
            <div className="divide-y" style={{ borderTop: "1px solid var(--border)", borderColor: "var(--border)" }}>
              {unpaidOrders.map((o) => {
                const owed = o.sellingPrice - o.deposit;
                const phone = o.customer?.phone ?? o.phone ?? "";
                const wa = phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : null;
                return (
                  <div key={o.id} className="flex items-center justify-between px-4 py-2.5" dir="rtl">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                        {o.customer?.name ?? "غير معروف"}
                      </span>
                      <span className="text-[11px] truncate" style={{ color: "var(--muted)" }}>{o.productName}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-sm font-bold tabular-nums" style={{ color: "#ef4444" }}>{num(owed)} IQD</span>
                        <span className="text-[10px] tabular-nums" style={{ color: "var(--muted)" }}>
                          {o.paymentStatus === "partial" ? `عربون: ${num(o.deposit)} IQD` : "بدون عربون"}
                        </span>
                      </div>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center w-8 h-8 rounded-xl transition-colors hover:brightness-110"
                          style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                          <MessageCircle size={14} />
                        </a>
                      )}
                    </div>
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

  // Overall totals across all batches
  const allOrders = batches.flatMap((b) => b.orders);
  const totalShippingUSD = batches.reduce((s, b) => s + b.shippingCost, 0);
  const totalShippingIQD = totalShippingUSD * usdToIqd;
  const totalPurchaseTRY = allOrders.reduce((s, o) => s + o.purchaseCost, 0);
  const totalSellIQD = allOrders.reduce((s, o) => s + o.sellingPrice, 0);
  const totalRemaining = allOrders.reduce((s, o) => {
    const owed = o.sellingPrice - o.deposit;
    return s + (owed > 0 && o.paymentStatus !== "paid" ? owed : 0);
  }, 0);

  return (
    <div className="pb-8" dir="rtl">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl px-4 py-3 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
            <Truck size={12} />
            إجمالي الشحن
          </div>
          <span className="text-base font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{num(Math.round(totalShippingIQD))} IQD</span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>{formatUSD(totalShippingUSD)} — {batches.length} شحنة</span>
        </div>

        <div className="rounded-2xl px-4 py-3 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
            <TrendingDown size={12} />
            إجمالي التكلفة
          </div>
          <span className="text-base font-bold tabular-nums" style={{ color: "var(--foreground)" }}>{formatTRY(totalPurchaseTRY)}</span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>≈ {num(Math.round(totalPurchaseTRY * tryToIqd))} IQD</span>
        </div>

        <div className="rounded-2xl px-4 py-3 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
            <Wallet size={12} />
            إجمالي البيع
          </div>
          <span className="text-base font-bold tabular-nums" style={{ color: "#22c55e" }}>{num(totalSellIQD)} IQD</span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>{allOrders.length} طلب</span>
        </div>

        <div className="rounded-2xl px-4 py-3 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--muted)" }}>
            <Users size={12} />
            المتبقي للتحصيل
          </div>
          <span className="text-base font-bold tabular-nums" style={{ color: totalRemaining > 0 ? "#ef4444" : "#22c55e" }}>
            {num(totalRemaining)} IQD
          </span>
          <span className="text-[10px]" style={{ color: "var(--muted)" }}>
            {allOrders.filter((o) => o.paymentStatus !== "paid").length} طلب غير مكتمل
          </span>
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
            <BatchCard key={batch.id} batch={batch} settings={settings} />
          ))
        )}
      </div>
    </div>
  );
}
