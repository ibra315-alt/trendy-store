"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { useCustomerFilterStore } from "@/store/customer-filter";
import { formatIQD } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
} from "lucide-react";

function parsePhones(phone: string | null): string[] {
  if (!phone) return [];
  return phone.split(/[,/\n|،]+/).map((p) => p.trim()).filter(Boolean);
}

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
  productName: string;
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

const emptyForm: CustomerForm = {
  name: "",
  instagram: "",
  phone: "",
  city: "",
  area: "",
};

const statusLabels: Record<string, string> = {
  new: "جديد",
  preparing: "قيد التحضير",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const paymentLabels: Record<string, string> = {
  unpaid: "غير مدفوع",
  partial: "دفع جزئي",
  paid: "مدفوع",
};

export default function CustomersPage() {
  const { isAdmin } = useAuthStore();
  const { search, setCount } = useCustomerFilterStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [fetchingIG, setFetchingIG] = useState(false);

  const fetchInstagramName = async () => {
    const handle = form.instagram.replace(/^@/, "").trim();
    if (!handle) return;
    setFetchingIG(true);
    try {
      const res = await fetch("/api/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: handle }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.displayName) {
          setForm((f) => ({ ...f, name: f.name || data.displayName }));
        }
      }
    } catch { /* ignore */ }
    setFetchingIG(false);
  };
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  // Order history view
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

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

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    function handleNewCustomer() { handleOpenCreate(); }
    window.addEventListener("trendy:open-new-customer", handleNewCustomer);
    return () => window.removeEventListener("trendy:open-new-customer", handleNewCustomer);
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
      c.phone?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.area?.toLowerCase().includes(q)
    );
  });

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      instagram: customer.instagram || "",
      phone: customer.phone || "",
      city: customer.city || "",
      area: customer.area || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const url = editingId
        ? `/api/customers/${editingId}`
        : "/api/customers";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchCustomers();
      }
    } catch (err) {
      console.error("Save customer error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (customer: Customer) => {
    setDeletingCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${deletingCustomer.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteDialogOpen(false);
        setDeletingCustomer(null);
        fetchCustomers();
      } else {
        const data = await res.json();
        alert(data.error || "لا يمكن حذف عميل لديه طلبات");
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleRowClick = async (customer: Customer) => {
    try {
      const res = await fetch(`/api/customers/${customer.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCustomer(data);
      }
    } catch (err) {
      console.error("Fetch customer detail error:", err);
    }
  };

  // Order history view
  if (selectedCustomer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedCustomer(null)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {selectedCustomer.name}
              {selectedCustomer.isVIP && (
                <Badge variant="warning">
                  <span className="me-1">&#11088;</span>VIP
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
              {selectedCustomer.instagram && (
                <span className="me-3">@{selectedCustomer.instagram}</span>
              )}
              {selectedCustomer.city && (
                <span className="me-3">
                  {selectedCustomer.city}
                  {selectedCustomer.area && `، ${selectedCustomer.area}`}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي الطلبات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {selectedCustomer.totalOrders}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                القيمة الإجمالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatIQD(selectedCustomer.ltv)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                الحالة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {selectedCustomer.isVIP ? "VIP" : "عادي"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>سجل الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الدفعة</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>العربون</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الدفع</TableHead>
                    <TableHead>التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCustomer.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.productName}
                      </TableCell>
                      <TableCell>{order.batch?.name || "-"}</TableCell>
                      <TableCell>{formatIQD(order.sellingPrice)}</TableCell>
                      <TableCell>{formatIQD(order.deposit)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{statusLabels[order.status] || order.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.paymentStatus === "paid"
                              ? "success"
                              : order.paymentStatus === "partial"
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {paymentLabels[order.paymentStatus] || order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                لا توجد طلبات بعد.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Compact customer list */}
      <div
        className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden"
      >
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
                  {/* LEFT: instagram handle / name */}
                  <div className="w-[110px] sm:w-[140px] shrink-0">
                    <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">
                      {customer.instagram ? `@${customer.instagram}` : customer.name}
                    </p>
                    {customer.instagram && (
                      <p className="text-[11px] text-[var(--muted)] truncate">{customer.name}</p>
                    )}
                  </div>

                  {/* CENTER: city + area */}
                  <div className="flex-1 text-center">
                    {customer.city ? (
                      <>
                        <p className="text-[12px] font-medium text-[var(--foreground)]">{customer.city}</p>
                        {customer.area && (
                          <p className="text-[11px] text-[var(--muted)]">{customer.area}</p>
                        )}
                      </>
                    ) : (
                      <span className="text-[11px] text-[var(--muted)]">—</span>
                    )}
                  </div>

                  {/* RIGHT: phone(s) */}
                  <div className="w-[108px] sm:w-[130px] shrink-0 text-right">
                    {phones.length > 0 ? (
                      phones.map((ph, i) => (
                        <p key={i} className="text-[11px] sm:text-[12px] font-mono text-[var(--foreground)] tabular-nums leading-tight">
                          {ph}
                        </p>
                      ))
                    ) : (
                      <span className="text-[11px] text-[var(--muted)]">—</span>
                    )}
                  </div>

                  {/* Desktop action buttons (hover reveal) */}
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
            <DialogTitle>
              {editingId ? "تعديل العميل" : "عميل جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="اسم العميل"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">انستغرام</Label>
              <div className="flex gap-2">
                <Input
                  id="instagram"
                  value={form.instagram}
                  onChange={(e) =>
                    setForm({ ...form, instagram: e.target.value })
                  }
                  placeholder="اسم المستخدم (بدون @)"
                  className="flex-1"
                  onBlur={() => {
                    if (form.instagram && !form.name) fetchInstagramName();
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchInstagramName}
                  disabled={!form.instagram.trim() || fetchingIG}
                  title="جلب الاسم من انستغرام"
                  className="shrink-0 h-10"
                >
                  {fetchingIG ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "جلب الاسم"
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">الهاتف</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="رقم الهاتف"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">المدينة</Label>
                <Select
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                >
                  <option value="">اختر المدينة</option>
                  {IRAQI_CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">المنطقة</Label>
                <Input
                  id="area"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder="المنطقة"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? "جاري الحفظ..." : editingId ? "تحديث" : "إنشاء"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setDeleteDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>حذف العميل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p>
              هل أنت متأكد من حذف{" "}
              <strong>{deletingCustomer?.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            {deletingCustomer && deletingCustomer.totalOrders > 0 && (
              <p className="text-sm text-destructive">
                هذا العميل لديه {deletingCustomer.totalOrders} طلب ولا يمكن حذفه.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "جاري الحذف..." : "حذف"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
