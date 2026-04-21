"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Package,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowRightLeft,
  RotateCcw,
  CheckCircle2,
  ImageIcon,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { formatIQD, formatUSD, formatTRY } from "@/lib/utils";
import { format } from "date-fns";

// ---------- Types ----------

interface Order {
  id: string;
  productType: string;
  productName: string | null;
  color: string | null;
  size: string | null;
  images: string | null;
  items: string | null;
  purchaseCost: number;
  sellingPrice: number;
  deliveryCost: number;
  deposit: number;
  status: string;
  paymentStatus: string;
  notes: string | null;
  phone: string | null;
  governorate: string | null;
  area: string | null;
  productLink: string | null;
  instagramLink: string | null;
  customer: { id: string; name: string; phone?: string; instagram?: string };
}

interface Batch {
  id: string;
  name: string;
  openDate: string;
  closeDate: string | null;
  shippingCost: number;
  status: string;
  orders: Order[];
  _count: { orders: number };
}

interface Settings {
  usdToIqd: number;
  tryToIqd: number;
}

interface BatchFormData {
  name: string;
  openDate: string;
  closeDate: string;
  shippingCost: string;
  status: string;
}

const EMPTY_FORM: BatchFormData = {
  name: "",
  openDate: new Date().toISOString().slice(0, 10),
  closeDate: "",
  shippingCost: "0",
  status: "open",
};

const STATUS_OPTIONS = [
  { value: "open", label: "مفتوحة" },
  { value: "shipped", label: "تم الشحن" },
  { value: "in_distribution", label: "قيد التوزيع" },
  { value: "completed", label: "مكتملة" },
];

const ORDER_STATUS_OPTIONS = [
  { value: "new", label: "جديد" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "bought", label: "تم الشراء" },
  { value: "shipped", label: "تم الشحن" },
  { value: "delivered", label: "تم التسليم" },
  { value: "cancelled", label: "ملغي" },
];

const ORDER_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600",
  in_progress: "bg-amber-500/10 text-amber-600",
  bought: "bg-purple-500/10 text-purple-600",
  shipped: "bg-indigo-500/10 text-indigo-600",
  delivered: "bg-green-500/10 text-green-600",
  cancelled: "bg-red-500/10 text-red-600",
};

function batchStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    open: { label: "مفتوحة", className: "bg-blue-500 text-white border-transparent" },
    shipped: { label: "تم الشحن", className: "bg-amber-500 text-white border-transparent" },
    in_distribution: { label: "قيد التوزيع", className: "bg-purple-500 text-white border-transparent" },
    completed: { label: "مكتملة", className: "bg-green-500 text-white border-transparent" },
  };
  const info = map[status] ?? { label: status, className: "" };
  return <Badge className={info.className}>{info.label}</Badge>;
}

// ---------- Batch Orders Modal ----------

function BatchOrdersModal({
  batch,
  batches,
  onClose,
  onRefresh,
  isAdmin,
}: {
  batch: Batch;
  batches: Batch[];
  onClose: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
}) {
  const [orders, setOrders] = useState<Order[]>(batch.orders);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [movingOrderId, setMovingOrderId] = useState<string | null>(null);
  const [targetBatchId, setTargetBatchId] = useState("");
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const otherBatches = batches.filter((b) => b.id !== batch.id);

  async function updateOrder(orderId: string, data: Record<string, unknown>) {
    setLoadingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
      }
    } catch (err) {
      console.error("Update order failed", err);
    }
    setLoadingOrderId(null);
  }

  async function deleteOrder(orderId: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    setLoadingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    } catch (err) {
      console.error("Delete order failed", err);
    }
    setLoadingOrderId(null);
  }

  async function moveOrder(orderId: string) {
    if (!targetBatchId) return;
    await updateOrder(orderId, { batchId: targetBatchId });
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setMovingOrderId(null);
    setTargetBatchId("");
  }

  function startEdit(order: Order) {
    setEditingOrder(order);
    setEditStatus(order.status);
    setEditNotes(order.notes ?? "");
  }

  async function saveEdit() {
    if (!editingOrder) return;
    await updateOrder(editingOrder.id, { status: editStatus, notes: editNotes });
    setEditingOrder(null);
  }

  const statusLabel = (s: string) => ORDER_STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--background)]" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Package size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">{batch.name}</h2>
            <p className="text-xs text-[var(--muted)]">{orders.length} طلب</p>
          </div>
        </div>
        <button
          onClick={() => { onClose(); onRefresh(); }}
          title="رجوع"
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl hover:bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer text-sm font-medium"
        >
          <ArrowRight size={16} />
          رجوع
        </button>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
        {orders.length === 0 && (
          <div className="flex items-center justify-center h-40 text-[var(--muted)]">
            لا توجد طلبات في هذه الشحنة
          </div>
        )}

        {orders.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          const isLoading = loadingOrderId === order.id;
          const isMoving = movingOrderId === order.id;
          const isEditing = editingOrder?.id === order.id;
          const statusColor = ORDER_STATUS_COLORS[order.status] ?? "bg-gray-500/10 text-gray-600";

          return (
            <div
              key={order.id}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden transition-all"
            >
              {/* Row header */}
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 text-right hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--foreground)] truncate">
                    {order.customer.name}
                  </p>
                  <p className="text-xs text-[var(--muted)] truncate mt-0.5">
                    {order.productName || order.productType}
                    {order.color ? ` · ${order.color}` : ""}
                    {order.size ? ` · ${order.size}` : ""}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusColor}`}>
                  {statusLabel(order.status)}
                </span>
                <div className="text-xs text-[var(--muted)] tabular-nums shrink-0">
                  {formatIQD(order.sellingPrice)}
                </div>
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin text-[var(--muted)] shrink-0" />
                ) : isExpanded ? (
                  <ChevronUp size={16} className="text-[var(--muted)] shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-[var(--muted)] shrink-0" />
                )}
              </button>

              {/* Expanded actions */}
              {isExpanded && (
                <div className="border-t border-[var(--border)] px-4 py-4 space-y-4 bg-[var(--background)]">

                  {/* Edit mode */}
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--muted)]">الحالة</label>
                        <Select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="text-sm"
                        >
                          {ORDER_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--muted)]">ملاحظات</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="ملاحظات..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] resize-none outline-none focus:border-[var(--accent)] transition-colors"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} disabled={isLoading}>
                          <CheckCircle2 size={14} className="me-1.5" />
                          حفظ
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingOrder(null)}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : isMoving ? (
                    /* Move to batch */
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-[var(--muted)]">نقل إلى شحنة أخرى</p>
                      <Select
                        value={targetBatchId}
                        onChange={(e) => setTargetBatchId(e.target.value)}
                        className="text-sm"
                      >
                        <option value="">اختر الشحنة...</option>
                        {otherBatches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </Select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => moveOrder(order.id)} disabled={!targetBatchId || isLoading}>
                          <ArrowRightLeft size={14} className="me-1.5" />
                          نقل
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setMovingOrderId(null)}>
                          إلغاء
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Action buttons */
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(order)}
                      >
                        <Pencil size={13} className="me-1.5" />
                        تعديل
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateOrder(order.id, { status: "new" })}
                        disabled={isLoading || order.status === "new"}
                      >
                        <RotateCcw size={13} className="me-1.5" />
                        إعادة للمعلق
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMovingOrderId(order.id);
                          setTargetBatchId("");
                        }}
                        disabled={otherBatches.length === 0}
                      >
                        <ArrowRightLeft size={13} className="me-1.5" />
                        نقل لشحنة
                      </Button>

                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteOrder(order.id)}
                          disabled={isLoading}
                        >
                          <Trash2 size={13} className="me-1.5" />
                          حذف
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Images */}
                  {(() => {
                    const allImgs: string[] = [];
                    try { const p = JSON.parse(order.images ?? ""); if (Array.isArray(p)) allImgs.push(...p); } catch { if (order.images) allImgs.push(order.images); }
                    try { const subs = JSON.parse(order.items ?? ""); if (Array.isArray(subs)) subs.forEach((s: {images?: string[]}) => { if (Array.isArray(s.images)) allImgs.push(...s.images); }); } catch { /* ignore */ }
                    if (allImgs.length === 0) return null;
                    return (
                      <div className="flex gap-2 flex-wrap pt-1 border-t border-[var(--border)]">
                        {allImgs.map((img, i) => (
                          <button key={i} type="button" onClick={() => setPreviewImg(img)} className="shrink-0">
                            <img src={img} alt="" className="h-16 w-16 rounded-xl object-cover border border-[var(--border)] hover:opacity-80 transition-opacity cursor-zoom-in" />
                          </button>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Order details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[var(--border)]">
                    <div className="text-xs">
                      <p className="text-[var(--muted)]">سعر الشراء</p>
                      <p className="font-medium">{formatTRY(order.purchaseCost)}</p>
                    </div>
                    <div className="text-xs">
                      <p className="text-[var(--muted)]">سعر البيع</p>
                      <p className="font-medium">{formatIQD(order.sellingPrice)}</p>
                    </div>
                    <div className="text-xs">
                      <p className="text-[var(--muted)]">الدفعة المقدمة</p>
                      <p className="font-medium">{formatIQD(order.deposit)}</p>
                    </div>
                    <div className="text-xs">
                      <p className="text-[var(--muted)]">الدفع</p>
                      <p className="font-medium">{order.paymentStatus === "paid" ? "مدفوع" : "غير مدفوع"}</p>
                    </div>
                  </div>

                  {order.notes && (
                    <p className="text-xs text-[var(--muted)] bg-[var(--surface)] rounded-xl px-3 py-2">
                      {order.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Image preview */}
      {previewImg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6" onClick={() => setPreviewImg(null)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img src={previewImg} alt="" className="max-w-sm max-h-[70vh] rounded-xl object-contain shadow-2xl" />
            <button onClick={() => setPreviewImg(null)} className="absolute -top-2.5 -right-2.5 bg-[var(--background)] border border-[var(--border)] rounded-full p-1 shadow hover:bg-[var(--surface-secondary)] transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Main Component ----------

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [form, setForm] = useState<BatchFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [viewingBatch, setViewingBatch] = useState<Batch | null>(null);

  const isAdmin = useAuthStore((s) => s.isAdmin);

  const fetchData = useCallback(async () => {
    try {
      const [batchRes, settingsRes] = await Promise.all([
        fetch("/api/batches"),
        fetch("/api/settings"),
      ]);
      if (batchRes.ok) {
        const data = await batchRes.json();
        setBatches(data);
        // Functional update: reads the latest state, not the captured closure value.
        // If onClose() already set viewingBatch to null, prev will be null and we skip.
        setViewingBatch((prev) => {
          if (!prev) return null;
          return data.find((b: Batch) => b.id === prev.id) ?? null;
        });
      }
      if (settingsRes.ok) setSettings(await settingsRes.json());
    } catch (err) {
      console.error("Failed to fetch batches", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  function openCreate() {
    setEditingBatch(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(batch: Batch) {
    setEditingBatch(batch);
    setForm({
      name: batch.name,
      openDate: batch.openDate ? batch.openDate.slice(0, 10) : "",
      closeDate: batch.closeDate ? batch.closeDate.slice(0, 10) : "",
      shippingCost: String(batch.shippingCost),
      status: batch.status,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        openDate: form.openDate || undefined,
        closeDate: form.closeDate || null,
        shippingCost: form.shippingCost,
        status: form.status,
      };
      const url = editingBatch ? `/api/batches/${editingBatch.id}` : "/api/batches";
      const method = editingBatch ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchData();
      }
    } catch (err) {
      console.error("Save batch failed", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذه الشحنة؟ سيتم فصل الطلبات المرتبطة بها.")) return;
    try {
      const res = await fetch(`/api/batches/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Delete failed", err);
    }
  }

  function calcProfit(batch: Batch) {
    if (!settings) return { revenue: 0, purchaseCosts: 0, shippingCosts: 0, profit: 0 };
    const revenue = batch.orders.reduce((sum, o) => sum + o.sellingPrice, 0);
    const purchaseCosts = batch.orders.reduce((sum, o) => sum + o.purchaseCost * settings.tryToIqd, 0);
    const shippingCosts = batch.shippingCost * settings.usdToIqd;
    const profit = revenue - purchaseCosts - shippingCosts;
    return { revenue, purchaseCosts, shippingCosts, profit };
  }

  function boughtCount(batch: Batch) {
    return batch.orders.filter((o) => o.status !== "new" && o.status !== "cancelled").length;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">الشحنات</h1>
          <p className="text-muted-foreground">إدارة الشحنات وتتبع الطلبات</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="me-2 h-4 w-4" />
          شحنة جديدة
        </Button>
      </div>

      {/* Batches Grid */}
      {batches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد شحنات بعد. أنشئ شحنتك الأولى.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {batches.map((batch) => {
            const { revenue, purchaseCosts, shippingCosts, profit } = calcProfit(batch);
            const bought = boughtCount(batch);
            const total = batch._count.orders;

            return (
              <Card key={batch.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{batch.name}</CardTitle>
                    {batchStatusBadge(batch.status)}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">تاريخ الفتح:</span>{" "}
                      {format(new Date(batch.openDate), "MMM d, yyyy")}
                    </div>
                    <div>
                      <span className="text-muted-foreground">تاريخ الإغلاق:</span>{" "}
                      {batch.closeDate ? format(new Date(batch.closeDate), "MMM d, yyyy") : "---"}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">الشحن:</span>{" "}
                      {formatUSD(batch.shippingCost)}
                    </div>
                    <div>
                      <span className="text-muted-foreground">الطلبات:</span> {total}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>التقدم</span>
                      <span>{bought} تم شراؤها / {total} الإجمالي</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: total > 0 ? `${(bought / total) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>

                  {settings && (
                    <div className="rounded-md border p-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">الإيرادات</span>
                        <span>{formatIQD(revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">تكاليف الشراء</span>
                        <span>-{formatIQD(purchaseCosts)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">تكلفة الشحن</span>
                        <span>-{formatIQD(shippingCosts)}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>الربح المتوقع</span>
                        <span className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatIQD(profit)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setViewingBatch(batch)}>
                    <Eye className="me-1 h-4 w-4" />
                    عرض الطلبات
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(batch)}>
                    <Pencil className="me-1 h-4 w-4" />
                    تعديل
                  </Button>
                  {isAdmin() && (
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(batch.id)}>
                      <Trash2 className="me-1 h-4 w-4" />
                      حذف
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Batch Orders Full-Page Modal */}
      {viewingBatch && (
        <BatchOrdersModal
          batch={viewingBatch}
          batches={batches}
          onClose={() => setViewingBatch(null)}
          onRefresh={fetchData}
          isAdmin={isAdmin()}
        />
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{editingBatch ? "تعديل الشحنة" : "شحنة جديدة"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="batch-name">اسم الشحنة</Label>
              <Input
                id="batch-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="مثال: شحنة #12 - مارس"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch-open-date">تاريخ الفتح</Label>
                <Input
                  id="batch-open-date"
                  type="date"
                  value={form.openDate}
                  onChange={(e) => setForm((f) => ({ ...f, openDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch-close-date">تاريخ الإغلاق</Label>
                <Input
                  id="batch-close-date"
                  type="date"
                  value={form.closeDate}
                  onChange={(e) => setForm((f) => ({ ...f, closeDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-shipping">تكلفة الشحن (USD)</Label>
              <Input
                id="batch-shipping"
                type="number"
                min="0"
                step="0.01"
                value={form.shippingCost}
                onChange={(e) => setForm((f) => ({ ...f, shippingCost: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-status">الحالة</Label>
              <Select
                id="batch-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {editingBatch ? "حفظ" : "إنشاء شحنة"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
