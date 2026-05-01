"use client";

import { useState, useEffect } from "react";
import {
  AlertCircle, Box, MessageCircle, Pencil,
  ArrowRightLeft, Trash2, Instagram, X, Package,
} from "lucide-react";
import { formatIQD } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────

const PENDING_STATUSES = ["new", "in_progress", "bought", "shipped"] as const;

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  new:         { label: "جديد",        color: "#60a5fa", bg: "rgba(59,130,246,0.10)" },
  in_progress: { label: "قيد التنفيذ", color: "#fbbf24", bg: "rgba(251,191,36,0.10)" },
  bought:      { label: "تم الشراء",   color: "#c084fc", bg: "rgba(192,132,252,0.10)" },
  shipped:     { label: "تم الشحن",    color: "#818cf8", bg: "rgba(129,140,248,0.10)" },
  delivered:   { label: "تم التسليم", color: "#4ade80", bg: "rgba(74,222,128,0.10)" },
  cancelled:   { label: "ملغي",        color: "#f87171", bg: "rgba(248,113,113,0.10)" },
};

const PRODUCT_TYPES = [
  { value: "Bag",       label: "حقيبة" },
  { value: "Shoe",      label: "حذاء" },
  { value: "Clothing",  label: "ملابس" },
  { value: "Accessory", label: "إكسسوار" },
  { value: "Other",     label: "أخرى" },
];

const PRODUCT_TYPE_AR: Record<string, string> = Object.fromEntries(
  PRODUCT_TYPES.map((p) => [p.value, p.label])
);

// ─── Types ────────────────────────────────────────────────────

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

interface Batch {
  id: string;
  name: string;
}

// ─── Edit Sheet ───────────────────────────────────────────────

function EditSheet({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: (updated: Partial<Order>) => void;
}) {
  const [form, setForm] = useState({
    productType:  order.productType,
    color:        order.color ?? "",
    size:         order.size ?? "",
    sellingPrice: order.sellingPrice.toString(),
    deposit:      order.deposit.toString(),
    deliveryCost: order.deliveryCost.toString(),
    notes:        order.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      const body = {
        productType:  form.productType,
        color:        form.color || null,
        size:         form.size || null,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        deposit:      parseFloat(form.deposit) || 0,
        deliveryCost: parseFloat(form.deliveryCost) || 0,
        notes:        form.notes || null,
      };
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { onSaved(body); onClose(); }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", maxHeight: "88dvh", overflowY: "auto" }}
        dir="rtl"
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <p className="text-base font-bold text-[var(--foreground)]">تعديل الطلب</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-secondary)] text-[var(--muted)] cursor-pointer">
            <X size={14} />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-3">
          {/* Product type */}
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">نوع المنتج</label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_TYPES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => set("productType", p.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                  style={{
                    background: form.productType === p.value ? "#c9a84c" : "var(--surface-secondary)",
                    color: form.productType === p.value ? "#111" : "var(--muted)",
                    border: `1px solid ${form.productType === p.value ? "#c9a84c" : "var(--border)"}`,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color + Size */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="اللون" value={form.color} onChange={(v) => set("color", v)} placeholder="مثال: أسود" />
            <Field label="المقاس" value={form.size} onChange={(v) => set("size", v)} placeholder="مثال: 42" />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="سعر البيع" value={form.sellingPrice} onChange={(v) => set("sellingPrice", v)} type="number" />
            <Field label="العربون"   value={form.deposit}      onChange={(v) => set("deposit", v)}      type="number" />
            <Field label="التوصيل"  value={form.deliveryCost} onChange={(v) => set("deliveryCost", v)} type="number" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-[var(--muted)] mb-1 block">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)] outline-none focus:border-[#c9a84c] transition-colors resize-none"
              placeholder="ملاحظات..."
            />
          </div>

          {/* Save */}
          <button
            onClick={save}
            disabled={saving}
            className="w-full h-11 rounded-2xl text-sm font-bold cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#c9a84c", color: "#111" }}
          >
            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
        </div>
      </div>
    </>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--muted)] mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 rounded-xl px-3 text-sm bg-[var(--surface-secondary)] text-[var(--foreground)] border border-[var(--border)] outline-none focus:border-[#c9a84c] transition-colors"
      />
    </div>
  );
}

// ─── Action button ────────────────────────────────────────────

function ActionBtn({
  icon: Icon, label, color, bg, onClick,
}: {
  icon: React.ElementType; label: string; color: string; bg: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className="flex flex-col items-center gap-1 cursor-pointer"
    >
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center hover:opacity-75 transition-opacity"
        style={{ background: bg, border: `1px solid ${color}30` }}>
        <Icon size={16} strokeWidth={1.8} style={{ color }} />
      </div>
      <span className="text-[9px] font-medium" style={{ color: "var(--muted)" }}>{label}</span>
    </button>
  );
}

// ─── Order Row ────────────────────────────────────────────────

function OrderRow({
  order: initialOrder,
  isLast,
  onDeleted,
  onStatusChange,
}: {
  order: Order;
  isLast: boolean;
  onDeleted: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"status" | "batch" | "edit" | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const meta = STATUS_META[order.status] ?? { label: order.status, color: "#999", bg: "rgba(150,150,150,0.1)" };
  const phone = order.customer.phone?.replace(/\D/g, "");

  function togglePanel(p: "status" | "batch" | "edit") {
    setPanel((prev) => (prev === p ? null : p));
  }

  useEffect(() => {
    if (panel === "batch" && batches.length === 0) {
      fetch("/api/batches").then((r) => r.json()).then(setBatches).catch(() => {});
    }
  }, [panel, batches.length]);

  async function changeStatus(newStatus: string) {
    setSaving(true);
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setOrder((o) => ({ ...o, status: newStatus }));
      onStatusChange(order.id, newStatus);
      setPanel(null);
    } finally {
      setSaving(false);
    }
  }

  async function moveToBatch(batchId: string, batchName: string) {
    setSaving(true);
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId }),
      });
      setOrder((o) => ({ ...o, batch: { id: batchId, name: batchName } }));
      setPanel(null);
    } finally {
      setSaving(false);
    }
  }

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
    <>
      <div style={{ borderBottom: isLast && !open ? "none" : "1px solid var(--border)" }}>
        {/* Main row */}
        <div
          onClick={() => { setOpen((v) => !v); if (open) setPanel(null); }}
          className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)] cursor-pointer hover:bg-[var(--surface-secondary)] transition-colors"
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
          <p className="flex-1 text-sm font-semibold text-[var(--foreground)] truncate">{order.customer.name}</p>
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

        {/* Expanded panel */}
        {open && (
          <div className="px-4 pb-3 pt-2 space-y-3"
            style={{ background: "var(--background)", borderTop: "1px solid var(--border)", borderBottom: isLast ? "none" : "1px solid var(--border)" }}>

            {/* Info chips — status is clickable */}
            <div className="flex gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <span className="text-[10px] text-[var(--muted)]">المنتج:</span>
                <span className="text-[11px] font-semibold text-[var(--foreground)]">
                  {PRODUCT_TYPE_AR[order.productType] ?? order.productType}
                </span>
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); togglePanel("status"); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: meta.bg, border: `1px solid ${meta.color}40` }}>
                <span className="text-[10px]" style={{ color: meta.color }}>الحالة:</span>
                <span className="text-[11px] font-semibold" style={{ color: meta.color }}>{meta.label}</span>
              </button>
            </div>

            {/* Status picker */}
            {panel === "status" && (
              <div className="rounded-2xl overflow-hidden border border-[var(--border)]">
                {Object.entries(STATUS_META).map(([value, s]) => (
                  <button
                    key={value}
                    onClick={(e) => { e.stopPropagation(); changeStatus(value); }}
                    disabled={saving}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors cursor-pointer"
                    style={{
                      background: value === order.status ? s.bg : "var(--surface)",
                      color: value === order.status ? s.color : "var(--foreground)",
                      borderBottom: "1px solid var(--border)",
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    {s.label}
                    {value === order.status && <span className="mr-auto text-[var(--muted)] text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Batch picker */}
            {panel === "batch" && (
              <div className="rounded-2xl overflow-hidden border border-[var(--border)]">
                {batches.length === 0
                  ? <p className="text-xs text-[var(--muted)] px-4 py-3">جاري التحميل...</p>
                  : batches.map((b) => (
                    <button
                      key={b.id}
                      onClick={(e) => { e.stopPropagation(); moveToBatch(b.id, b.name); }}
                      disabled={saving}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors cursor-pointer"
                      style={{
                        background: b.id === order.batch?.id ? "rgba(201,168,76,0.1)" : "var(--surface)",
                        color: b.id === order.batch?.id ? "#c9a84c" : "var(--foreground)",
                        borderBottom: "1px solid var(--border)",
                        opacity: saving ? 0.5 : 1,
                      }}
                    >
                      <Package size={12} className="shrink-0 text-[var(--muted)]" />
                      {b.name}
                      {b.id === order.batch?.id && <span className="mr-auto text-[var(--muted)] text-[10px]">الحالية</span>}
                    </button>
                  ))
                }
              </div>
            )}

            {/* Action icons */}
            <div className="flex items-center gap-4">
              {phone && (
                <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <ActionBtn icon={MessageCircle} label="واتساب"   color="#25d366" bg="rgba(37,211,102,0.12)" />
                </a>
              )}
              {order.customer.instagram && (
                <a href={`https://instagram.com/${order.customer.instagram}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                  <ActionBtn icon={Instagram} label="انستقرام" color="#e1306c" bg="rgba(225,48,108,0.12)" />
                </a>
              )}
              <ActionBtn icon={Pencil}        label="تعديل" color="#c9a84c" bg="rgba(201,168,76,0.12)" onClick={() => togglePanel("edit")} />
              <ActionBtn icon={ArrowRightLeft} label="نقل"   color="#60a5fa" bg="rgba(59,130,246,0.12)" onClick={() => togglePanel("batch")} />
              <ActionBtn icon={Trash2}         label={deleting ? "..." : "حذف"} color="#f87171" bg="rgba(248,113,113,0.12)" onClick={handleDelete} />
            </div>
          </div>
        )}
      </div>

      {/* Edit sheet — full bottom drawer */}
      {panel === "edit" && (
        <EditSheet
          order={order}
          onClose={() => setPanel(null)}
          onSaved={(updated) => setOrder((o) => ({ ...o, ...updated }))}
        />
      )}
    </>
  );
}

// ─── Tab: Pending ─────────────────────────────────────────────

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

  if (loading) return <div className="flex items-center justify-center h-48"><p className="text-sm text-[var(--muted)]">جاري التحميل...</p></div>;
  if (orders.length === 0) return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <AlertCircle size={32} strokeWidth={1.5} className="text-[var(--muted)]" />
      <p className="text-sm text-[var(--muted)]">لا توجد طلبات معلقة</p>
    </div>
  );

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
                  onDeleted={(id) => setOrders((p) => p.filter((o) => o.id !== id))}
                  onStatusChange={(id, newStatus) =>
                    setOrders((p) =>
                      PENDING_STATUSES.includes(newStatus as typeof PENDING_STATUSES[number])
                        ? p.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
                        : p.filter((o) => o.id !== id)
                    )
                  }
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
      <p className="text-xs text-[var(--muted)] text-center max-w-[220px]">قريباً — إدارة المخزون وتتبع المنتجات</p>
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
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
              style={{ background: active ? "#c9a84c" : "transparent", color: active ? "#111111" : "var(--muted)" }}>
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
