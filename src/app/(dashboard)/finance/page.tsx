"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { formatIQD, formatUSD, formatTRY } from "@/lib/utils";
import { Package } from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────

interface Order {
  id: string;
  purchaseCost: number;
  sellingPrice: number;
  deliveryCost: number;
  deposit: number;
}

interface Batch {
  id: string;
  name: string;
  status: string;
  closeDate: string | null;
  shippingCost: number;
  promotionCost: number;
  expenses: number;
  orders: Order[];
  _count: { orders: number };
}

interface Settings {
  usdToTry: number;
  usdToIqd: number;
}

// ─── Constants ────────────────────────────────────────────────

const GOLD = "#c9a84c";
const GOLD_DIM = "rgba(201,168,76,0.12)";

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  shipped:         { label: "تم الشحن",    bg: "rgba(249,115,22,0.12)",  color: "#fb923c" },
  in_distribution: { label: "قيد التوزيع", bg: "rgba(168,85,247,0.12)",  color: "#c084fc" },
  completed:       { label: "مكتملة",       bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
};

// ─── Sub-components ───────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="px-4 py-2 border-b border-[var(--border)] bg-[var(--background)]">
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>
        {title}
      </span>
    </div>
  );
}

function DataRow({
  label,
  primary,
  secondary,
  primaryColor,
}: {
  label: string;
  primary: string;
  secondary?: string;
  primaryColor?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] last:border-b-0">
      <span className="text-[12px] text-[var(--muted)]">{label}</span>
      <div className="text-left">
        <span
          className="text-[13px] font-semibold tabular-nums"
          style={{ color: primaryColor ?? "var(--foreground)" }}
        >
          {primary}
        </span>
        {secondary && (
          <span className="block text-[10px] text-[var(--muted)] tabular-nums mt-0.5">{secondary}</span>
        )}
      </div>
    </div>
  );
}

function ResultBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-3 py-4 text-center bg-[var(--surface)]">
      <p className="text-[10px] text-[var(--muted)] mb-1.5 leading-tight">{label}</p>
      <p className="text-[15px] font-bold tabular-nums leading-tight" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

// ─── Batch Finance Card ───────────────────────────────────────

function BatchFinanceCard({ batch, settings }: { batch: Batch; settings: Settings }) {
  const { usdToTry, usdToIqd } = settings;

  // Purchases & Sales
  const totalPurchaseTRY = batch.orders.reduce((s, o) => s + o.purchaseCost, 0);
  const totalPurchaseUSD = usdToTry > 0 ? totalPurchaseTRY / usdToTry : 0;

  const totalSellIQD = batch.orders.reduce((s, o) => s + o.sellingPrice, 0);
  const totalSellUSD = usdToIqd > 0 ? totalSellIQD / usdToIqd : 0;

  // Costs
  const totalDeliveryIQD = batch.orders.reduce((s, o) => s + o.deliveryCost, 0);
  const totalDeliveryUSD = usdToIqd > 0 ? totalDeliveryIQD / usdToIqd : 0;

  const totalDepositIQD = batch.orders.reduce((s, o) => s + o.deposit, 0);
  const totalDepositUSD = usdToIqd > 0 ? totalDepositIQD / usdToIqd : 0;

  // Result
  const totalCostsUSD =
    totalPurchaseUSD +
    batch.shippingCost +
    batch.promotionCost +
    batch.expenses +
    totalDeliveryUSD;

  const netProfitUSD = totalSellUSD - totalCostsUSD;

  const sm = STATUS_META[batch.status] ?? { label: batch.status, bg: "rgba(100,100,100,0.12)", color: "#9ca3af" };

  return (
    <div
      className="rounded-2xl border border-[var(--border)] overflow-hidden"
      style={{ background: "var(--surface)" }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]"
        style={{ borderTop: `3px solid ${sm.color}` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: GOLD_DIM }}
          >
            <Package size={16} style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--foreground)]">{batch.name}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5 font-mono">
              {batch._count.orders} طلب
              {batch.closeDate && (
                <span> · {format(new Date(batch.closeDate), "dd/MM/yyyy")}</span>
              )}
            </p>
          </div>
        </div>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
          style={{ background: sm.bg, color: sm.color }}
        >
          {sm.label}
        </span>
      </div>

      {/* ── Section 1: المشتريات والمبيعات ── */}
      <SectionTitle title="المشتريات والمبيعات" />
      <div>
        <DataRow
          label="إجمالي الشراء"
          primary={formatTRY(totalPurchaseTRY)}
          secondary={`≈ ${formatUSD(totalPurchaseUSD)}`}
        />
        <DataRow
          label="إجمالي البيع"
          primary={formatIQD(totalSellIQD)}
          secondary={`≈ ${formatUSD(totalSellUSD)}`}
          primaryColor="#4ade80"
        />
      </div>

      {/* ── Section 2: التكاليف ── */}
      <SectionTitle title="التكاليف" />
      <div>
        <DataRow label="تكلفة الشحن" primary={formatUSD(batch.shippingCost)} />
        <DataRow label="تكلفة الترويج" primary={formatUSD(batch.promotionCost)} />
        <DataRow label="المصاريف" primary={formatUSD(batch.expenses)} />
        <DataRow
          label="إجمالي التوصيل"
          primary={formatIQD(totalDeliveryIQD)}
          secondary={`≈ ${formatUSD(totalDeliveryUSD)}`}
        />
        <DataRow
          label="إجمالي العربون"
          primary={formatIQD(totalDepositIQD)}
          secondary={`≈ ${formatUSD(totalDepositUSD)}`}
        />
      </div>

      {/* ── Section 3: النتيجة ── */}
      <SectionTitle title="النتيجة" />
      <div className="grid grid-cols-3 gap-px bg-[var(--border)]">
        <ResultBox
          label="إجمالي المبيعات"
          value={formatUSD(totalSellUSD)}
          color="#4ade80"
        />
        <ResultBox
          label="إجمالي التكاليف"
          value={formatUSD(totalCostsUSD)}
          color="#f87171"
        />
        <ResultBox
          label="صافي الربح"
          value={formatUSD(netProfitUSD)}
          color={netProfitUSD >= 0 ? "#4ade80" : "#f87171"}
        />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

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
        /* ignore */
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-[var(--muted)] text-sm">صلاحية المسؤول مطلوبة.</p>
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-[var(--muted)] text-sm">جاري تحميل البيانات...</p>
      </div>
    );
  }

  const closedBatches = batches.filter((b) => b.status !== "open");

  return (
    <div className="space-y-4 pb-8" dir="rtl">
      <h1 className="text-xl font-bold" style={{ color: GOLD }}>المالية</h1>

      {closedBatches.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <p className="text-sm text-[var(--muted)]">لا توجد شحنات مغلقة بعد.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {closedBatches.map((batch) => (
            <BatchFinanceCard key={batch.id} batch={batch} settings={settings} />
          ))}
        </div>
      )}
    </div>
  );
}
