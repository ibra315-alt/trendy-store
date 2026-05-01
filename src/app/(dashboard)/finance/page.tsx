"use client";

import { useState, useEffect } from "react";
import { cachedFetch } from "@/lib/fetch-cache";
import { useAuthStore } from "@/store/auth";
import { useFinanceFilterStore } from "@/store/finance-filter";
import { formatIQD, formatUSD, formatTRY } from "@/lib/utils";
import { Package } from "lucide-react";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────

interface Order {
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

// ─── Status meta ─────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  open:            { label: "مفتوحة",       bg: "rgba(59,130,246,0.1)",  color: "#60a5fa" },
  shipped:         { label: "تم الشحن",     bg: "rgba(249,115,22,0.1)",  color: "#fb923c" },
  in_distribution: { label: "قيد التوزيع",  bg: "rgba(168,85,247,0.1)",  color: "#c084fc" },
  completed:       { label: "مكتملة",       bg: "rgba(34,197,94,0.1)",   color: "#4ade80" },
};

// ─── Sub-components ───────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="px-4 py-1.5 bg-[var(--background)] border-t border-[var(--border)]">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">{text}</span>
    </div>
  );
}

function GridCell({
  label,
  primary,
  sub,
  primaryColor,
}: {
  label: string;
  primary: string;
  sub?: string;
  primaryColor?: string;
}) {
  return (
    <div className="flex flex-col px-3 py-2.5 bg-[var(--surface)]">
      <span className="text-[9px] text-[var(--muted)] leading-none mb-1.5">{label}</span>
      <span
        className="text-[13px] font-bold tabular-nums leading-none"
        style={{ color: primaryColor ?? "var(--foreground)" }}
      >
        {primary}
      </span>
      {sub && (
        <span className="text-[10px] text-[var(--muted)] tabular-nums leading-none mt-1">≈ {sub}</span>
      )}
    </div>
  );
}

function ResultCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-3 py-3 bg-[var(--surface)] text-center">
      <p className="text-[9px] text-[var(--muted)] mb-1.5 leading-tight">{label}</p>
      <p className="text-[14px] font-bold tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}

// ─── Batch Card ───────────────────────────────────────────────

function BatchFinanceCard({ batch, settings }: { batch: Batch; settings: Settings }) {
  const { usdToTry, usdToIqd } = settings;

  const totalPurchaseTRY = batch.orders.reduce((s, o) => s + o.purchaseCost, 0);
  const totalPurchaseUSD = usdToTry > 0 ? totalPurchaseTRY / usdToTry : 0;

  const totalSellIQD    = batch.orders.reduce((s, o) => s + o.sellingPrice, 0);
  const totalSellUSD    = usdToIqd > 0 ? totalSellIQD / usdToIqd : 0;

  // التوصيل: يُجمع من الزبون ويُسلَّم لشركة التوصيل — لا يدخل في حساب الربح
  const totalDeliveryIQD = batch.orders.reduce((s, o) => s + o.deliveryCost, 0);

  const totalDepositIQD  = batch.orders.reduce((s, o) => s + o.deposit, 0);
  const totalDepositUSD  = usdToIqd > 0 ? totalDepositIQD / usdToIqd : 0;

  // التكاليف الفعلية للمتجر (بدون التوصيل لأنه يذهب لشركة التوصيل)
  const totalCostsUSD =
    totalPurchaseUSD + batch.shippingCost + batch.promotionCost + batch.expenses;
  const netProfitUSD = totalSellUSD - totalCostsUSD;

  const sm = STATUS_META[batch.status] ?? STATUS_META.completed;

  return (
    <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--surface)]">

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid var(--border)", borderTop: `3px solid ${sm.color}` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: sm.bg }}
          >
            <Package size={14} style={{ color: sm.color }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--foreground)] truncate">{batch.name}</p>
            <p className="text-[11px] text-[var(--muted)] mt-0.5">
              {batch._count.orders} طلب
              {batch.closeDate && <span className="font-mono"> · {format(new Date(batch.closeDate), "dd/MM/yyyy")}</span>}
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

      {/* ── الشراء والبيع ── */}
      <SectionLabel text="الشراء والبيع" />
      <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
        <GridCell label="إجمالي الشراء" primary={formatTRY(totalPurchaseTRY)} sub={formatUSD(totalPurchaseUSD)} />
        <GridCell label="إجمالي البيع"  primary={formatIQD(totalSellIQD)}     sub={formatUSD(totalSellUSD)} primaryColor="#4ade80" />
      </div>

      {/* ── التكاليف بالدولار ── */}
      <SectionLabel text="تكاليف ثابتة" />
      <div className="grid grid-cols-3 gap-px bg-[var(--border)]">
        <GridCell label="الشحن"     primary={formatUSD(batch.shippingCost)}   />
        <GridCell label="الترويج"   primary={formatUSD(batch.promotionCost)}  />
        <GridCell label="المصاريف"  primary={formatUSD(batch.expenses)}       />
      </div>

      {/* ── التكاليف بالدينار ── */}
      <SectionLabel text="تكاليف متغيرة" />
      <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
        <GridCell label="التوصيل" primary={formatIQD(totalDeliveryIQD)} />
        <GridCell label="العربون" primary={formatIQD(totalDepositIQD)}  sub={formatUSD(totalDepositUSD)}  />
      </div>

      {/* ── النتيجة ── */}
      <SectionLabel text="النتيجة" />
      <div className="grid grid-cols-3 gap-px bg-[var(--border)]">
        <ResultCell label="إجمالي المبيعات" value={formatUSD(totalSellUSD)}    color="#60a5fa" />
        <ResultCell label="إجمالي التكاليف" value={formatUSD(totalCostsUSD)}   color="#f87171" />
        <ResultCell label="صافي الربح"       value={formatUSD(netProfitUSD)}    color={netProfitUSD >= 0 ? "#4ade80" : "#f87171"} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function FinancePage() {
  const { isAdmin } = useAuthStore();
  const { statusFilter, search } = useFinanceFilterStore();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [batchesRes, settingsRes] = await Promise.all([
          cachedFetch("/api/batches"),
          cachedFetch("/api/settings"),
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
        <p className="text-sm text-[var(--muted)]">صلاحية المسؤول مطلوبة.</p>
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-sm text-[var(--muted)]">جاري تحميل البيانات...</p>
      </div>
    );
  }

  const filtered = batches
    .filter((b) => statusFilter === "all" || b.status === statusFilter)
    .filter((b) => !search || b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 pb-8" dir="rtl">
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-48 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <p className="text-sm text-[var(--muted)]">لا توجد شحنات مطابقة.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {filtered.map((batch) => (
            <BatchFinanceCard key={batch.id} batch={batch} settings={settings} />
          ))}
        </div>
      )}
    </div>
  );
}
