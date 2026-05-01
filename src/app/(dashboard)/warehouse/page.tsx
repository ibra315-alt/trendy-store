"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Box, MessageCircle, Pencil,
  ArrowRightLeft, Trash2, Instagram,
} from "lucide-react";
import { formatIQD } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────

const PENDING_STATUSES = ["new", "in_progress", "bought", "shipped"] as const;

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  new:         { label: "جديد",        color: "#60a5fa", bg: "rgba(59,130,246,0.10)" },
  in_progress: { label: "قيد التنفيذ", color: "#fbbf24", bg: "rgba(251,191,36,0.10)" },
  bought:      { label: "تم الشراء",   color: "#c084fc", bg: "rgba(192,132,252,0.10)" },
  shipped:     { label: "تم الشحن",    color: "#818cf8", bg: "rgba(129,140,248,0.10)" },
};

interface Order {
  id: string;
  status: string;
  sellingPrice: number;
  deposit: number;
  deliveryCost: number;
  productName: string | null;
  productType: string;
  color: string | null;
  size: string | null;
  notes: string | null;
  createdAt: string;
  customer: { name: string; phone: string; instagram: string | null };
  batch: { id: string; name: string } | null;
}

// ─── Action button ────────────────────────────────────────────

function ActionBtn({
  icon: Icon,
  label,
  color,
  bg,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className="flex flex-col items-center gap-1 cursor-pointer"
    >
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center transition-opacity hover:opacity-75"
        style={{ background: bg, border: `1px solid ${color}30` }}
      >
        <Icon size={16} strokeWidth={1.8} style={{ color }} />
      </div>
      <span className="text-[9px] font-medium" style={{ color: "var(--muted)" }}>{label}</span>
    </button>
  );
}

// ─── Order Row ────────────────────────────────────────────────

function OrderRow({
  order,
  isLast,
  onDeleted,
  onStatusChange,
}: {
  order: Order;
  isLast: boolean;
  onDeleted: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const meta = STATUS_META[order.status] ?? { label: order.status, color: "#999", bg: "rgba(150,150,150,0.1)" };
  const phone = order.customer.phone?.replace(/\D/g, "");
  const productLabel = [order.productName, order.color, order.size].filter(Boolean).join(" · ") || order.productType;

  async function handleDelete() {
    if (!confirm("هل تريد حذف هذا الطلب؟")) return;
    setDeleting(true);
    try {
      await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
      onDeleted(order.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
      {/* Main row */}
      <div
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)] cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors"
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
        <p className="flex-1 text-sm font-semibold text-[var(--foreground)] truncate">
          {order.customer.name}
        </p>
        {order.batch && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
            style={{ background: "var(--surface-secondary)", color: "var(--muted)", border: "1px solid var(--border)" }}
          >
            {order.batch.name}
          </span>
        )}
        <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: "#c9a84c" }}>
          {formatIQD(order.sellingPrice)}
        </span>
      </div>

      {/* Expanded panel */}
      {open && (
        <div
          className="px-4 py-3 flex flex-col gap-3"
          style={{ background: "var(--background)", borderTop: "1px solid var(--border)" }}
        >
          {/* Info chips */}
          <div className="flex flex-wrap gap-2">
            <Chip label="المنتج"  value={productLabel} />
            <Chip label="الحالة"  value={meta.label} valueColor={meta.color} />
            {order.customer.instagram && (
              <Chip label="انستقرام" value={`@${order.customer.instagram}`} />
            )}
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-4 pt-1">
            {phone && (
              <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}>
                <ActionBtn icon={MessageCircle} label="واتساب" color="#25d366" bg="rgba(37,211,102,0.12)" />
              </a>
            )}
            {order.customer.instagram && (
              <a href={`https://instagram.com/${order.customer.instagram}`} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}>
                <ActionBtn icon={Instagram} label="انستقرام" color="#e1306c" bg="rgba(225,48,108,0.12)" />
              </a>
            )}
            <ActionBtn
              icon={Pencil}
              label="تعديل"
              color="#c9a84c"
              bg="rgba(201,168,76,0.12)"
              onClick={() => router.push("/orders")}
            />
            <ActionBtn
              icon={ArrowRightLeft}
              label="نقل"
              color="#60a5fa"
              bg="rgba(59,130,246,0.12)"
              onClick={() => router.push("/orders")}
            />
            <ActionBtn
              icon={Trash2}
              label={deleting ? "..." : "حذف"}
              color="#f87171"
              bg="rgba(248,113,113,0.12)"
              onClick={handleDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <span className="text-[10px] text-[var(--muted)]">{label}:</span>
      <span className="text-[11px] font-semibold" style={{ color: valueColor ?? "var(--foreground)" }}>
        {value}
      </span>
    </div>
  );
}

// ─── Tab: Pending Orders ─────────────────────────────────────

function PendingTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data: Order[]) =>
        setOrders(data.filter((o) => PENDING_STATUSES.includes(o.status as typeof PENDING_STATUSES[number])))
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleDeleted(id: string) {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }

  function handleStatusChange(id: string, newStatus: string) {
    setOrders((prev) =>
      PENDING_STATUSES.includes(newStatus as typeof PENDING_STATUSES[number])
        ? prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
        : prev.filter((o) => o.id !== id)
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-sm text-[var(--muted)]">جاري التحميل...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <AlertCircle size={32} strokeWidth={1.5} className="text-[var(--muted)]" />
        <p className="text-sm text-[var(--muted)]">لا توجد طلبات معلقة</p>
      </div>
    );
  }

  const grouped = PENDING_STATUSES.reduce<Record<string, Order[]>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {PENDING_STATUSES.map((status) => {
        const group = grouped[status];
        if (!group?.length) return null;
        const meta = STATUS_META[status];
        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
              <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
              <span className="text-[11px] text-[var(--muted)]">{group.length}</span>
            </div>
            <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
              {group.map((order, i) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  isLast={i === group.length - 1}
                  onDeleted={handleDeleted}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab: Warehouse ───────────────────────────────────────────

function WarehouseTab() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <Box size={36} strokeWidth={1.2} className="text-[var(--muted)]" />
      <p className="text-sm font-semibold text-[var(--foreground)]">المخزن</p>
      <p className="text-xs text-[var(--muted)] text-center max-w-[220px]">
        قريباً — إدارة المخزون وتتبع المنتجات
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

const TABS = [
  { id: "pending",   label: "المعلق" },
  { id: "warehouse", label: "المخزن" },
];

export default function WarehousePage() {
  const [activeTab, setActiveTab] = useState("pending");

  return (
    <div className="space-y-4 pb-8" dir="rtl">
      <div className="flex gap-1 p-1 rounded-2xl bg-[var(--surface)]" style={{ border: "1px solid var(--border)" }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
              style={{
                background: active ? "#c9a84c" : "transparent",
                color: active ? "#111111" : "var(--muted)",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "pending"   && <PendingTab />}
      {activeTab === "warehouse" && <WarehouseTab />}
    </div>
  );
}
