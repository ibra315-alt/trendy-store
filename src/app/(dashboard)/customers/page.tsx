"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { useCustomerFilterStore } from "@/store/customer-filter";
import { formatIQD } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Pencil,
  Trash2,
  ArrowRight,
  Loader2,
  Clipboard,
  Instagram,
  Upload,
  FileArchive,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

function parsePhones(phone: string | null): string[] {
  if (!phone) return [];
  return phone.split(/[,/\n|،]+/).map((p) => p.trim()).filter(Boolean);
}

function extractInstagramHandle(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/instagram\.com\/([^/?#\s]+)/i);
  if (urlMatch) return urlMatch[1];
  return trimmed.replace(/^@/, "");
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  Bag: "حقيبة",
  Shoe: "حذاء",
  Clothing: "ملابس",
  Accessory: "إكسسوار",
  Other: "أخرى",
};

interface Customer {
  id: string;
  name: string;
  instagram: string | null;
  phone: string | null;
  city: string | null;
  area: string | null;
  isVIP: boolean;
  ltv: number;
  totalOrders: number;
  orders: Order[];
  createdAt: string;
}

interface Order {
  id: string;
  productType: string;
  productName: string | null;
  sellingPrice: number;
  deposit: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  batch?: { name: string } | null;
}

interface CustomerForm {
  name: string;
  instagram: string;
  phone: string;
  city: string;
  area: string;
}

const IRAQI_CITIES = [
  "بغداد", "البصرة", "أربيل", "الموصل", "النجف", "كربلاء",
  "السليمانية", "دهوك", "كركوك", "الأنبار", "بابل", "ديالى",
  "ذي قار", "القادسية", "المثنى", "ميسان", "واسط", "صلاح الدين",
];

const emptyForm: CustomerForm = { name: "", instagram: "", phone: "", city: "", area: "" };

const statusLabels: Record<string, string> = {
  new: "جديد",
  in_progress: "قيد التنفيذ",
  bought: "تم الشراء",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-500",
  in_progress: "bg-amber-500/10 text-amber-500",
  bought: "bg-purple-500/10 text-purple-500",
  shipped: "bg-indigo-500/10 text-indigo-400",
  delivered: "bg-green-500/10 text-green-500",
  cancelled: "bg-red-500/10 text-red-500",
};

const paymentLabels: Record<string, string> = {
  unpaid: "غير مدفوع",
  partial: "جزئي",
  paid: "مدفوع",
};

const paymentColors: Record<string, string> = {
  paid: "bg-green-500/10 text-green-500",
  partial: "bg-amber-500/10 text-amber-500",
  unpaid: "bg-red-500/10 text-red-500",
};

export default function CustomersPage() {
  const { isAdmin } = useAuthStore();
  const { search, setCount } = useCustomerFilterStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [fetchingIG, setFetchingIG] = useState(false);
  const [saving, setSaving] = useState(false);

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "map" | "done">("upload");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const [importTotal, setImportTotal] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({ name: "", instagram: "", phone: "", city: "", area: "" });
  const [importParsing, setImportParsing] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState("");

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Order history view
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchInstagramName = async (handle: string) => {
    if (!handle || handle.length < 2) return;
    setFetchingIG(true);
    try {
      const res = await fetch("/api/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: handle }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.displayName && data.displayName.toLowerCase() !== handle.toLowerCase()) {
          setForm((f) => ({ ...f, name: f.name || data.displayName }));
        }
      }
    } catch { /* ignore */ }
    setFetchingIG(false);
  };

  const applyInstagramValue = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    const urlMatch = trimmed.match(/instagram\.com\/([^/?#\s]+)/i);
    if (urlMatch) {
      const handle = urlMatch[1];
      setForm((f) => ({ ...f, name: f.name || handle }));
      fetchInstagramName(handle);
    } else {
      const handle = trimmed.replace(/^@/, "");
      if (handle.length >= 2) fetchInstagramName(handle);
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setForm((f) => ({ ...f, instagram: text.trim() }));
      applyInstagramValue(text);
    } catch { /* clipboard access denied */ }
  };

  const handleImportFile = async (file: File) => {
    setImportFile(file);
    setImportError("");
    setImportParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("action", "parse");
      const res = await fetch("/api/import/customers", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setImportError(data.error ?? "خطأ غير معروف"); setImportParsing(false); return; }
      setImportHeaders(data.headers);
      setImportPreview(data.preview);
      setImportTotal(data.total);
      // Auto-map obvious column names
      const autoMap: Record<string, string> = { name: "", instagram: "", phone: "", city: "", area: "" };
      for (const h of data.headers) {
        const l = h.toLowerCase();
        if (!autoMap.name      && /name|اسم|الاسم/.test(l))          autoMap.name = h;
        if (!autoMap.instagram && /instagram|انستغرام|انستقرام/.test(l)) autoMap.instagram = h;
        if (!autoMap.phone     && /phone|هاتف|جوال|موبايل|تلفون/.test(l)) autoMap.phone = h;
        if (!autoMap.city      && /city|محافظة|المحافظة|مدينة/.test(l))   autoMap.city = h;
        if (!autoMap.area      && /area|منطقة|حي|المنطقة/.test(l))        autoMap.area = h;
      }
      setImportMapping(autoMap);
      setImportStep("map");
    } catch { setImportError("فشل قراءة الملف"); }
    setImportParsing(false);
  };

  const handleImportSubmit = async () => {
    if (!importFile || !importMapping.name) return;
    setImportingData(true);
    try {
      const fd = new FormData();
      fd.append("file", importFile);
      fd.append("action", "import");
      fd.append("mapping", JSON.stringify(importMapping));
      const res = await fetch("/api/import/customers", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setImportError(data.error ?? "فشل الاستيراد"); setImportingData(false); return; }
      setImportResult(data);
      setImportStep("done");
      fetchCustomers();
    } catch { setImportError("فشل الاستيراد"); }
    setImportingData(false);
  };

  const resetImport = () => {
    setImportStep("upload");
    setImportFile(null);
    setImportHeaders([]);
    setImportPreview([]);
    setImportTotal(0);
    setImportMapping({ name: "", instagram: "", phone: "", city: "", area: "" });
    setImportResult(null);
    setImportError("");
  };

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
        setCount(data.length);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, [setCount]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    function handleNewCustomer() { handleOpenCreate(); }
    function handleImport() { setImportOpen(true); }
    window.addEventListener("trendy:open-new-customer", handleNewCustomer);
    window.addEventListener("trendy:open-import-customers", handleImport);
    return () => {
      window.removeEventListener("trendy:open-new-customer", handleNewCustomer);
      window.removeEventListener("trendy:open-import-customers", handleImport);
    };
  }, []);

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">صلاحية المسؤول مطلوبة.</p>
      </div>
    );
  }

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.instagram?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    );
  });

  const handleOpenCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };

  const handleOpenEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({ name: customer.name, instagram: customer.instagram || "", phone: customer.phone || "", city: customer.city || "", area: customer.area || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editingId ? `/api/customers/${editingId}` : "/api/customers";
      const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) { setDialogOpen(false); fetchCustomers(); }
    } catch (err) { console.error("Save customer error:", err); }
    finally { setSaving(false); }
  };

  const handleDeleteClick = (customer: Customer) => { setDeletingCustomer(customer); setDeleteDialogOpen(true); };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${deletingCustomer.id}`, { method: "DELETE" });
      if (res.ok) { setDeleteDialogOpen(false); setDeletingCustomer(null); fetchCustomers(); }
      else { const data = await res.json(); alert(data.error || "لا يمكن حذف عميل لديه طلبات"); }
    } catch (err) { console.error("Delete error:", err); }
    finally { setDeleting(false); }
  };

  const handleRowClick = async (customer: Customer) => {
    setDetailLoading(true);
    setSelectedCustomer({ ...customer, orders: [] });
    try {
      const res = await fetch(`/api/customers/${customer.id}`);
      if (res.ok) setSelectedCustomer(await res.json());
    } catch (err) { console.error("Fetch customer detail error:", err); }
    finally { setDetailLoading(false); }
  };

  // ── Customer detail view ───────────────────────────────────────────────────
  if (selectedCustomer) {
    const phones = parsePhones(selectedCustomer.phone);
    return (
      <div className="space-y-3" dir="rtl">
        {/* Compact header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedCustomer(null)}
            className="flex items-center justify-center w-8 h-8 rounded-xl hover:bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
          >
            <ArrowRight size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-[var(--foreground)] truncate">
                {selectedCustomer.name}
              </span>
              {selectedCustomer.instagram && (() => {
                const raw = selectedCustomer.instagram!.trim();
                const igUrl = raw.startsWith("http") ? raw : `https://instagram.com/${raw.replace(/^@/, "")}`;
                return (
                  <a href={igUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[12px] hover:opacity-75 transition-opacity"
                    style={{ color: "#e1306c" }}>
                    <Instagram size={12} />
                    <span>{raw.startsWith("http") ? (raw.match(/instagram\.com\/([^/?#\s]+)/i)?.[1] ?? raw) : raw.replace(/^@/, "")}</span>
                  </a>
                );
              })()}
              {selectedCustomer.isVIP && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>
                  ⭐ VIP
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {phones.map((ph, i) => (
                <span key={i} className="text-[11px] text-[var(--muted)] font-mono tabular-nums">{ph}</span>
              ))}
              {selectedCustomer.city && (
                <span className="text-[11px] text-[var(--muted)]">
                  {selectedCustomer.city}{selectedCustomer.area && ` · ${selectedCustomer.area}`}
                </span>
              )}
            </div>
          </div>
          {/* Compact stats */}
          <div className="flex items-stretch gap-2 shrink-0">
            <div className="text-center px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <p className="text-[10px] text-[var(--muted)] leading-none mb-1">الطلبات</p>
              <p className="text-sm font-bold text-[var(--foreground)]">{selectedCustomer.totalOrders}</p>
            </div>
            <div className="text-center px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <p className="text-[10px] text-[var(--muted)] leading-none mb-1">الإجمالي</p>
              <p className="text-sm font-bold" style={{ color: "#c9a84c" }}>{formatIQD(selectedCustomer.ltv)}</p>
            </div>
          </div>
        </div>

        {/* Orders list */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--background)]">
            <span className="text-[12px] font-semibold" style={{ color: "#c9a84c" }}>سجل الطلبات</span>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
            </div>
          ) : !selectedCustomer.orders || selectedCustomer.orders.length === 0 ? (
            <p className="text-center text-[var(--muted)] text-sm py-10">لا توجد طلبات بعد.</p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {/* Column labels — desktop */}
              <div className="hidden sm:grid px-4 py-1.5 bg-[var(--background)]"
                style={{ gridTemplateColumns: "80px 1fr 90px 70px 80px" }} dir="ltr">
                {["النوع", "الدفعة", "الحالة", "الدفع", "السعر"].map((h) => (
                  <span key={h} className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide text-right">{h}</span>
                ))}
              </div>
              {selectedCustomer.orders.map((order) => (
                <div
                  key={order.id}
                  className="flex sm:grid items-center gap-2 px-4 py-2.5"
                  style={{ gridTemplateColumns: "80px 1fr 90px 70px 80px" }}
                  dir="ltr"
                >
                  {/* Type */}
                  <span className="text-[12px] font-semibold text-[var(--foreground)] shrink-0 w-[72px] sm:w-auto">
                    {PRODUCT_TYPE_LABELS[order.productType] || order.productType}
                  </span>
                  {/* Batch */}
                  <span className="text-[11px] text-[var(--muted)] truncate flex-1 sm:flex-none">
                    {order.batch?.name || "—"}
                  </span>
                  {/* Status */}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColors[order.status] || "bg-gray-500/10 text-gray-400"}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                  {/* Payment */}
                  <span className={`hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${paymentColors[order.paymentStatus] || "bg-gray-500/10 text-gray-400"}`}>
                    {paymentLabels[order.paymentStatus] || order.paymentStatus}
                  </span>
                  {/* Price */}
                  <span className="text-[12px] font-bold tabular-nums shrink-0" style={{ color: "#c9a84c" }}>
                    {formatIQD(order.sellingPrice)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Main list ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {/* Column headers — desktop only */}
        <div
          className="hidden sm:grid px-3 py-2 border-b border-[var(--border)] bg-[var(--background)]"
          style={{ gridTemplateColumns: "140px 1fr 130px 68px" }}
          dir="ltr"
        >
          <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide">المستخدم</span>
          <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide text-center">المحافظة</span>
          <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide text-right">الهاتف</span>
          <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide text-right"></span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-[var(--muted)]">
              {search ? "لا يوجد عملاء مطابقين." : "لا يوجد عملاء بعد."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((customer) => {
              const phones = parsePhones(customer.phone);
              return (
                <div
                  key={customer.id}
                  className="flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--surface-secondary)] cursor-pointer group transition-colors"
                  dir="ltr"
                  onClick={() => handleRowClick(customer)}
                >
                  <div className="w-[110px] sm:w-[140px] shrink-0">
                    <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">
                      {customer.instagram ? `@${customer.instagram}` : customer.name}
                    </p>
                    {customer.instagram && (
                      <p className="text-[11px] text-[var(--muted)] truncate">{customer.name}</p>
                    )}
                  </div>
                  <div className="flex-1 text-center">
                    {customer.city ? (
                      <>
                        <p className="text-[12px] font-medium text-[var(--foreground)]">{customer.city}</p>
                        {customer.area && <p className="text-[11px] text-[var(--muted)]">{customer.area}</p>}
                      </>
                    ) : (
                      <span className="text-[11px] text-[var(--muted)]">—</span>
                    )}
                  </div>
                  <div className="w-[108px] sm:w-[130px] shrink-0 text-right">
                    {phones.length > 0 ? (
                      phones.map((ph, i) => (
                        <p key={i} className="text-[11px] sm:text-[12px] font-mono text-[var(--foreground)] tabular-nums leading-tight">{ph}</p>
                      ))
                    ) : (
                      <span className="text-[11px] text-[var(--muted)]">—</span>
                    )}
                  </div>
                  <div
                    className="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-16 justify-end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleOpenEdit(customer)}
                      className="p-1.5 rounded-lg hover:bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(customer)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--muted)] hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle className="text-base">{editingId ? "تعديل العميل" : "عميل جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-3" dir="rtl">

            {/* Instagram — paste button + auto-fetch */}
            <div>
              <label className="text-[11px] font-medium text-[var(--muted)] mb-1.5 block">انستغرام</label>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Instagram size={13} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                  <input
                    id="instagram"
                    value={form.instagram}
                    onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                    onBlur={(e) => applyInstagramValue(e.target.value)}
                    placeholder="الرابط أو @username"
                    dir="ltr"
                    className="w-full h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm pe-8 ps-3 outline-none focus:border-[var(--accent)] transition-colors text-[var(--foreground)] placeholder:text-[var(--muted)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={pasteFromClipboard}
                  title="لصق من الحافظة"
                  className="flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer shrink-0"
                >
                  {fetchingIG ? <Loader2 size={13} className="animate-spin" /> : <Clipboard size={13} />}
                </button>
              </div>
              {fetchingIG && (
                <p className="text-[10px] text-[var(--muted)] mt-1 flex items-center gap-1">
                  <Loader2 size={10} className="animate-spin" /> جاري جلب الاسم...
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="text-[11px] font-medium text-[var(--muted)] mb-1.5 block">
                الاسم <span className="text-red-400">*</span>
              </label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="اسم العميل"
                className="w-full h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm px-3 outline-none focus:border-[var(--accent)] transition-colors text-[var(--foreground)] placeholder:text-[var(--muted)]"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-[11px] font-medium text-[var(--muted)] mb-1.5 block">الهاتف</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="07xxxxxxxxxx"
                dir="ltr"
                className="w-full h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm px-3 outline-none focus:border-[var(--accent)] transition-colors text-[var(--foreground)] placeholder:text-[var(--muted)]"
              />
            </div>

            {/* City + Area */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-[var(--muted)] mb-1.5 block">المحافظة</label>
                <Select id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="h-9 rounded-xl text-sm">
                  <option value="">اختر...</option>
                  {IRAQI_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[var(--muted)] mb-1.5 block">المنطقة</label>
                <input
                  id="area"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="الحي / المنطقة"
                  className="w-full h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm px-3 outline-none focus:border-[var(--accent)] transition-colors text-[var(--foreground)] placeholder:text-[var(--muted)]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 h-9 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer"
                style={{ background: "#c9a84c", color: "#111" }}
              >
                {saving ? <Loader2 size={14} className="animate-spin mx-auto" /> : editingId ? "تحديث" : "إنشاء"}
              </button>
              <button
                onClick={() => setDialogOpen(false)}
                className="h-9 px-4 rounded-xl text-sm border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--foreground)] transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setDeleteDialogOpen(false)} />
          <DialogHeader><DialogTitle>حذف العميل</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <p>هل أنت متأكد من حذف <strong>{deletingCustomer?.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.</p>
            {deletingCustomer && deletingCustomer.totalOrders > 0 && (
              <p className="text-sm text-destructive">هذا العميل لديه {deletingCustomer.totalOrders} طلب ولا يمكن حذفه.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? "جاري الحذف..." : "حذف"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Import Dialog ── */}
      <Dialog open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) resetImport(); }}>
        <DialogContent>
          <DialogClose onClose={() => { setImportOpen(false); resetImport(); }} />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileArchive size={16} style={{ color: "#c9a84c" }} />
              استيراد زبائن من Notion
            </DialogTitle>
          </DialogHeader>

          <div className="mt-3 space-y-4" dir="rtl">

            {/* Step 1: Upload */}
            {importStep === "upload" && (
              <div className="space-y-3">
                <p className="text-xs text-[var(--muted)]">
                  صدّر قاعدة بيانات زبائنك من Notion كـ CSV ثم اضغط Export كـ ZIP، وارفع الملف هنا.
                </p>
                <label
                  className="flex flex-col items-center justify-center gap-3 h-36 rounded-2xl border-2 border-dashed cursor-pointer transition-colors hover:border-[var(--accent)]"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <input
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
                  />
                  {importParsing ? (
                    <Loader2 size={28} className="animate-spin text-[var(--muted)]" />
                  ) : (
                    <>
                      <Upload size={28} className="text-[var(--muted)]" />
                      <span className="text-sm text-[var(--muted)]">اختر ملف ZIP</span>
                      <span className="text-[10px] text-[var(--muted)] opacity-60">.zip يحتوي على ملف CSV</span>
                    </>
                  )}
                </label>
                {importError && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle size={14} />
                    {importError}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Column mapping */}
            {importStep === "map" && (
              <div className="space-y-4">
                <p className="text-xs text-[var(--muted)]">
                  وجدنا <strong className="text-[var(--foreground)]">{importTotal}</strong> زبون — طابق الأعمدة:
                </p>

                {/* Mapping fields */}
                {([
                  { key: "name",      label: "الاسم *"     },
                  { key: "instagram", label: "انستغرام"    },
                  { key: "phone",     label: "الهاتف"      },
                  { key: "city",      label: "المحافظة"    },
                  { key: "area",      label: "المنطقة"     },
                ] as const).map(({ key, label }) => (
                  <div key={key} className="grid grid-cols-2 items-center gap-3">
                    <label className="text-[12px] font-medium text-[var(--foreground)]">{label}</label>
                    <select
                      value={importMapping[key]}
                      onChange={(e) => setImportMapping((m) => ({ ...m, [key]: e.target.value }))}
                      className="h-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[12px] px-2 outline-none focus:border-[var(--accent)] transition-colors text-[var(--foreground)]"
                    >
                      <option value="">— تجاهل —</option>
                      {importHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}

                {/* Preview */}
                {importPreview.length > 0 && importMapping.name && (
                  <div className="rounded-xl overflow-hidden border border-[var(--border)]">
                    <div className="px-3 py-1.5 bg-[var(--background)] text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide">
                      معاينة أول {importPreview.length} صفوف
                    </div>
                    <div className="divide-y divide-[var(--border)] max-h-40 overflow-y-auto">
                      {importPreview.map((row, i) => (
                        <div key={i} className="px-3 py-1.5 text-[11px] flex gap-3 text-[var(--foreground)]">
                          <span className="font-medium truncate">{row[importMapping.name] || "—"}</span>
                          {importMapping.phone && <span className="text-[var(--muted)] font-mono">{row[importMapping.phone] || ""}</span>}
                          {importMapping.instagram && <span className="text-[var(--muted)]">{row[importMapping.instagram] || ""}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {importError && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertCircle size={14} />{importError}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={resetImport}
                    className="flex-1 h-9 rounded-xl border border-[var(--border)] text-sm text-[var(--muted)] hover:bg-[var(--surface-secondary)] transition-colors"
                  >
                    رجوع
                  </button>
                  <button
                    onClick={handleImportSubmit}
                    disabled={!importMapping.name || importingData}
                    className="flex-1 h-9 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: "#c9a84c", color: "#111" }}
                  >
                    {importingData ? <Loader2 size={14} className="animate-spin mx-auto" /> : `استيراد ${importTotal} زبون`}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Done */}
            {importStep === "done" && importResult && (
              <div className="flex flex-col items-center gap-4 py-4">
                <CheckCircle2 size={40} style={{ color: "#22c55e" }} />
                <div className="text-center">
                  <p className="text-base font-bold text-[var(--foreground)]">تم الاستيراد بنجاح</p>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    تم إضافة <strong className="text-green-500">{importResult.created}</strong> زبون
                    {importResult.skipped > 0 && <> · تجاهل <strong className="text-[var(--muted)]">{importResult.skipped}</strong></>}
                  </p>
                </div>
                <button
                  onClick={() => { setImportOpen(false); resetImport(); }}
                  className="h-9 px-6 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                  style={{ background: "#c9a84c", color: "#111" }}
                >
                  إغلاق
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
