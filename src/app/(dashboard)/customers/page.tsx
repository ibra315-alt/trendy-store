"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/store/auth";
import { useT } from "@/lib/i18n";
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
  Search,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Users,
  Loader2,
} from "lucide-react";

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

export default function CustomersPage() {
  const { isAdmin } = useAuthStore();
  const t = useT();
  const statusLabels: Record<string, string> = { ...t.orders.status };
  const paymentLabels: Record<string, string> = { ...t.orders.status };

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">{t.settings.adminRequired}</p>
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
        alert(data.error || t.customers.deleteDialog.cannotDelete);
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
                {t.customers.detail.totalOrders}
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
                {t.customers.detail.ltv}
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
                {t.customers.detail.status}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {selectedCustomer.isVIP ? "VIP" : t.customers.detail.regular}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t.customers.detail.orderHistory}</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedCustomer.orders && selectedCustomer.orders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.customers.detail.colProduct}</TableHead>
                    <TableHead>{t.customers.detail.colBatch}</TableHead>
                    <TableHead>{t.customers.detail.colPrice}</TableHead>
                    <TableHead>{t.customers.detail.colDeposit}</TableHead>
                    <TableHead>{t.customers.detail.colStatus}</TableHead>
                    <TableHead>{t.customers.detail.colPayment}</TableHead>
                    <TableHead>{t.customers.detail.colDate}</TableHead>
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
                {t.customers.detail.noOrders}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            {t.customers.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t.customers.subtitle(customers.length)}
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 me-2" />
          {t.customers.newCustomer}
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.customers.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-10"
        />
      </div>

      {/* Customer table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">{t.customers.loading}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">
                {search ? t.customers.noResults : t.customers.empty}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.customers.table.name}</TableHead>
                  <TableHead>{t.customers.table.instagram}</TableHead>
                  <TableHead>{t.customers.table.phone}</TableHead>
                  <TableHead>{t.customers.table.cityArea}</TableHead>
                  <TableHead className="text-center">{t.customers.table.orders}</TableHead>
                  <TableHead className="text-start">{t.customers.table.ltv}</TableHead>
                  <TableHead className="text-center">{t.customers.table.vip}</TableHead>
                  <TableHead className="text-start">{t.customers.table.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(customer)}
                  >
                    <TableCell className="font-medium">
                      {customer.name}
                    </TableCell>
                    <TableCell>
                      {customer.instagram ? `@${customer.instagram}` : "-"}
                    </TableCell>
                    <TableCell>{customer.phone || "-"}</TableCell>
                    <TableCell>
                      {customer.city || "-"}
                      {customer.area && `، ${customer.area}`}
                    </TableCell>
                    <TableCell className="text-center">
                      {customer.totalOrders}
                    </TableCell>
                    <TableCell className="text-start">
                      {formatIQD(customer.ltv)}
                    </TableCell>
                    <TableCell className="text-center">
                      {customer.isVIP ? (
                        <Badge variant="warning">
                          <span className="me-1">&#11088;</span>VIP
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-start">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(customer)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(customer)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogClose onClose={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editingId ? t.customers.dialog.editTitle : t.customers.dialog.newTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t.customers.dialog.nameLabel}</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t.customers.dialog.namePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">{t.customers.dialog.instagramLabel}</Label>
              <div className="flex gap-2">
                <Input
                  id="instagram"
                  value={form.instagram}
                  onChange={(e) =>
                    setForm({ ...form, instagram: e.target.value })
                  }
                  placeholder={t.customers.dialog.instagramPlaceholder}
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
                  title={t.customers.dialog.fetchNameTitle}
                  className="shrink-0 h-10"
                >
                  {fetchingIG ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t.customers.dialog.fetchName
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t.customers.dialog.phoneLabel}</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t.customers.dialog.phonePlaceholder}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">{t.customers.dialog.cityLabel}</Label>
                <Select
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                >
                  <option value="">{t.customers.dialog.cityPlaceholder}</option>
                  {IRAQI_CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">{t.customers.dialog.areaLabel}</Label>
                <Input
                  id="area"
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  placeholder={t.customers.dialog.areaPlaceholder}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                {t.customers.dialog.cancel}
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving
                  ? t.customers.dialog.saving
                  : editingId
                  ? t.customers.dialog.update
                  : t.customers.dialog.create}
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
            <DialogTitle>{t.customers.deleteDialog.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p>
              {deletingCustomer
                ? t.customers.deleteDialog.confirm(deletingCustomer.name)
                : ""}
            </p>
            {deletingCustomer && deletingCustomer.totalOrders > 0 && (
              <p className="text-sm text-destructive">
                {t.customers.deleteDialog.hasOrders(deletingCustomer.totalOrders)}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                {t.customers.deleteDialog.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? t.customers.deleteDialog.deleting : t.customers.deleteDialog.delete}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
