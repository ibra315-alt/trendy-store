"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Box, X, MessageCircle, Pencil,
  ArrowRightLeft, Package, ChevronDown,
} from "lucide-react";
import { formatIQD } from "@/lib/utils";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────

const PENDING_STATUSES = ["new", "in_progress", "bought", "shipped"] as const;

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  new:         { label: "جديد",        color: "#60a5fa", bg: "rgba(59,130,246,0.10)" },
  in_progress: { label: "قيد التنفيذ", color: "#fbbf24", bg: "rgba(251,191,36,0.10)" },
  bought:      { label: "تم الشراء",   color: "#c084fc", bg: "rgba(192,132,252,0.10)" },
  shipped:     { label: "تم الشحن",    color: "#818cf8", bg: "rgba(129,140,248,0.10)" },
};

const ALL_STATUSES = [
  { value: "new",         label: "جديد",        color: "#60a5fa" },
  { value: "in_progress", label: "قيد التنفيذ", color: "#fbbf24" },
  { value: "bought",      label: "تم الشراء",   color: "#c084fc" },
  { value: "shipped",     label: "تم الشحن",    color: "#818cf8" },
  { value: "delivered",   label: "تم التسليم",  color: "#4ade80" },
  { value: "cancelled",   label: "ملغي",         color: "#f87171" },
];

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
  customer: { name: string; phone: string };
  batch: { id: string; name: string } | null;
}

interface Batch {
  id: string;
  name: string;
}

// ─── Order Detail Sheet ───────────────────────────────────────

function OrderSheet({
  order,
  onClose,
  onStatusChange,
}: {
  order: Order;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const router = useRouter();
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [saving, setSaving] = useState(false);

  const meta = STATUS_META[order.status] ?? { label: order.status, color: "#999", bg: "rgba(150,150,150,0.1)" };
  const remaining = order.sellingPrice - order.deposit;
  const phone = order.customer.phone?.replace(/\D/g, "");

  useEffect(() => {
    if (showBatchPicker && batches.length === 0) {
      fetch("/api/batches").then((r) => r.json()).then(setBatches).catch(() => {});
    }
  }, [showBatchPicker, batches.length]);

  async function changeStatus(newStatus: string) {
    setSaving(true);
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onStatusChange(order.id, newStatus);
      setShowStatusPicker(false);
    } finally {
      setSaving(false);
    }
  }

  async function moveToBatch(batchId: string) {
    setSaving(true);
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      setShowBatchPicker(false);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          maxHeight: "85dvh",
          overflowY: "auto",
        }}
        dir="rtl"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-3">
          <div>
            <p className="text-base font-bold text-[var(--foreground)]">{order.customer.name}</p>
            {order.customer.phone && (
              <p className="text-xs text-[var(--muted)] mt-0.5 tabular-nums">{order.customer.phone}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Details grid */}
        <div className="px-5 pb-2">
          <div className="grid grid-cols-2 gap-px rounded-2xl overflow-hidden bg-[var(--border)]">
            <InfoCell label="المنتج"   value={order.productName || order.productType} />
            <InfoCell label="الحالة"   value={meta.label} valueColor={meta.color} />
            <InfoCell label="سعر البيع" value={formatIQD(order.sellingPrice)} valueColor="#c9a84c" />
            <InfoCell label="العربون"  value={formatIQD(order.deposit)} />
            <InfoCell label="المتبقي"  value={formatIQD(remaining)} valueColor={remaining > 0 ? "#f87171" : "#4ade80"} />
            <InfoCell label="التوصيل"  value={formatIQD(order.deliveryCost)} />
            {order.color && <InfoCell label="اللون" value={order.color} />}
            {order.size  && <InfoCell label="المقاس" value={order.size} />}
            {order.batch && <InfoCell label="الشحنة" value={order.batch.name} />}
            <InfoCell label="التاريخ" value={format(new Date(order.createdAt), "dd/MM/yyyy")} />
          </div>

          {order.notes && (
            <div className="mt-3 px-3 py-2.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)]">
              <p className="text-[11px] text-[var(--muted)] mb-1">ملاحظات</p>
              <p className="text-sm text-[var(--foreground)]">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Status picker */}
        {showStatusPicker && (
          <div className="mx-5 mb-3 rounded-2xl overflow-hidden border border-[var(--border)]">
            {ALL_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => changeStatus(s.value)}
                disabled={saving || s.value === order.status}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer"
                style={{
                  background: s.value === order.status ? s.color + "18" : "var(--surface)",
                  color: s.value === order.status ? s.color : "var(--foreground)",
                  borderBottom: "1px solid var(--border)",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                {s.label}
                {s.value === order.status && <span className="mr-auto text-[10px] text-[var(--muted)]">الحالية</span>}
              </button>
            ))}
          </div>
        )}

        {/* Batch picker */}
        {showBatchPicker && (
          <div className="mx-5 mb-3 rounded-2xl overflow-hidden border border-[var(--border)]">
            {batches.map((b) => (
              <button
                key={b.id}
                onClick={() => moveToBatch(b.id)}
                disabled={saving || b.id === order.batch?.id}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors cursor-pointer"
                style={{
                  background: b.id === order.batch?.id ? "rgba(201,168,76,0.1)" : "var(--surface)",
                  color: b.id === order.batch?.id ? "#c9a84c" : "var(--foreground)",
                  borderBottom: "1px solid var(--border)",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                <Package size={13} className="shrink-0 text-[var(--muted)]" />
                {b.name}
                {b.id === order.batch?.id && <span className="mr-auto text-[10px] text-[var(--muted)]">الحالية</span>}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 px-5 pb-6 pt-1">
          {/* WhatsApp */}
          {phone && (
            <a
              href={`https://wa.me/${phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: "rgba(37,211,102,0.12)", color: "#25d366", border: "1px solid rgba(37,211,102,0.25)" }}
            >
              <MessageCircle size={15} strokeWidth={2} />
              واتساب
            </a>
          )}

          {/* Edit */}
          <button
            onClick={() => { router.push("/orders"); onClose(); }}
            className="flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80 cursor-pointer"
            style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}
          >
            <Pencil size={14} strokeWidth={2} />
            تعديل
          </button>

          {/* Change status */}
          <button
            onClick={() => { setShowStatusPicker((v) => !v); setShowBatchPicker(false); }}
            className="flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80 cursor-pointer"
            style={{ background: "var(--surface-secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          >
            <ChevronDown size={14} strokeWidth={2} />
            تغيير الحالة
          </button>

          {/* Move to batch */}
          <button
            onClick={() => { setShowBatchPicker((v) => !v); setShowStatusPicker(false); }}
            className="flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80 cursor-pointer"
            style={{ background: "var(--surface-secondary)", color: "var(--foreground)", border: "1px solid var(--border)" }}
          >
            <ArrowRightLeft size={14} strokeWidth={2} />
            نقل لشحنة
          </button>
        </div>
      </div>
    </>
  );
}

function InfoCell({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex flex-col px-3 py-2.5 bg-[var(--surface)]">
      <span className="text-[10px] text-[var(--muted)] leading-none mb-1">{label}</span>
      <span className="text-[13px] font-semibold leading-tight tabular-nums"
        style={{ color: valueColor ?? "var(--foreground)" }}>
        {value}
      </span>
    </div>
  );
}

// ─── Tab: Pending Orders ─────────────────────────────────────

function PendingTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data: Order[]) =>
        setOrders(data.filter((o) => PENDING_STATUSES.includes(o.status as typeof PENDING_STATUSES[number])))
      )
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleStatusChange(id: string, newStatus: string) {
    setOrders((prev) =>
      PENDING_STATUSES.includes(newStatus as typeof PENDING_STATUSES[number])
        ? prev.map((o) => o.id === id ? { ...o, status: newStatus } : o)
        : prev.filter((o) => o.id !== id)
    );
    setSelected((prev) => prev?.id === id ? { ...prev, status: newStatus } : prev);
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
    <>
      <div className="space-y-5">
        {PENDING_STATUSES.map((status) => {
          const group = grouped[status];
          if (!group?.length) return null;
          const meta = STATUS_META[status];
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
                <span className="text-[11px] text-[var(--muted)] tabular-nums">{group.length}</span>
              </div>
              <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
                {group.map((order, i) => (
                  <div
                    key={order.id}
                    onClick={() => setSelected(order)}
                    className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)] cursor-pointer hover:bg-[var(--surface-secondary)] active:scale-[0.99] transition-all"
                    style={{ borderBottom: i < group.length - 1 ? "1px solid var(--border)" : "none" }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                    <p className="flex-1 text-sm font-semibold text-[var(--foreground)] truncate">
                      {order.customer.name}
                    </p>
                    {order.batch && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0"
                        style={{ background: "var(--surface-secondary)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                        {order.batch.name}
                      </span>
                    )}
                    <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: "#c9a84c" }}>
                      {formatIQD(order.sellingPrice)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <OrderSheet
          order={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
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

// ─── Tabs bar ─────────────────────────────────────────────────

const TABS = [
  { id: "pending",   label: "المعلق" },
  { id: "warehouse", label: "المخزن" },
];

// ─── Page ─────────────────────────────────────────────────────

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
