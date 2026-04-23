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
  MessageCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { formatIQD, formatUSD, formatTRY } from "@/lib/utils";
import { format } from "date-fns";
import { useT, type Translations } from "@/lib/i18n";

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


const ORDER_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-600",
  in_progress: "bg-amber-500/10 text-amber-600",
  bought: "bg-purple-500/10 text-purple-600",
  shipped: "bg-indigo-500/10 text-indigo-600",
  delivered: "bg-green-500/10 text-green-600",
  cancelled: "bg-red-500/10 text-red-600",
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  Bag: "حقيبة", Shoe: "حذاء", Clothing: "ملابس", Accessory: "إكسسوار", Other: "أخرى",
};

const PAYMENT_LABELS: Record<string, string> = {
  paid: "مدفوع", partial: "دفع جزئي", unpaid: "غير مدفوع",
};

function buildWhatsAppUrl(order: Order): string {
  const phone = (order.phone || order.customer?.phone || "").replace(/\D/g, "");
  const remaining = order.sellingPrice + order.deliveryCost - order.deposit;
  const type = PRODUCT_TYPE_LABELS[order.productType] || order.productType;
  const text = encodeURIComponent(
    `مرحباً ${order.customer?.name || ""},\n\n` +
    `طلبك من متجر ترندي:\n` +
    `المنتج: ${type}${order.productName ? " - " + order.productName : ""}\n` +
    (order.color ? `اللون: ${order.color}\n` : "") +
    (order.size ? `المقاس: ${order.size}\n` : "") +
    `السعر: ${formatIQD(order.sellingPrice)}\n` +
    `التوصيل: ${formatIQD(order.deliveryCost)}\n` +
    (order.deposit > 0 ? `العربون: ${formatIQD(order.deposit)}\n` : "") +
    `المتبقي: ${formatIQD(remaining)}\n\n` +
    `الحالة: ${({ new: "جديد", in_progress: "قيد التنفيذ", bought: "تم الشراء", shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغي" } as Record<string, string>)[order.status] || order.status}\n` +
    `شكراً لك!`
  );
  return `https://wa.me/${phone}?text=${text}`;
}

function openInvoice(order: Order) {
  const remaining = order.sellingPrice + order.deliveryCost - order.deposit;
  let imgHtml = "";
  try {
    const imgs = JSON.parse(order.images ?? "");
    if (Array.isArray(imgs) && imgs[0])
      imgHtml = `<div style="text-align:center;margin:16px 0;"><img src="${imgs[0]}" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid #e0e0e0;" /></div>`;
  } catch { /* ignore */ }
  const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><title>فاتورة</title>
  <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',sans-serif;padding:40px;color:#1a1a1a;max-width:800px;margin:0 auto;direction:rtl;}
  .header{text-align:center;margin-bottom:32px;border-bottom:3px solid #1a1a1a;padding-bottom:16px;}.header h1{font-size:28px;font-weight:700;}
  .section{margin-bottom:24px;}.section-title{font-size:14px;font-weight:600;color:#666;margin-bottom:8px;}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 32px;}.field{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #e0e0e0;}
  .field-label{font-weight:500;color:#555;}.field-value{font-weight:600;}
  .totals{background:#f8f8f8;border-radius:8px;padding:16px;margin-top:24px;}.total-row{font-size:18px;border-bottom:none;padding-top:12px;}
  </style></head><body>
  <div class="header"><h1>متجر ترندي</h1><p>فاتورة</p></div>
  ${imgHtml}
  <div class="section"><div class="section-title">العميل</div><div class="grid">
  <div class="field"><span class="field-label">الاسم</span><span class="field-value">${order.customer?.name || "-"}</span></div>
  <div class="field"><span class="field-label">الهاتف</span><span class="field-value">${order.phone || order.customer?.phone || "-"}</span></div>
  </div></div>
  <div class="section"><div class="section-title">المنتج</div><div class="grid">
  <div class="field"><span class="field-label">النوع</span><span class="field-value">${PRODUCT_TYPE_LABELS[order.productType] || order.productType}</span></div>
  <div class="field"><span class="field-label">الاسم</span><span class="field-value">${order.productName || "-"}</span></div>
  <div class="field"><span class="field-label">اللون</span><span class="field-value">${order.color || "-"}</span></div>
  <div class="field"><span class="field-label">المقاس</span><span class="field-value">${order.size || "-"}</span></div>
  </div></div>
  <div class="totals"><div class="section-title">الأسعار</div>
  <div class="field"><span class="field-label">سعر البيع</span><span class="field-value">${formatIQD(order.sellingPrice)}</span></div>
  <div class="field"><span class="field-label">التوصيل</span><span class="field-value">${formatIQD(order.deliveryCost)}</span></div>
  <div class="field"><span class="field-label">العربون</span><span class="field-value">- ${formatIQD(order.deposit)}</span></div>
  <div class="field total-row"><span class="field-label">المتبقي</span><span class="field-value">${formatIQD(remaining)}</span></div>
  </div>
  <script>window.onload=function(){window.print();};</script></body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

function batchStatusBadge(status: string, t: Translations) {
  const map: Record<string, { label: string; className: string }> = {
    open: { label: t.batches.status.open, className: "bg-blue-500 text-white border-transparent" },
    shipped: { label: t.batches.status.shipped, className: "bg-amber-500 text-white border-transparent" },
    in_distribution: { label: t.batches.status.in_distribution, className: "bg-purple-500 text-white border-transparent" },
    completed: { label: t.batches.status.completed, className: "bg-green-500 text-white border-transparent" },
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
  t,
}: {
  batch: Batch;
  batches: Batch[];
  onClose: () => void;
  onRefresh: () => void;
  isAdmin: boolean;
  t: Translations;
}) {
  const ORDER_STATUS_OPTIONS = [
    { value: "new", label: t.orders.status.new },
    { value: "in_progress", label: t.orders.status.in_progress },
    { value: "bought", label: t.orders.status.bought },
    { value: "shipped", label: t.orders.status.shipped },
    { value: "delivered", label: t.orders.status.delivered },
    { value: "cancelled", label: t.orders.status.cancelled },
  ];

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
    if (!confirm(t.batches.modal.deleteOrderConfirm)) return;
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
            <p className="text-xs text-[var(--muted)]">{t.batches.modal.orderCount(orders.length)}</p>
          </div>
        </div>
        <button
          onClick={() => { onClose(); onRefresh(); }}
          title={t.batches.modal.back}
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl hover:bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer text-sm font-medium"
        >
          <ArrowRight size={16} />
          {t.batches.modal.back}
        </button>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
        {orders.length === 0 && (
          <div className="flex items-center justify-center h-40 text-[var(--muted)]">
            {t.batches.modal.empty}
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
                        <label className="text-xs font-medium text-[var(--muted)]">{t.batches.modal.statusLabel}</label>
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
                        <label className="text-xs font-medium text-[var(--muted)]">{t.batches.modal.notes}</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder={t.batches.modal.notesPlaceholder}
                          rows={2}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] resize-none outline-none focus:border-[var(--accent)] transition-colors"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} disabled={isLoading}>
                          <CheckCircle2 size={14} className="me-1.5" />
                          {t.batches.modal.save}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingOrder(null)}>
                          {t.batches.modal.cancel}
                        </Button>
                      </div>
                    </div>
                  ) : isMoving ? (
                    /* Move to batch */
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-[var(--muted)]">{t.batches.modal.moveTo}</p>
                      <Select
                        value={targetBatchId}
                        onChange={(e) => setTargetBatchId(e.target.value)}
                        className="text-sm"
                      >
                        <option value="">{t.batches.modal.selectBatch}</option>
                        {otherBatches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </Select>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => moveOrder(order.id)} disabled={!targetBatchId || isLoading}>
                          <ArrowRightLeft size={14} className="me-1.5" />
                          {t.batches.modal.move}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setMovingOrderId(null)}>
                          {t.batches.modal.cancel}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Action buttons */
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(order)}>
                        <Pencil size={13} className="me-1.5" />
                        {t.batches.modal.edit}
                      </Button>

                      <a
                        href={buildWhatsAppUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-[var(--border)] text-xs font-medium hover:bg-[var(--surface-secondary)] transition-colors text-green-600"
                      >
                        <MessageCircle size={13} />
                        {t.batches.modal.whatsapp}
                      </a>

                      <Button size="sm" variant="outline" onClick={() => openInvoice(order)}>
                        <FileText size={13} className="me-1.5" />
                        {t.batches.modal.print}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateOrder(order.id, { status: "new" })}
                        disabled={isLoading || order.status === "new"}
                      >
                        <RotateCcw size={13} className="me-1.5" />
                        {t.batches.modal.resetPending}
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
                        {t.batches.modal.moveToBatch}
                      </Button>

                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteOrder(order.id)}
                          disabled={isLoading}
                        >
                          <Trash2 size={13} className="me-1.5" />
                          {t.batches.modal.delete}
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
                      <p className="text-[var(--muted)]">{t.batches.modal.buyPrice}</p>
                      <p className="font-medium">{formatTRY(order.purchaseCost)}</p>
                    </div>
                    <div className="text-xs">
                      <p className="text-[var(--muted)]">{t.batches.modal.sellPrice}</p>
                      <p className="font-medium">{formatIQD(order.sellingPrice)}</p>
                    </div>
                    <div className="text-xs">
                      <p className="text-[var(--muted)]">{t.batches.modal.deposit}</p>
                      <p className="font-medium">{formatIQD(order.deposit)}</p>
                    </div>
                    <div className="text-xs">
                      <p className="text-[var(--muted)]">{t.batches.modal.payment}</p>
                      <p className="font-medium">{order.paymentStatus === "paid" ? t.batches.modal.paid : t.batches.modal.unpaid}</p>
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
  const t = useT();

  const STATUS_OPTIONS = [
    { value: "open", label: t.batches.status.open },
    { value: "shipped", label: t.batches.status.shipped },
    { value: "in_distribution", label: t.batches.status.in_distribution },
    { value: "completed", label: t.batches.status.completed },
  ];

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
    if (!confirm(t.batches.modal.deleteBatchConfirm)) return;
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
          <h1 className="text-2xl font-bold tracking-tight">{t.batches.title}</h1>
          <p className="text-muted-foreground">{t.batches.subtitle}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="me-2 h-4 w-4" />
          {t.batches.newBatch}
        </Button>
      </div>

      {/* Batches Grid */}
      {batches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
          <Package className="h-10 w-10 text-[var(--muted)] mb-3 opacity-40" />
          <p className="text-sm text-[var(--muted)]">{t.batches.empty}</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {batches.map((batch) => {
            const bought = boughtCount(batch);
            const total = batch._count.orders;
            const pct = total > 0 ? Math.round((bought / total) * 100) : 0;
            const totalPurchaseTRY = batch.orders.reduce((s, o) => s + o.purchaseCost, 0);
            const totalSellingIQD  = batch.orders.reduce((s, o) => s + o.sellingPrice, 0);
            const statusColors: Record<string, { bg: string; text: string; border: string }> = {
              open:            { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa", border: "rgba(59,130,246,0.3)" },
              shipped:         { bg: "rgba(249,115,22,0.15)",  text: "#fb923c", border: "rgba(249,115,22,0.3)" },
              in_distribution: { bg: "rgba(168,85,247,0.15)",  text: "#c084fc", border: "rgba(168,85,247,0.3)" },
              completed:       { bg: "rgba(34,197,94,0.15)",   text: "#4ade80", border: "rgba(34,197,94,0.3)" },
            };
            const sc = statusColors[batch.status] ?? statusColors.open;
            const barColor = pct === 100 ? "#22c55e" : pct > 50 ? "#3b82f6" : "#f97316";

            return (
              <div
                key={batch.id}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{ border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
              >
                {/* ── Dark header ── */}
                <div
                  className="px-4 py-3 flex items-center justify-between gap-2"
                  style={{ background: "linear-gradient(135deg,#0f172a 0%,#1a2e4a 100%)" }}
                >
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm leading-tight truncate">{batch.name}</p>
                    <p className="text-slate-400 text-[11px] mt-0.5 font-mono">
                      {format(new Date(batch.openDate), "dd/MM/yyyy")}
                      {batch.closeDate && (
                        <span> → {format(new Date(batch.closeDate), "dd/MM/yyyy")}</span>
                      )}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                  >
                    {batchStatusBadge(batch.status, t).props.children}
                  </span>
                </div>

                {/* ── Body ── */}
                <div className="bg-[var(--surface)] px-4 py-3 space-y-3 flex-1">
                  {/* Stats chips */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--muted)]">
                      <Package size={10} />
                      <span className="font-semibold text-[var(--foreground)]">{total}</span>
                      {t.batches.card.orders.replace(":", "")}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--muted)]">
                      {t.batches.card.shipping.replace(":", "")}
                      <span className="font-semibold text-[var(--foreground)]">{formatUSD(batch.shippingCost)}</span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-[var(--muted)]">{t.batches.card.progress}</span>
                      <span className="font-semibold" style={{ color: barColor }}>
                        {t.batches.card.progressDetail(bought, total)} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                  </div>

                  {/* Financial row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl px-3 py-2 text-center" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                      <p className="text-[10px] text-[var(--muted)] mb-0.5">{t.batches.card.purchaseCosts}</p>
                      <p className="text-xs font-bold text-[var(--foreground)] font-mono">{formatTRY(totalPurchaseTRY)}</p>
                    </div>
                    <div className="rounded-xl px-3 py-2 text-center" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                      <p className="text-[10px] text-[var(--muted)] mb-0.5">{t.batches.card.sellingCosts}</p>
                      <p className="text-xs font-bold font-mono" style={{ color: "#c9a84c" }}>{formatIQD(totalSellingIQD)}</p>
                    </div>
                  </div>
                </div>

                {/* ── Footer actions ── */}
                <div
                  className="flex items-center gap-1.5 px-3 py-2.5"
                  style={{ background: "var(--background)", borderTop: "1px solid var(--border)" }}
                >
                  <button
                    onClick={() => setViewingBatch(batch)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-semibold transition-all hover:brightness-110"
                    style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)" }}
                  >
                    <Eye size={13} />
                    {t.batches.card.viewOrders}
                  </button>
                  <button
                    onClick={() => openEdit(batch)}
                    title={t.batches.card.edit}
                    className="flex items-center justify-center h-8 w-8 rounded-xl transition-all hover:brightness-110"
                    style={{ background: "rgba(234,179,8,0.12)", color: "#ca8a04", border: "1px solid rgba(234,179,8,0.25)" }}
                  >
                    <Pencil size={13} />
                  </button>
                  {isAdmin() && (
                    <button
                      onClick={() => handleDelete(batch.id)}
                      title={t.batches.card.delete}
                      className="flex items-center justify-center h-8 w-8 rounded-xl transition-all hover:brightness-110"
                      style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
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
          t={t}
        />
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>{editingBatch ? t.batches.dialog.editTitle : t.batches.dialog.newTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="batch-name">{t.batches.dialog.name}</Label>
              <Input
                id="batch-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t.batches.dialog.namePlaceholder}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch-open-date">{t.batches.dialog.openDate}</Label>
                <Input
                  id="batch-open-date"
                  type="date"
                  value={form.openDate}
                  onChange={(e) => setForm((f) => ({ ...f, openDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch-close-date">{t.batches.dialog.closeDate}</Label>
                <Input
                  id="batch-close-date"
                  type="date"
                  value={form.closeDate}
                  onChange={(e) => setForm((f) => ({ ...f, closeDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-shipping">{t.batches.dialog.shippingCost}</Label>
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
              <Label htmlFor="batch-status">{t.batches.dialog.status}</Label>
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
                {t.batches.dialog.cancel}
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                {editingBatch ? t.batches.dialog.save : t.batches.dialog.create}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
