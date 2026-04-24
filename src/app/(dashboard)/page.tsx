"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Clock,
  TrendingUp,
  AlertCircle,
  Package,
  ArrowLeft,
} from "lucide-react";
import { formatIQD } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

// ─── constants ───────────────────────────────────────────────
const GOLD = "#c9a84c";
const GOLD_DIM = "rgba(201,168,76,0.14)";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  Bag: "حقيبة",
  Shoe: "حذاء",
  Clothing: "ملابس",
  Accessory: "إكسسوار",
  Other: "أخرى",
};

const STATUS_META: Record<string, { label: string; bg: string; color: string; donut: string }> = {
  new:         { label: "جديد",        bg: "rgba(59,130,246,0.13)",  color: "#60a5fa", donut: "#60a5fa" },
  in_progress: { label: "قيد التنفيذ", bg: "rgba(245,158,11,0.13)",  color: "#fbbf24", donut: "#fbbf24" },
  bought:      { label: "تم الشراء",   bg: "rgba(168,85,247,0.13)",  color: "#c084fc", donut: "#c084fc" },
  shipped:     { label: "تم الشحن",    bg: "rgba(99,102,241,0.13)",  color: "#a5b4fc", donut: "#818cf8" },
  delivered:   { label: "تم التسليم", bg: "rgba(34,197,94,0.13)",   color: "#4ade80", donut: "#4ade80" },
  cancelled:   { label: "ملغي",        bg: "rgba(248,113,113,0.13)", color: "#f87171", donut: "#f87171" },
};

// ─── types ───────────────────────────────────────────────────
interface DailyStat {
  date: string;
  label: string;
  count: number;
  revenue: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface DashboardData {
  stats: {
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    outstandingDebts: number;
  };
  openBatch: {
    id: string;
    name: string;
    status: string;
    boughtCount: number;
    totalCount: number;
  } | null;
  recentOrders: {
    id: string;
    productName: string | null;
    productType: string;
    status: string;
    sellingPrice: number;
    createdAt: string;
    customer: { name: string };
  }[];
  unpaidDelivered: {
    id: string;
    productName: string;
    sellingPrice: number;
    deposit: number;
    customer: { name: string; phone: string };
  }[];
  dailyStats: DailyStat[];
  statusCounts: StatusCount[];
}

// ─── helpers ─────────────────────────────────────────────────
function buildArc(
  cx: number, cy: number, R: number, r: number,
  a0: number, a1: number,
): string {
  const cos = Math.cos, sin = Math.sin;
  const x1 = cx + R * cos(a0), y1 = cy + R * sin(a0);
  const x2 = cx + R * cos(a1), y2 = cy + R * sin(a1);
  const x3 = cx + r * cos(a1), y3 = cy + r * sin(a1);
  const x4 = cx + r * cos(a0), y4 = cy + r * sin(a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const f = (n: number) => n.toFixed(3);
  return `M${f(x1)},${f(y1)} A${R},${R},0,${large},1,${f(x2)},${f(y2)} L${f(x3)},${f(y3)} A${r},${r},0,${large},0,${f(x4)},${f(y4)} Z`;
}

// ─── skeleton ────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 animate-pulse">
      <div className="h-8 w-8 rounded-lg bg-[var(--surface-secondary)] mb-4" />
      <div className="h-7 w-24 rounded-lg bg-[var(--surface-secondary)] mb-2" />
      <div className="h-3 w-16 rounded-lg bg-[var(--surface-secondary)]" />
    </div>
  );
}

// ─── components ──────────────────────────────────────────────
function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-5 hover:border-[var(--accent)]/40 transition-colors duration-200">
      {/* Mobile layout: compact row */}
      <div className="flex sm:hidden items-start justify-between gap-1 mb-1">
        <div className="inline-flex w-6 h-6 items-center justify-center rounded-lg shrink-0" style={{ background: GOLD_DIM }}>
          <Icon size={12} style={{ color: GOLD }} />
        </div>
      </div>
      <p className="sm:hidden text-[15px] font-bold text-[var(--foreground)] tabular-nums leading-tight">{value}</p>
      <p className="sm:hidden text-[10px] text-[var(--muted)] font-medium mt-0.5 leading-tight">{label}</p>

      {/* Desktop layout: original */}
      <div className="hidden sm:block">
        <div className="inline-flex w-9 h-9 items-center justify-center rounded-xl mb-4" style={{ background: GOLD_DIM }}>
          <Icon size={16} style={{ color: GOLD }} />
        </div>
        <p className="text-[22px] font-bold text-[var(--foreground)] tabular-nums leading-none mb-1.5">{value}</p>
        <p className="text-xs text-[var(--muted)] font-medium">{label}</p>
      </div>
    </div>
  );
}

function DonutChart({ statusCounts }: { statusCounts: StatusCount[] }) {
  const segments = statusCounts
    .filter((s) => s.count > 0)
    .map((s) => ({
      ...s,
      label: STATUS_META[s.status]?.label ?? s.status,
      color: STATUS_META[s.status]?.donut ?? "#888",
    }))
    .sort((a, b) => b.count - a.count);

  const total = segments.reduce((s, x) => s + x.count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-[var(--muted)] text-sm">
        لا توجد بيانات
      </div>
    );
  }

  const cx = 80, cy = 80, R = 68, r = 46;
  const GAP = segments.length > 1 ? 0.05 : 0;
  let angle = -Math.PI / 2;

  const slices = segments.map((seg) => {
    const sweep = (seg.count / total) * 2 * Math.PI;
    const a0 = angle + GAP / 2;
    const a1 = angle + sweep - GAP / 2;
    angle += sweep;
    return { ...seg, d: buildArc(cx, cy, R, r, a0, a1), pct: Math.round((seg.count / total) * 100) };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
        {slices.map((s) => (
          <path key={s.status} d={s.d} fill={s.color} fillOpacity="0.88" />
        ))}
        <text x="80" y="76" textAnchor="middle" fontSize="22" fontWeight="800"
          style={{ fill: GOLD, fontFamily: "inherit" }}>{total}</text>
        <text x="80" y="93" textAnchor="middle" fontSize="11"
          style={{ fill: "var(--muted)", fontFamily: "inherit" }}>إجمالي</text>
      </svg>
      <div className="grid grid-cols-2 gap-x-5 gap-y-3 flex-1 w-full">
        {slices.map((s) => (
          <div key={s.status} className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--foreground)] leading-tight">{s.label}</p>
              <p className="text-[10px] text-[var(--muted)] tabular-nums">{s.count} · {s.pct}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyBarChart({ data }: { data: DailyStat[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalWeek = data.reduce((s, d) => s + d.count, 0);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-sm font-semibold" style={{ color: GOLD }}>آخر 7 أيام</h2>
        <span className="text-xs text-[var(--muted)] tabular-nums">{totalWeek} طلب هذا الأسبوع</span>
      </div>
      <div className="flex items-end gap-2" style={{ height: "160px" }} dir="ltr">
        {data.map((d) => {
          const barPct = d.count > 0 ? Math.max((d.count / maxCount) * 100, 8) : 3;
          const isToday = d.date === today;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
              {/* value label — always visible */}
              <span
                className="text-[11px] font-bold tabular-nums leading-none"
                style={{ color: d.count > 0 ? (isToday ? GOLD : "var(--foreground)") : "transparent" }}
              >
                {d.count > 0 ? d.count : "0"}
              </span>
              {/* bar */}
              <div className="w-full flex items-end" style={{ height: "120px" }}>
                <div
                  className="w-full rounded-t-lg transition-all duration-500"
                  style={{
                    height: `${barPct}%`,
                    background: isToday
                      ? GOLD
                      : d.count > 0
                      ? "rgba(201,168,76,0.32)"
                      : "var(--surface-secondary)",
                    boxShadow: isToday ? `0 0 12px rgba(201,168,76,0.35)` : undefined,
                  }}
                />
              </div>
              <span className="text-[10px] text-[var(--muted)] leading-none">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentOrdersList({ orders }: { orders: DashboardData["recentOrders"] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: GOLD }}>آخر الطلبات</h2>
        <a href="/orders" className="flex items-center gap-1 text-xs font-medium transition-colors duration-150" style={{ color: GOLD }}>
          عرض الكل <ArrowLeft size={12} />
        </a>
      </div>
      <div>
        {orders.slice(0, 5).map((order, i) => {
          const s = STATUS_META[order.status] ?? { label: order.status, bg: "rgba(100,100,100,0.12)", color: "#999" };
          const typeLabel = PRODUCT_TYPE_LABELS[order.productType] ?? order.productType;
          return (
            <div
              key={order.id}
              className="flex items-center gap-2 py-2.5"
              style={{ borderBottom: i < Math.min(orders.length, 5) - 1 ? "1px solid var(--border)" : "none" }}
            >
              <p className="flex-1 min-w-0 text-sm font-medium text-[var(--foreground)] truncate">
                {order.customer.name}
              </p>
              <span className="text-xs text-[var(--muted)] shrink-0 hidden sm:inline">{typeLabel}</span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ background: s.bg, color: s.color }}
              >
                {s.label}
              </span>
              <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: GOLD }}>
                {formatIQD(order.sellingPrice)}
              </span>
            </div>
          );
        })}
        {orders.length === 0 && (
          <p className="text-xs text-[var(--muted)] py-6 text-center">لا توجد طلبات حتى الآن</p>
        )}
      </div>
    </div>
  );
}

function BatchWidget({ batch, progress }: { batch: NonNullable<DashboardData["openBatch"]>; progress: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden h-full flex flex-col">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: GOLD_DIM }}>
          <Package size={16} style={{ color: GOLD }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--muted)] mb-0.5">الشحنة المفتوحة</p>
          <p className="text-sm font-semibold text-[var(--foreground)] truncate">{batch.name}</p>
        </div>
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0"
          style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
          مفتوحة
        </span>
      </div>
      <div className="px-5 py-4 flex-1 flex flex-col justify-center gap-3">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>{batch.boughtCount} من {batch.totalCount} طلب تم شراؤها</span>
          <span className="tabular-nums font-bold" style={{ color: GOLD }}>{Math.round(progress)}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: GOLD }} />
        </div>
      </div>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      setData(null);
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [retryCount]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 h-52 animate-pulse" />
          <div className="lg:col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 h-52 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 h-48 animate-pulse" />
          <div className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 h-48 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-12">
        <p className="text-[var(--muted)] text-sm">فشل تحميل البيانات</p>
        <button
          onClick={() => setRetryCount((c) => c + 1)}
          className="text-xs px-4 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--surface)] transition-colors text-[var(--foreground)]"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const { stats, openBatch } = data;
  const batchProgress =
    openBatch && openBatch.totalCount > 0
      ? (openBatch.boughtCount / openBatch.totalCount) * 100
      : 0;

  const statCards = [
    { label: "إجمالي الطلبات",  value: stats.totalOrders.toString(),     icon: ShoppingCart },
    { label: "الطلبات المعلقة", value: stats.pendingOrders.toString(),    icon: Clock },
    { label: "الإيرادات",       value: formatIQD(stats.totalRevenue),     icon: TrendingUp },
    { label: "الديون المستحقة", value: formatIQD(stats.outstandingDebts), icon: AlertCircle },
  ];

  return (
    <div className="space-y-4">

      {/* Page title */}
      <h1 className="text-xl font-bold" style={{ color: GOLD }}>الرئيسية</h1>

      {/* Row 1: Stats */}
      <div className="stagger-children grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => <StatCard key={card.label} {...card} />)}
      </div>

      {/* Row 2: Donut + Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: GOLD }}>توزيع حالات الطلبات</h2>
          <DonutChart statusCounts={data.statusCounts ?? []} />
        </div>
        <div className="lg:col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          {data.dailyStats ? (
            <WeeklyBarChart data={data.dailyStats} />
          ) : (
            <div className="h-40 flex items-center justify-center text-[var(--muted)] text-sm">لا توجد بيانات</div>
          )}
        </div>
      </div>

      {/* Row 3: Recent Orders + Open Batch */}
      <div className={`grid grid-cols-1 gap-4 ${openBatch ? "lg:grid-cols-5" : ""}`}>
        <div className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 ${openBatch ? "lg:col-span-3" : ""}`}>
          <RecentOrdersList orders={data.recentOrders} />
        </div>
        {openBatch && (
          <div className="lg:col-span-2">
            <BatchWidget batch={openBatch} progress={batchProgress} />
          </div>
        )}
      </div>

    </div>
  );
}
