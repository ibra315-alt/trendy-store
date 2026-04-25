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
  phone2: string | null;
  city: string | null;
  area: string | null;
  notes: string | null;
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
  phone2: string;
  city: string;
  area: string;
  notes: string;
}

const IRAQI_CITIES = [
  "بغداد", "البصرة", "أربيل", "الموصل", "النجف", "كربلاء",
  "السليمانية", "دهوك", "كركوك", "الأنبار", "بابل", "ديالى",
  "ذي قار", "القادسية", "المثنى", "ميسان", "واسط", "صلاح الدين",
];

const emptyForm: CustomerForm = { name: "", instagram: "", phone: "", phone2: "", city: "", area: "", notes: "" };

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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, Customer>>({});
  const [expandedLoading, setExpandedLoading] = useState(false);

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
  const [importMapping, setImportMapping] = useState<Record<string, string>>({ name: "", instagram: "", phone: "", phone2: "", city: "", area: "", notes: "", productType: "", productName: "", productLink: "", purchaseCost: "", sellingPrice: "", size: "", orderDate: "" });
  const [importParsing, setImportParsing] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState("");

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
      const autoMap: Record<string, string> = { name: "", instagram: "", phone: "", phone2: "", city: "", area: "", notes: "", productType: "", productName: "", productLink: "", purchaseCost: "", sellingPrice: "", size: "", orderDate: "" };
      for (const h of data.headers) {
        const l = h.toLowerCase();
        if (!autoMap.name         && /name|اسم|الاسم|الزبون/.test(l))                          autoMap.name = h;
        if (!autoMap.instagram    && /instagram|انستغرام|انستقرام/.test(l))                    autoMap.instagram = h;
        if (!autoMap.phone        && /phone.?1|هاتف.?1|جوال.?1|phone$|هاتف$|جوال$|موبايل/.test(l)) autoMap.phone = h;
        if (!autoMap.phone2       && /phone.?2|هاتف.?2|جوال.?2/.test(l))                       autoMap.phone2 = h;
        if (!autoMap.city         && /city|محافظة|المحافظة|مدينة/.test(l))                     autoMap.city = h;
        if (!autoMap.area         && /area|منطقة|حي|المنطقة|عنوان/.test(l))                    autoMap.area = h;
        if (!autoMap.notes        && /notes|ملاحظ/.test(l))                                     autoMap.notes = h;
        if (!autoMap.productName  && /product.?name|اسم.?المنتج|اسم المنتج/.test(l))           autoMap.productName = h;
        if (!autoMap.productType  && /product.?type|نوع.?المنتج|نوع المنتج/.test(l))           autoMap.productType = h;
        if (!autoMap.productLink  && /product.?link|رابط.?المنتج|رابط المنتج/.test(l))         autoMap.productLink = h;
        if (!autoMap.purchaseCost && /purchase|تركي|try|بالتركي/.test(l))                      autoMap.purchaseCost = h;
        if (!autoMap.sellingPrice && /selling|عراقي|iqd|بالعراقي/.test(l))                     autoMap.sellingPrice = h;
        if (!autoMap.size         && /size|قياس|مقاس/.test(l))                                  autoMap.size = h;
        if (!autoMap.orderDate    && /date|تاريخ/.test(l))                                      autoMap.orderDate = h;
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
    setImportMapping({ name: "", instagram: "", phone: "", phone2: "", city: "", area: "", notes: "", productType: "", productName: "", productLink: "", purchaseCost: "", sellingPrice: "", size: "", orderDate: "" });
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

  const filtered = [...customers]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((c) => {
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
    setForm({ name: customer.name, instagram: customer.instagram || "", phone: customer.phone || "", phone2: customer.phone2 || "", city: customer.city || "", area: customer.area || "", notes: customer.notes || "" });
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

  const handleToggleExpand = async (customer: Customer) => {
    if (expandedId === customer.id) { setExpandedId(null); return; }
    setExpandedId(customer.id);
    if (!expandedData[customer.id]) {
      setExpandedLoading(true);
      try {
        const res = await fetch(`/api/customers/${customer.id}`);
        if (res.ok) {
          const data = await res.json();
          setExpandedData((prev) => ({ ...prev, [customer.id]: data }));
        }
      } catch { /* ignore */ }
      setExpandedLoading(false);
    }
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((c) => c.id)));
  };

  const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    await Promise.all([...selectedIds].map((id) => fetch(`/api/customers/${id}`, { method: "DELETE" })));
    exitSelectionMode();
    setBulkDeleteOpen(false);
    setBulkDeleting(false);
    fetchCustomers();
  };

  // ── Main list ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {selectionMode ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-2xl" dir="rtl">
          <span className="text-[12px] text-[var(--muted)]">
            {selectedIds.size > 0 ? `${selectedIds.size} محدد` : "اختر عملاء"}
          </span>
          <div className="flex-1" />
          <button
            onClick={toggleSelectAll}
            className="h-7 px-3 rounded-lg text-[12px] border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--foreground)] transition-colors cursor-pointer"
          >
            {allFilteredSelected ? "إلغاء الكل" : "تحديد الكل"}
          </button>
          <button
            onClick={exitSelectionMode}
            className="h-7 px-3 rounded-lg text-[12px] border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--muted)] transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="h-7 px-3 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors cursor-pointer"
            >
              <Trash2 size={12} />
              حذف المحدد
            </button>
          )}
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            onClick={() => setSelectionMode(true)}
            className="h-7 px-3 rounded-lg text-[12px] border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
          >
            تحديد
          </button>
        </div>
      )}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {/* Column headers — desktop only */}
        <div
          className="hidden sm:grid px-3 py-2 border-b border-[var(--border)] bg-[var(--background)]"
          style={{ gridTemplateColumns: "24px 140px 1fr 130px 68px" }}
          dir="ltr"
        >
          <div className="flex items-center">
            {selectionMode && (
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 rounded cursor-pointer accent-[var(--accent)]"
              />
            )}
          </div>
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
              const isSelected = selectedIds.has(customer.id);
              const isExpanded = expandedId === customer.id;
              const detail = expandedData[customer.id];
              const igRaw = customer.instagram?.trim();
              const igHandle = igRaw ? (igRaw.match(/instagram\.com\/([^/?#\s]+)/i)?.[1] ?? igRaw.replace(/^@/, "")) : null;
              const igUrl = igRaw ? (igRaw.startsWith("http") ? igRaw : `https://instagram.com/${igHandle}`) : null;
              const waPhone = (customer.phone || "").replace(/\D/g, "");
              return (
                <div key={customer.id}>
                  {/* Row */}
                  <div
                    className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors ${isExpanded ? "bg-[var(--surface-secondary)]" : "hover:bg-[var(--surface-secondary)]"}`}
                    dir="ltr"
                    onClick={() => {
                      if (selectionMode) {
                        setSelectedIds((prev) => { const next = new Set(prev); if (next.has(customer.id)) next.delete(customer.id); else next.add(customer.id); return next; });
                      } else {
                        handleToggleExpand(customer);
                      }
                    }}
                  >
                    {selectionMode && (
                      <div className="shrink-0 flex items-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(customer.id)) next.delete(customer.id); else next.add(customer.id);
                            return next;
                          })}
                          className="w-4 h-4 cursor-pointer accent-[var(--accent)]"
                        />
                      </div>
                    )}
                    <div className="w-[110px] sm:w-[140px] shrink-0">
                      <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">
                        {igHandle ?? customer.name}
                      </p>
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
                  </div>

                  {/* Expanded panel */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border)] bg-[var(--background)] px-4 py-3 space-y-3" dir="rtl">

                      {/* Info rows */}
                      <div className="space-y-1.5">
                        {/* Name */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-[var(--muted)] w-20 shrink-0">الاسم</span>
                          <span className="text-[13px] font-semibold text-[var(--foreground)]">{customer.name}</span>
                          {customer.isVIP && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c" }}>⭐ VIP</span>
                          )}
                        </div>
                        {/* Instagram */}
                        {igHandle && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[var(--muted)] w-20 shrink-0">انستغرام</span>
                            <span className="text-[12px] font-mono text-[var(--foreground)]">@{igHandle}</span>
                          </div>
                        )}
                        {/* Phone 1 */}
                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[var(--muted)] w-20 shrink-0">هاتف 1</span>
                            <span className="text-[12px] font-mono text-[var(--foreground)] tabular-nums">{customer.phone}</span>
                          </div>
                        )}
                        {/* Phone 2 */}
                        {customer.phone2 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[var(--muted)] w-20 shrink-0">هاتف 2</span>
                            <span className="text-[12px] font-mono text-[var(--foreground)] tabular-nums">{customer.phone2}</span>
                          </div>
                        )}
                        {/* City / Area */}
                        {(customer.city || customer.area) && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[var(--muted)] w-20 shrink-0">العنوان</span>
                            <span className="text-[12px] text-[var(--foreground)]">
                              {[customer.city, customer.area].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                        )}
                        {/* Notes */}
                        {customer.notes && (
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] text-[var(--muted)] w-20 shrink-0 pt-0.5">ملاحظات</span>
                            <span className="text-[12px] text-[var(--foreground)] leading-relaxed">{customer.notes}</span>
                          </div>
                        )}
                        {/* Stats */}
                        <div className="flex items-center gap-4 pt-1">
                          <span className="text-[11px] text-[var(--muted)]">
                            الطلبات: <strong className="text-[var(--foreground)]">{customer.totalOrders}</strong>
                          </span>
                          <span className="text-[11px] text-[var(--muted)]">
                            الإجمالي: <strong style={{ color: "#c9a84c" }}>{formatIQD(customer.ltv)}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenEdit(customer)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-medium border border-[var(--border)] hover:bg-[var(--surface-secondary)] text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                          <Pencil size={12} /> تعديل
                        </button>
                        {igUrl && (
                          <a
                            href={igUrl} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-medium border border-[var(--border)] hover:opacity-80 transition-opacity cursor-pointer no-underline"
                            style={{ color: "#e1306c", borderColor: "#e1306c33", background: "#e1306c0d" }}
                          >
                            <Instagram size={12} /> انستغرام
                          </a>
                        )}
                        {waPhone.length >= 7 && (
                          <a
                            href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-medium border transition-opacity hover:opacity-80 cursor-pointer no-underline"
                            style={{ color: "#25d366", borderColor: "#25d36633", background: "#25d3660d" }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            واتساب
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteClick(customer)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[12px] font-medium border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} /> حذف
                        </button>
                      </div>

                      {/* Orders */}
                      {expandedLoading && expandedId === customer.id && !detail ? (
                        <div className="flex items-center gap-2 py-2 text-[var(--muted)]">
                          <Loader2 size={14} className="animate-spin" />
                          <span className="text-[12px]">جاري التحميل...</span>
                        </div>
                      ) : detail?.orders && detail.orders.length > 0 ? (
                        <div className="rounded-xl overflow-hidden border border-[var(--border)]">
                          <div className="px-3 py-1.5 bg-[var(--surface)] text-[11px] font-semibold" style={{ color: "#c9a84c" }}>
                            سجل الطلبات ({detail.orders.length})
                          </div>
                          <div className="divide-y divide-[var(--border)]">
                            {detail.orders.map((order) => (
                              <div key={order.id} className="flex items-center gap-2 px-3 py-2" dir="ltr">
                                <span className="text-[11px] font-semibold text-[var(--foreground)] w-16 shrink-0">
                                  {PRODUCT_TYPE_LABELS[order.productType] || order.productType}
                                </span>
                                <span className="text-[11px] text-[var(--muted)] flex-1 truncate">
                                  {order.batch?.name || "—"}
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${statusColors[order.status] || "bg-gray-500/10 text-gray-400"}`}>
                                  {statusLabels[order.status] || order.status}
                                </span>
                                <span className={`hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${paymentColors[order.paymentStatus] || "bg-gray-500/10 text-gray-400"}`}>
                                  {paymentLabels[order.paymentStatus] || order.paymentStatus}
                                </span>
                                <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: "#c9a84c" }}>
                                  {formatIQD(order.sellingPrice)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : detail && detail.orders.length === 0 ? (
                        <p className="text-[12px] text-[var(--muted)]">لا توجد طلبات.</p>
                      ) : null}
                    </div>
                  )}
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

            {/* Phone 1 + Phone 2 */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-[var(--muted)] mb-1.5 block">هاتف 1</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="07xxxxxxxxxx"
                  dir="ltr"
                  className="w-full h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm px-3 outline-none focus:border-[var(--accent)] transition-colors text-[var(--foreground)] placeholder:text-[var(--muted)]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[var(--muted)] mb-1.5 block">هاتف 2</label>
                <input
                  value={form.phone2}
                  onChange={(e) => setForm({ ...form, phone2: e.target.value })}
                  placeholder="07xxxxxxxxxx"
                  dir="ltr"
                  className="w-full h-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm px-3 outline-none focus:border-[var(--accent)] transition-colors text-[var(--foreground)] placeholder:text-[var(--muted)]"
                />
              </div>
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

            {/* Notes */}
            <div>
              <label className="text-[11px] font-medium text-[var(--muted)] mb-1.5 block">ملاحظات</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="أي معلومات إضافية..."
                rows={2}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm px-3 py-2 outline-none focus:border-[var(--accent)] transition-colors text-[var(--foreground)] placeholder:text-[var(--muted)] resize-none"
              />
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent>
          <DialogClose onClose={() => setBulkDeleteOpen(false)} />
          <DialogHeader><DialogTitle>حذف العملاء المحددين</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4" dir="rtl">
            <p>هل أنت متأكد من حذف <strong>{selectedIds.size}</strong> عميل؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <p className="text-sm text-[var(--muted)]">ملاحظة: العملاء الذين لديهم طلبات لن يُحذفوا.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setBulkDeleteOpen(false); }}>إلغاء</Button>
              <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
                {bulkDeleting ? "جاري الحذف..." : `حذف ${selectedIds.size} عميل`}
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
                <p className="text-[11px] font-semibold text-[var(--foreground)]">معلومات الزبون</p>
                {([
                  { key: "name",      label: "الاسم *"      },
                  { key: "instagram", label: "انستغرام"     },
                  { key: "phone",     label: "هاتف 1"       },
                  { key: "phone2",    label: "هاتف 2"       },
                  { key: "city",      label: "المحافظة"     },
                  { key: "area",      label: "المنطقة/العنوان" },
                  { key: "notes",     label: "ملاحظات"      },
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
                <p className="text-[11px] font-semibold text-[var(--foreground)] pt-1">بيانات الطلب <span className="font-normal text-[var(--muted)]">(اختياري — ينشئ طلباً لكل صف)</span></p>
                {([
                  { key: "productName",  label: "اسم المنتج"       },
                  { key: "productType",  label: "نوع المنتج"       },
                  { key: "productLink",  label: "رابط المنتج"      },
                  { key: "purchaseCost", label: "السعر بالتركي ₺"  },
                  { key: "sellingPrice", label: "السعر بالعراقي IQD" },
                  { key: "size",         label: "القياس"           },
                  { key: "orderDate",    label: "التاريخ"          },
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
