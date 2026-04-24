"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  MessageCircle,
  FileText,
  Loader2,
  Link2,
  ImageIcon,
  X,
  Package,
  ExternalLink,
  ChevronDown,
  Clipboard,
  Instagram,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth";
import { formatIQD, formatTRY } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Customer {
  id: string;
  name: string;
  phone?: string;
  instagram?: string;
  city?: string;
  area?: string;
}

interface Batch {
  id: string;
  name: string;
  status: string;
}

interface Order {
  id: string;
  customerId: string;
  customer: Customer;
  batchId?: string | null;
  batch?: Batch | null;
  productType: string;
  productName: string;
  color?: string;
  size?: string;
  instagramLink?: string;
  productLink?: string;
  governorate?: string;
  area?: string;
  phone?: string;
  purchaseCost: number;
  sellingPrice: number;
  deliveryCost: number;
  deposit: number;
  status: string;
  paymentStatus: string;
  notes?: string;
  images?: string;
  items?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface OrderFormData {
  customerName: string;
  customerPhone: string;
  instagram: string; // combined: username or full link
  governorate: string;
  area: string;
  batchId: string;
  deliveryCost: string;
  deposit: string;
  status: string;
  paymentStatus: string;
  notes: string;
}

interface ProductItem {
  id: string;
  productLink: string;
  productType: string;
  productName: string;
  color: string;
  size: string;
  purchaseCost: string;
  sellingPrice: string;
  images: string;
  selectedImageIdx: number;
  availableColors: { name: string; image?: string }[];
  availableSizes: string[];
  fetchedImages: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_TABS = [
  { label: "النشطة", value: "active" },
  { label: "الكل", value: "all" },
  { label: "جديد", value: "new" },
  { label: "قيد التنفيذ", value: "in_progress" },
  { label: "تم الشراء", value: "bought" },
  { label: "تم الشحن", value: "shipped" },
  { label: "تم التسليم", value: "delivered" },
  { label: "غير مدفوع", value: "unpaid" },
] as const;

const PRODUCT_TYPES = [
  { label: "حقيبة", value: "Bag" },
  { label: "حذاء", value: "Shoe" },
  { label: "ملابس", value: "Clothing" },
  { label: "إكسسوار", value: "Accessory" },
  { label: "أخرى", value: "Other" },
];

const STATUS_OPTIONS = [
  { label: "جديد", value: "new" },
  { label: "قيد التنفيذ", value: "in_progress" },
  { label: "تم الشراء", value: "bought" },
  { label: "تم الشحن", value: "shipped" },
  { label: "تم التسليم", value: "delivered" },
];

const PAYMENT_OPTIONS = [
  { label: "غير مدفوع", value: "unpaid" },
  { label: "دفع جزئي", value: "partial" },
  { label: "مدفوع", value: "paid" },
];

const IRAQI_CITIES = [
  "بغداد",
  "البصرة",
  "أربيل",
  "الموصل",
  "النجف",
  "كربلاء",
  "السليمانية",
  "دهوك",
  "كركوك",
  "الأنبار",
  "بابل",
  "ديالى",
  "ذي قار",
  "القادسية",
  "المثنى",
  "ميسان",
  "واسط",
  "صلاح الدين",
];

const DELIVERY_COSTS = [
  { label: "5,000 د.ع", value: "5000" },
  { label: "6,000 د.ع", value: "6000" },
];

// Pricing lookup table (TRY → IQD selling price) — from price calculator
const PRICE_TABLE: [number, number][] = [[100,11000],[130,12000],[150,12000],[170,13000],[190,14000],[200,14000],[230,15000],[250,17000],[270,17000],[290,18000],[300,19000],[330,20000],[350,20000],[370,21000],[400,23000],[420,24000],[430,24000],[450,25000],[460,25000],[470,25000],[480,26000],[500,27000],[510,27000],[520,27000],[530,28000],[540,28000],[550,29000],[560,29000],[570,29000],[580,30000],[590,31000],[600,31000],[610,32000],[620,32000],[630,32000],[640,33000],[650,33000],[660,33000],[670,34000],[680,34000],[690,35000],[700,35000],[710,35000],[720,36000],[730,36000],[740,36000],[750,37000],[760,37000],[770,37000],[780,38000],[790,39000],[800,39000],[810,40000],[820,40000],[830,41000],[850,41000],[870,42000],[880,43000],[900,44000],[950,46000],[1000,51000],[1100,52000],[1150,54000],[1200,58000],[1300,61000],[1400,65000],[1500,68000],[1600,73000],[1700,77000],[1800,81000],[1900,84000],[2000,86000],[2050,88000],[2100,89000],[2150,91000],[2200,93000],[2250,95000],[2300,96000],[2350,99000],[2400,101000],[2450,103000],[2500,106000],[2600,110000],[2700,113000],[2800,117000],[2900,121000],[3000,125000],[3100,128000],[3200,132000],[3300,135000],[3400,141000],[3500,144000],[3600,148000],[3700,151000],[3800,155000],[3900,160000],[4000,164000],[4100,167000],[4200,171000],[4300,174000],[4400,179000],[4500,182000],[4600,186000],[4700,189000],[4800,193000],[4900,198000],[5000,202000],[5100,205000],[5200,209000],[5300,212000],[5400,218000],[5500,221000],[5600,225000],[5700,228000],[5800,232000],[5900,237000],[6000,248000],[6300,255000],[6500,262000],[6700,274000],[7000,285000],[7300,294000],[7500,311000],[8000,322000],[8300,329000],[8500,346000],[9000,357000],[9300,367000],[9600,367000]];
const BASE_IQD = 1530, BASE_TRY = 43;

function lookupIQD(lira: number, usdIqd: number, usdTry: number): number {
  const t = PRICE_TABLE;
  let base: number;
  if (lira <= t[0][0]) { base = t[0][1]; }
  else if (lira >= t[t.length - 1][0]) {
    const [l1, d1] = t[t.length - 2], [l2, d2] = t[t.length - 1];
    base = d2 + (lira - l2) * (d2 - d1) / (l2 - l1);
  } else {
    base = t[0][1];
    for (let i = 0; i < t.length - 1; i++) {
      const [l1, d1] = t[i], [l2, d2] = t[i + 1];
      if (lira >= l1 && lira <= l2) { base = d1 + (lira - l1) / (l2 - l1) * (d2 - d1); break; }
    }
  }
  const ratio = (usdIqd / usdTry) / (BASE_IQD / BASE_TRY);
  return Math.round(base * ratio / 1000) * 1000;
}

const EMPTY_FORM: OrderFormData = {
  customerName: "",
  customerPhone: "",
  instagram: "",
  governorate: "",
  area: "",
  batchId: "",
  deliveryCost: "",
  deposit: "",
  status: "new",
  paymentStatus: "unpaid",
  notes: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEmptyItem(): ProductItem {
  return {
    id: String(Date.now()) + Math.random().toString(36).slice(2),
    productLink: "",
    productType: "Bag",
    productName: "",
    color: "",
    size: "",
    purchaseCost: "",
    sellingPrice: "",
    images: "",
    selectedImageIdx: 0,
    availableColors: [],
    availableSizes: [],
    fetchedImages: [],
  };
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "new": return "default";
    case "in_progress": return "warning";
    case "bought": return "secondary";
    case "shipped": return "outline";
    case "delivered": return "success";
    default: return "default";
  }
}

function paymentBadgeVariant(status: string) {
  switch (status) {
    case "paid": return "success";
    case "partial": return "warning";
    case "unpaid": return "destructive";
    default: return "default";
  }
}

const STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  in_progress: "قيد التنفيذ",
  bought: "تم الشراء",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  unpaid: "غير مدفوع",
  partial: "دفع جزئي",
  paid: "مدفوع",
};

function prettyStatus(status: string) {
  return STATUS_LABELS[status] || status;
}

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  Bag: "حقيبة",
  Shoe: "حذاء",
  Clothing: "ملابس",
  Accessory: "إكسسوار",
  Other: "أخرى",
};

function pickSingleImage(fetchedImages: string[], selectedIdx: number, fallback: string): string | null {
  if (fetchedImages.length > 0) {
    const img = fetchedImages[selectedIdx ?? 0] || fetchedImages[0];
    return img ? JSON.stringify([img]) : null;
  }
  if (!fallback) return null;
  try {
    const arr = JSON.parse(fallback);
    if (Array.isArray(arr) && arr.length > 0) return JSON.stringify([arr[0]]);
  } catch { /* fallback is a plain URL */ }
  return JSON.stringify([fallback]);
}

function openInvoice(order: Order) {
  const finalPrice = order.sellingPrice + order.deliveryCost - order.deposit;
  const productImages = order.images ? JSON.parse(order.images) : [];
  const imageHtml = productImages.length > 0
    ? `<div style="text-align:center;margin:16px 0;"><img src="${productImages[0]}" alt="صورة المنتج" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid #e0e0e0;" /></div>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>فاتورة - ${order.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; direction: rtl; }
    .header { text-align: center; margin-bottom: 32px; border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; }
    .header h1 { font-size: 28px; font-weight: 700; letter-spacing: 2px; }
    .header p { color: #666; margin-top: 4px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 14px; font-weight: 600; letter-spacing: 1px; color: #666; margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 32px; }
    .field { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e0e0e0; }
    .field-label { font-weight: 500; color: #555; }
    .field-value { font-weight: 600; text-align: left; }
    .totals { background: #f8f8f8; border-radius: 8px; padding: 16px; margin-top: 24px; }
    .totals .field { border-bottom-color: #ccc; }
    .totals .total-row { font-size: 18px; color: #1a1a1a; border-bottom: none; padding-top: 12px; }
    .footer { text-align: center; margin-top: 48px; color: #999; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>متجر ترندي</h1>
    <p>فاتورة</p>
  </div>

  ${imageHtml}

  <div class="section">
    <div class="section-title">معلومات الطلب</div>
    <div class="grid">
      <div class="field"><span class="field-label">رقم الطلب</span><span class="field-value">${order.id.slice(0, 8).toUpperCase()}</span></div>
      <div class="field"><span class="field-label">التاريخ</span><span class="field-value">${format(new Date(order.createdAt), "dd MMM yyyy")}</span></div>
      <div class="field"><span class="field-label">الحالة</span><span class="field-value">${prettyStatus(order.status)}</span></div>
      <div class="field"><span class="field-label">الدفع</span><span class="field-value">${prettyStatus(order.paymentStatus)}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">العميل</div>
    <div class="grid">
      <div class="field"><span class="field-label">الاسم</span><span class="field-value">${order.customer?.name || "-"}</span></div>
      <div class="field"><span class="field-label">الهاتف</span><span class="field-value">${order.phone || order.customer?.phone || "-"}</span></div>
      <div class="field"><span class="field-label">الموقع</span><span class="field-value">${[order.governorate, order.area].filter(Boolean).join("، ") || "-"}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">المنتج</div>
    <div class="grid">
      <div class="field"><span class="field-label">النوع</span><span class="field-value">${PRODUCT_TYPE_LABELS[order.productType] || order.productType || "-"}</span></div>
      <div class="field"><span class="field-label">الاسم</span><span class="field-value">${order.productName || "-"}</span></div>
      <div class="field"><span class="field-label">اللون</span><span class="field-value">${order.color || "-"}</span></div>
      <div class="field"><span class="field-label">المقاس</span><span class="field-value">${order.size || "-"}</span></div>
    </div>
  </div>

  <div class="totals">
    <div class="section-title">الأسعار</div>
    <div class="field"><span class="field-label">سعر البيع</span><span class="field-value">${formatIQD(order.sellingPrice)}</span></div>
    <div class="field"><span class="field-label">كلفة التوصيل</span><span class="field-value">${formatIQD(order.deliveryCost)}</span></div>
    <div class="field"><span class="field-label">العربون المدفوع</span><span class="field-value">- ${formatIQD(order.deposit)}</span></div>
    <div class="field total-row"><span class="field-label">المتبقي للدفع</span><span class="field-value">${formatIQD(finalPrice)}</span></div>
  </div>

  <div class="footer">
    <p>شكراً لتسوقكم من متجر ترندي!</p>
  </div>

  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function buildWhatsAppUrl(order: Order) {
  const phone = (order.phone || order.customer?.phone || "").replace(/\D/g, "");
  const remaining = order.sellingPrice + order.deliveryCost - order.deposit;
  const text = encodeURIComponent(
    `مرحباً ${order.customer?.name || ""},\n\n` +
      `طلبك من متجر ترندي:\n` +
      `المنتج: ${PRODUCT_TYPE_LABELS[order.productType] || order.productType} - ${order.productName}\n` +
      (order.color ? `اللون: ${order.color}\n` : "") +
      (order.size ? `المقاس: ${order.size}\n` : "") +
      `السعر: ${formatIQD(order.sellingPrice)}\n` +
      `التوصيل: ${formatIQD(order.deliveryCost)}\n` +
      (order.deposit > 0 ? `العربون: ${formatIQD(order.deposit)}\n` : "") +
      `المتبقي: ${formatIQD(remaining)}\n\n` +
      `الحالة: ${prettyStatus(order.status)}\n` +
      `شكراً لك!`
  );
  return `https://wa.me/${phone}?text=${text}`;
}

function buildInstagramUrl(order: Order): string | null {
  const raw = (order.instagramLink || order.customer?.instagram || "").trim();
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  const handle = raw.replace(/^@/, "");
  return handle ? `https://instagram.com/${handle}` : null;
}

function getOrderItemCount(order: Order): number {
  if (!order.items) return 1;
  try {
    const parsed = JSON.parse(order.items);
    return 1 + (Array.isArray(parsed) ? parsed.length : 0);
  } catch {
    return 1;
  }
}

interface SubItem {
  productType: string;
  productName?: string;
  color?: string;
  size?: string;
  purchaseCost: string;
  sellingPrice: string;
  productLink?: string;
  images?: string[];
}

function parseSubItems(items?: string | null): SubItem[] {
  if (!items) return [];
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function OrdersPage() {
  const { token, isAdmin } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const ordersRef = useRef<Order[]>([]);
  ordersRef.current = orders;
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState({ usdIqd: BASE_IQD, usdTry: BASE_TRY });
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpand = useCallback((id: string) =>
    setExpandedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }), []);

  useEffect(() => {
    fetch("/api/settings").then(r => r.ok ? r.json() : null).then(d => {
      if (d) setRates({ usdIqd: d.usdToIqd || BASE_IQD, usdTry: d.usdToTry || BASE_TRY });
    }).catch(() => {});
  }, []);

  // Open new order dialog when navigated with ?new=true
  useEffect(() => {
    if (searchParams.get("new") === "true") {
      handleNewOrder();
      router.replace("/orders");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [form, setForm] = useState<OrderFormData>(EMPTY_FORM);
  const [productItems, setProductItems] = useState<ProductItem[]>([createEmptyItem()]);
  const [saving, setSaving] = useState(false);

  // Status dropdown
  const [statusDropId, setStatusDropId] = useState<string | null>(null);
  const statusDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!statusDropId) return;
    const handler = (e: MouseEvent) => {
      if (statusDropRef.current && !statusDropRef.current.contains(e.target as Node))
        setStatusDropId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusDropId]);

  const updateOrderStatus = useCallback(async (orderId: string, prevStatus: string, nextStatus: string) => {
    setStatusDropId(null);
    if (prevStatus === nextStatus) return;

    // Determine if this order should be removed from the current tab's view
    const activeTabNow = activeTab;
    const activeStatuses = ["new", "in_progress"];
    const shouldRemove =
      (activeTabNow === "active" && !activeStatuses.includes(nextStatus)) ||
      (activeTabNow !== "all" && activeTabNow !== "unpaid" && activeTabNow !== "active" && activeTabNow !== nextStatus);

    const savedOrder = ordersRef.current.find((o) => o.id === orderId);

    setOrders((prev) =>
      shouldRemove
        ? prev.filter((o) => o.id !== orderId)
        : prev.map((o) => o.id === orderId ? { ...o, status: nextStatus } : o)
    );

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Revert
      if (shouldRemove && savedOrder) {
        setOrders((prev) =>
          [...prev, savedOrder].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
      } else {
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: prevStatus } : o));
      }
    }
  }, [token, activeTab]);

  // Payment dropdown
  const [paymentDropId, setPaymentDropId] = useState<string | null>(null);
  const paymentDropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paymentDropId) return;
    const handler = (e: MouseEvent) => {
      if (paymentDropRef.current && !paymentDropRef.current.contains(e.target as Node))
        setPaymentDropId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [paymentDropId]);

  const updateOrderPayment = useCallback(async (orderId: string, prevStatus: string, nextStatus: string) => {
    setPaymentDropId(null);
    if (prevStatus === nextStatus) return;
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, paymentStatus: nextStatus } : o));
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ paymentStatus: nextStatus }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, paymentStatus: prevStatus } : o));
    }
  }, [token]);

  // Per-item loading states
  const [fetchingItemId, setFetchingItemId] = useState<string | null>(null);
  const [fetchingIG, setFetchingIG] = useState(false);

  // Always-current ref so useCallback closures read latest productItems
  const productItemsRef = useRef(productItems);
  productItemsRef.current = productItems;

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Extract Instagram username instantly from URL, then try API for display name
  useEffect(() => {
    const raw = form.instagram.trim();
    if (!raw) return;

    let handle = raw;
    if (raw.includes("instagram.com/")) {
      const match = raw.match(/instagram\.com\/([^/?#]+)/);
      if (match) handle = match[1];
    }
    handle = handle.replace(/^@/, "").replace(/\/$/, "");
    if (!handle) return;

    // Immediately fill with username so it's always populated
    setForm((f) => ({ ...f, customerName: f.customerName || handle }));

    // Try API in background to upgrade to display name
    const t = setTimeout(async () => {
      setFetchingIG(true);
      try {
        const res = await fetch("/api/instagram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: handle }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.displayName && data.displayName !== handle) {
            setForm((f) => ({ ...f, customerName: f.customerName === handle ? data.displayName : f.customerName }));
          }
        }
      } catch { /* ignore */ }
      setFetchingIG(false);
    }, 1000);
    return () => clearTimeout(t);
  }, [form.instagram]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === "unpaid") {
        params.set("paymentStatus", "unpaid");
      } else if (activeTab !== "all") {
        params.set("status", activeTab); // "active" handled by API as new+in_progress
      }
      if (searchDebounced) params.set("search", searchDebounced);

      const res = await fetch(`/api/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setOrders(await res.json());
    } catch (err) {
      console.error("Failed to fetch orders", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchDebounced, token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    async function loadBatches() {
      try {
        const res = await fetch("/api/batches", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBatches(Array.isArray(data) ? data : []);
        }
      } catch { /* ignore */ }
    }
    loadBatches();
  }, [token]);

  const setField = useCallback(
    (field: keyof OrderFormData, value: string) =>
      setForm((prev) => {
        const next = { ...prev, [field]: value };
        if (field === "governorate") {
          next.deliveryCost = value === "بغداد" ? "5000" : value ? "6000" : prev.deliveryCost;
        }
        return next;
      }),
    []
  );

  const updateProductItem = useCallback(
    (itemId: string, updates: Partial<ProductItem>) => {
      setProductItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
      );
    },
    []
  );

  const addProductItem = useCallback(() => {
    setProductItems((prev) => [...prev, createEmptyItem()]);
  }, []);

  const removeProductItem = useCallback((itemId: string) => {
    setProductItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const totalPurchaseCost = useMemo(() => {
    return productItems.reduce((sum, item) => sum + (parseFloat(item.purchaseCost) || 0), 0);
  }, [productItems]);

  const totalSellingPrice = useMemo(() => {
    return productItems.reduce((sum, item) => sum + (parseFloat(item.sellingPrice) || 0), 0);
  }, [productItems]);

  const finalPrice = useMemo(() => {
    const dc = parseFloat(form.deliveryCost) || 0;
    const dp = parseFloat(form.deposit) || 0;
    return totalSellingPrice + dc - dp;
  }, [totalSellingPrice, form.deliveryCost, form.deposit]);

  const handleFetchProduct = useCallback(async (itemId: string) => {
    const item = productItemsRef.current.find((i) => i.id === itemId);
    if (!item?.productLink?.trim()) return;
    const productLink = item.productLink;

    setFetchingItemId(itemId);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productLink }),
      });
      if (!res.ok) return;
      const data = await res.json();

      const mainImage: string = data.image || data.allImages?.[0] || "";
      const fetchedImages: string[] = mainImage
        ? [...new Set([mainImage, ...(data.allImages || [])].filter(Boolean))].slice(0, 10)
        : [];
      const firstColor: string = data.colors?.[0]?.name || "";
      const firstSize: string = data.sizes?.[0] || "";
      const rawPrice: string = data.price || "";
      const finalPurchaseCost = rawPrice ? String(parseFloat(rawPrice)) : "";
      const lira = parseFloat(finalPurchaseCost) || 0;
      const converted = lira > 0 ? lookupIQD(lira, rates.usdIqd, rates.usdTry) : 0;
      const sellingPrice = lira > 0
        ? String(converted > 0 ? converted : Math.round(lira * (rates.usdIqd / rates.usdTry)))
        : "";

      setProductItems((prev) =>
        prev.map((it) =>
          it.id !== itemId ? it : {
            ...it,
            productName: data.name || it.productName,
            productType: data.productType || it.productType,
            color: firstColor || it.color,
            size: firstSize || it.size,
            purchaseCost: finalPurchaseCost || it.purchaseCost,
            sellingPrice: sellingPrice || it.sellingPrice,
            images: mainImage ? JSON.stringify([mainImage]) : it.images,
            selectedImageIdx: 0,
            fetchedImages,
            availableColors: data.colors || [],
            availableSizes: data.sizes || [],
          }
        )
      );
    } catch { /* ignore */ }
    finally { setFetchingItemId(null); }
  }, [rates.usdIqd, rates.usdTry]);

  // Auto-fetch product info when any item's productLink changes
  const productLinks = productItems.map((i) => `${i.id}:${i.productLink}`).join("|");
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    productItems.forEach((item) => {
      if (!item.productLink.trim() || item.fetchedImages.length > 0) return;
      const t = setTimeout(() => handleFetchProduct(item.id), 800);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productLinks, handleFetchProduct]);

  const handleNewOrder = () => {
    setEditingOrder(null);
    setForm(EMPTY_FORM);
    setProductItems([createEmptyItem()]);
    setDialogOpen(true);
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);

    // Build first product item from main order fields
    const imgs = order.images ? (() => { try { return JSON.parse(order.images!); } catch { return []; } })() : [];
    const firstItem: ProductItem = {
      id: String(Date.now()) + Math.random().toString(36).slice(2),
      productLink: order.productLink || "",
      productType: order.productType || "Bag",
      productName: order.productName || "",
      color: order.color || "",
      size: order.size || "",
      purchaseCost: String(order.purchaseCost || ""),
      sellingPrice: "",
      images: order.images || "",
      selectedImageIdx: 0,
      availableColors: [],
      availableSizes: [],
      fetchedImages: imgs,
    };

    // Parse additional items
    let additionalItems: ProductItem[] = [];
    if (order.items) {
      try {
        const parsed = JSON.parse(order.items);
        if (Array.isArray(parsed)) {
          additionalItems = parsed.map((i: Record<string, unknown>) => ({
            id: String(Date.now()) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
            productLink: (i.productLink as string) || "",
            productType: (i.productType as string) || "Bag",
            productName: (i.productName as string) || "",
            color: (i.color as string) || "",
            size: (i.size as string) || "",
            purchaseCost: String(i.purchaseCost || ""),
            sellingPrice: String(i.sellingPrice || ""),
            images: i.images ? JSON.stringify(i.images) : "",
            selectedImageIdx: 0,
            availableColors: [],
            availableSizes: [],
            fetchedImages: Array.isArray(i.images) ? (i.images as string[]) : [],
          }));
        }
      } catch { /* ignore */ }
    }

    setProductItems([firstItem, ...additionalItems]);

    // Compute total purchase cost from all items except the first (first is in order.purchaseCost)
    // Actually, on edit the purchaseCost field had the total. For additional items we set individual costs.
    // We need to figure out item1's purchaseCost. The order.purchaseCost is the total.
    // If there are additional items, we need to subtract their costs from the total to get item1's cost.
    // But the additional items already have their own purchaseCost stored. So item1's cost is total - sum(additional).
    if (additionalItems.length > 0) {
      const additionalPurchaseTotal = additionalItems.reduce((s, ai) => s + (parseFloat(ai.purchaseCost) || 0), 0);
      const item1Cost = (order.purchaseCost || 0) - additionalPurchaseTotal;
      firstItem.purchaseCost = String(item1Cost > 0 ? item1Cost : order.purchaseCost || "");

      const additionalSellingTotal = additionalItems.reduce((s, ai) => s + (parseFloat(ai.sellingPrice) || 0), 0);
      const item1Selling = (order.sellingPrice || 0) - additionalSellingTotal;
      firstItem.sellingPrice = String(item1Selling > 0 ? item1Selling : order.sellingPrice || "");
    } else {
      firstItem.sellingPrice = String(order.sellingPrice || "");
    }

    setForm({
      customerName: order.customer?.name || "",
      customerPhone: order.phone || order.customer?.phone || "",
      instagram: order.instagramLink || order.customer?.instagram || "",
      governorate: order.governorate || "",
      area: order.area || "",
      batchId: order.batchId || "",
      deliveryCost: String(order.deliveryCost || ""),
      deposit: String(order.deposit || ""),
      status: order.status || "new",
      paymentStatus: order.paymentStatus || "unpaid",
      notes: order.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const firstItem = productItems[0];
      const body = {
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerInstagram: form.instagram.includes("instagram.com/")
          ? form.instagram.match(/instagram\.com\/([^/?#]+)/)?.[1] || form.instagram
          : form.instagram.replace(/^@/, ""),
        productType: firstItem.productType,
        productName: firstItem.productName,
        color: firstItem.color,
        size: firstItem.size,
        instagramLink: form.instagram,
        productLink: firstItem.productLink,
        governorate: form.governorate,
        area: form.area,
        batchId: form.batchId || null,
        purchaseCost: String(totalPurchaseCost),
        sellingPrice: String(totalSellingPrice),
        deliveryCost: form.deliveryCost,
        deposit: form.deposit,
        phone: form.customerPhone,
        status: form.status,
        paymentStatus: form.paymentStatus,
        notes: form.notes,
        images: pickSingleImage(firstItem.fetchedImages, firstItem.selectedImageIdx, firstItem.images),
        items: productItems.length > 1
          ? JSON.stringify(
              productItems.slice(1).map((i) => ({
                productType: i.productType,
                productName: i.productName,
                color: i.color,
                size: i.size,
                purchaseCost: i.purchaseCost,
                sellingPrice: i.sellingPrice,
                productLink: i.productLink,
                images: (() => {
                  const img = pickSingleImage(i.fetchedImages, i.selectedImageIdx, i.images);
                  return img ? JSON.parse(img) : [];
                })(),
              }))
            )
          : null,
      };

      const url = editingOrder ? `/api/orders/${editingOrder.id}` : "/api/orders";
      const method = editingOrder ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setDialogOpen(false);
        fetchOrders();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "فشل في حفظ الطلب");
      }
    } catch {
      alert("خطأ في الشبكة");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (order: Order) => {
    if (!confirm(`هل تريد حذف طلب "${order.customer?.name}"؟`)) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchOrders();
      else {
        const err = await res.json().catch(() => null);
        alert(err?.error || "فشل في حذف الطلب");
      }
    } catch {
      alert("خطأ في الشبكة");
    }
  };

  // -----------------------------------------------------------------------
  // Product Item Card Component
  // -----------------------------------------------------------------------
  const renderProductItemCard = (item: ProductItem, index: number) => {
    const isFetching = fetchingItemId === item.id;

    return (
      <div
        key={item.id}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4 space-y-4"
      >
        {/* Header with item number and delete */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>المنتج {index + 1}</span>
          </div>
          {productItems.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeProductItem(item.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 me-1" />
              حذف المنتج
            </Button>
          )}
        </div>

        {/* Two-column layout: image left + fields right */}
        <div className="flex gap-3 items-stretch">

          {/* Left: main image + thumbnails — stretches to match fields height */}
          <div className="flex flex-col gap-1.5 w-[42%] shrink-0">
            {item.fetchedImages.length > 0 ? (
              <>
                <div className="relative group flex-1 min-h-0">
                  <img
                    src={item.fetchedImages[item.selectedImageIdx ?? 0]}
                    alt="صورة المنتج"
                    className="w-full h-full rounded-lg object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => updateProductItem(item.id, { fetchedImages: [], images: "", selectedImageIdx: 0 })}
                    className="absolute top-1 left-1 bg-black/60 hover:bg-destructive rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {item.fetchedImages.length > 1 && (
                  <div className="flex gap-1 overflow-x-auto shrink-0">
                    {item.fetchedImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => updateProductItem(item.id, { selectedImageIdx: idx })}
                        className={`shrink-0 h-9 w-9 rounded overflow-hidden border-2 transition-all ${
                          idx === (item.selectedImageIdx ?? 0)
                            ? "border-accent"
                            : "border-transparent opacity-50 hover:opacity-80"
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                <ImageIcon className="h-8 w-8 opacity-25" />
              </div>
            )}
          </div>

          {/* Right: fields */}
          <div className="flex flex-col gap-1.5 flex-1">
            {/* رابط */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0 w-14 justify-end">
                <Link2 size={14} className="text-[var(--muted)] shrink-0" />
              </div>
              <div className="relative flex-1">
                <Input
                  value={item.productLink}
                  onChange={(e) => updateProductItem(item.id, { productLink: e.target.value, fetchedImages: [], images: "", selectedImageIdx: 0 })}
                  dir="ltr"
                  placeholder="رابط"
                  className="h-8 text-[13px] text-left pe-7 ps-7"
                />
                {isFetching
                  ? <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
                  : item.productLink && <Link2 className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                }
                <button
                  type="button"
                  onClick={async () => { try { const t = await navigator.clipboard.readText(); updateProductItem(item.id, { productLink: t.trim(), fetchedImages: [], images: "", selectedImageIdx: 0 }); } catch { /* clipboard unavailable */ } }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                  title="لصق"
                >
                  <Clipboard className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* اللون */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0 w-14 justify-end">
                <span className="text-[14px] leading-none text-[var(--muted)]">●</span>
              </div>
              <Input
                value={item.color}
                onChange={(e) => updateProductItem(item.id, { color: e.target.value })}
                placeholder="لون"
                className="h-8 text-[13px] flex-1"
              />
            </div>

            {/* النوع */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0 w-14 justify-end">
                <span className="text-[14px] leading-none text-[var(--muted)]">◈</span>
              </div>
              <Select
                value={item.productType}
                onChange={(e) => updateProductItem(item.id, { productType: e.target.value })}
                className="h-8 text-[13px] flex-1"
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>

            {/* المقاس */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0 w-14 justify-end">
                <span className="text-[14px] leading-none text-[var(--muted)]">⊟</span>
              </div>
              <div className="flex-1 flex items-center gap-1 flex-wrap">
                {item.availableSizes.map((s, si) => (
                  <button
                    key={si}
                    type="button"
                    onClick={() => updateProductItem(item.id, { size: s })}
                    className={`h-8 px-2 rounded text-xs font-medium transition-all shrink-0 ${
                      item.size === s
                        ? "bg-accent text-accent-foreground"
                        : "border border-border hover:border-accent text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <Input
                  value={item.size}
                  onChange={(e) => updateProductItem(item.id, { size: e.target.value })}
                  placeholder="مقاس"
                  className="h-8 text-[13px] flex-1 min-w-[3rem]"
                />
              </div>
            </div>

            {/* شراء ليرة */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0 w-14 justify-end">
                <span className="text-[14px] leading-none font-mono text-[var(--muted)]">₺</span>
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={item.purchaseCost}
                placeholder="شراء"
                className="h-8 text-[13px] flex-1"
                onChange={(e) => {
                  const val = e.target.value;
                  const lira = parseFloat(val) || 0;
                  const converted = lira > 0 ? lookupIQD(lira, rates.usdIqd, rates.usdTry) : 0;
                  updateProductItem(item.id, {
                    purchaseCost: val,
                    sellingPrice: lira > 0 ? String(converted > 0 ? converted : Math.round(lira * (rates.usdIqd / rates.usdTry))) : "",
                  });
                }}
              />
            </div>

            {/* بيع دينار */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 shrink-0 w-14 justify-end">
                <span className="text-[14px] leading-none font-mono text-[var(--muted)]">IQ</span>
              </div>
              <Input
                type="number"
                step="1"
                min="0"
                value={item.sellingPrice}
                placeholder="بيع"
                className="h-8 text-[13px] flex-1"
                onChange={(e) => updateProductItem(item.id, { sellingPrice: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page header */}
      <h1 className="text-2xl font-bold tracking-tight">الطلبات</h1>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            variant={activeTab === tab.value ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.value)}
            className="transition-all duration-200"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative w-full md:max-w-sm">
        <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="البحث في الطلبات..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pe-9"
        />
      </div>

      {/* Orders Table — desktop only */}
      <Card className="card-hover overflow-hidden hidden md:block">
        <CardHeader>
          <CardTitle className="text-lg">
            الطلبات{" "}
            <span className="text-muted-foreground font-normal text-sm">
              ({orders.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground animate-fade-in-up">
              لا توجد طلبات
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap text-start">الصورة</TableHead>
                    <TableHead className="whitespace-nowrap text-start">العميل</TableHead>
                    <TableHead className="whitespace-nowrap text-start">المنتج</TableHead>
                    <TableHead className="whitespace-nowrap text-start">اللون</TableHead>
                    <TableHead className="whitespace-nowrap text-start">المقاس</TableHead>
                    <TableHead className="whitespace-nowrap text-start">رابط</TableHead>
                    <TableHead className="whitespace-nowrap text-start">سعر الشراء</TableHead>
                    <TableHead className="whitespace-nowrap text-start">سعر البيع</TableHead>
                    <TableHead className="whitespace-nowrap text-start">المتبقي</TableHead>
                    <TableHead className="whitespace-nowrap text-start">الحالة</TableHead>
                    <TableHead className="whitespace-nowrap text-start">الدفع</TableHead>
                    <TableHead className="whitespace-nowrap text-start">التاريخ</TableHead>
                    <TableHead className="whitespace-nowrap text-end">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order, idx) => {
                    const remaining = order.sellingPrice + order.deliveryCost - order.deposit;
                    const imgs = order.images ? (() => { try { return JSON.parse(order.images!); } catch { return []; } })() : [];
                    const itemCount = getOrderItemCount(order);
                    const subItems = parseSubItems(order.items);
                    const isExpanded = expandedIds.has(order.id);
                    return (
                      <React.Fragment key={order.id}>
                      <TableRow
                        className="hover:bg-accent/50 transition-colors"
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {imgs.length > 0 ? (
                              <button type="button" onClick={() => setPreviewImg(imgs[0])} className="block shrink-0">
                                <img
                                  src={imgs[0]}
                                  alt=""
                                  className="h-10 w-10 rounded-md object-cover border border-border hover:opacity-80 transition-opacity cursor-zoom-in"
                                />
                              </button>
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            {itemCount > 1 && (
                              <button
                                type="button"
                                onClick={() => toggleExpand(order.id)}
                                className="flex flex-col items-center text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                <span className="text-[10px] font-mono leading-none">+{itemCount - 1}</span>
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {order.customer?.name || "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {PRODUCT_TYPE_LABELS[order.productType] || order.productType}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {order.color || "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {order.size || "-"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {order.productLink ? (
                            <a
                              href={order.productLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              فتح
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatTRY(order.purchaseCost)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatIQD(order.sellingPrice)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatIQD(remaining)}
                        </TableCell>
                        <TableCell>
                          <div
                            className="relative inline-block"
                            ref={statusDropId === order.id ? statusDropRef : undefined}
                          >
                            <button
                              type="button"
                              onClick={() => setStatusDropId(statusDropId === order.id ? null : order.id)}
                              className="cursor-pointer"
                            >
                              <Badge
                                variant={statusBadgeVariant(order.status) as "default" | "secondary" | "destructive" | "outline" | "success" | "warning"}
                                className="badge-animate hover:opacity-80 transition-opacity"
                              >
                                {prettyStatus(order.status)}
                              </Badge>
                            </button>
                            {statusDropId === order.id && (
                              <div className="absolute z-50 top-full mt-1 start-0 rounded-lg shadow-xl overflow-hidden min-w-[9rem]" style={{ backgroundColor: "#1e1e2e", border: "1px solid #333" }}>
                                {STATUS_OPTIONS.map((s) => {
                                  const colors: Record<string, string> = {
                                    new:         "#3b82f6",
                                    in_progress: "#eab308",
                                    bought:      "#a855f7",
                                    shipped:     "#f97316",
                                    delivered:   "#22c55e",
                                  };
                                  const active = order.status === s.value;
                                  return (
                                    <button
                                      key={s.value}
                                      type="button"
                                      onClick={() => updateOrderStatus(order.id, order.status, s.value)}
                                      style={{
                                        backgroundColor: active ? colors[s.value] + "33" : "transparent",
                                        color: colors[s.value] ?? "#e5e7eb",
                                        borderRight: active ? `3px solid ${colors[s.value]}` : "3px solid transparent",
                                      }}
                                      className="w-full text-start px-3 py-2 text-sm font-medium transition-colors hover:brightness-125"
                                    >
                                      {s.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="relative inline-block"
                            ref={paymentDropId === order.id ? paymentDropRef : undefined}
                          >
                            <button
                              type="button"
                              onClick={() => setPaymentDropId(paymentDropId === order.id ? null : order.id)}
                              className="cursor-pointer"
                            >
                              <Badge
                                variant={paymentBadgeVariant(order.paymentStatus) as "default" | "secondary" | "destructive" | "outline" | "success" | "warning"}
                                className="badge-animate hover:opacity-80 transition-opacity"
                              >
                                {prettyStatus(order.paymentStatus)}
                              </Badge>
                            </button>
                            {paymentDropId === order.id && (
                              <div className="absolute z-50 top-full mt-1 start-0 rounded-lg shadow-xl overflow-hidden min-w-[9rem]" style={{ backgroundColor: "#1e1e2e", border: "1px solid #333" }}>
                                {PAYMENT_OPTIONS.map((s) => {
                                  const colors: Record<string, string> = {
                                    unpaid:  "#ef4444",
                                    partial: "#eab308",
                                    paid:    "#22c55e",
                                  };
                                  const active = order.paymentStatus === s.value;
                                  return (
                                    <button
                                      key={s.value}
                                      type="button"
                                      onClick={() => updateOrderPayment(order.id, order.paymentStatus, s.value)}
                                      style={{
                                        backgroundColor: active ? colors[s.value] + "33" : "transparent",
                                        color: colors[s.value] ?? "#e5e7eb",
                                        borderRight: active ? `3px solid ${colors[s.value]}` : "3px solid transparent",
                                      }}
                                      className="w-full text-start px-3 py-2 text-sm font-medium transition-colors hover:brightness-125"
                                    >
                                      {s.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {format(new Date(order.createdAt), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(order)} title="تعديل">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin() && (
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(order)} title="حذف">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            <a
                              href={buildWhatsAppUrl(order)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-9 w-9 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                              title="واتساب"
                            >
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            </a>
                            {buildInstagramUrl(order) && (
                              <a
                                href={buildInstagramUrl(order)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-9 w-9 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                                title="انستغرام"
                              >
                                <Instagram className="h-4 w-4" style={{ color: "#e1306c" }} />
                              </a>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openInvoice(order)} title="فاتورة">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && subItems.map((sub, si) => {
                        const subImg = sub.images?.[0];
                        return (
                          <TableRow key={`${order.id}-sub-${si}`} className="bg-muted/40 border-s-2 border-s-accent/40">
                            <TableCell>
                              {subImg ? (
                                <button type="button" onClick={() => setPreviewImg(subImg)} className="block">
                                  <img src={subImg} alt="" className="h-10 w-10 rounded-md object-cover border border-border hover:opacity-80 transition-opacity cursor-zoom-in" />
                                </button>
                              ) : (
                                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell />
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {PRODUCT_TYPE_LABELS[sub.productType] || sub.productType}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {sub.color || "-"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {sub.size || "-"}
                            </TableCell>
                            <TableCell>
                              {sub.productLink ? (
                                <a href={sub.productLink} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors">
                                  <ExternalLink className="h-3 w-3" />فتح
                                </a>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatTRY(parseFloat(sub.purchaseCost) || 0)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatIQD(parseFloat(sub.sellingPrice) || 0)}
                            </TableCell>
                            <TableCell />
                            <TableCell />
                            <TableCell />
                            <TableCell />
                            <TableCell />
                          </TableRow>
                        );
                      })}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Order Cards — visible only on small screens */}
      <div className="md:hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground animate-fade-in-up">
            لا توجد طلبات
          </div>
        ) : (
          <div className="space-y-3 pb-32">
            {orders.map((order, idx) => {
              const imgs = order.images ? (() => { try { return JSON.parse(order.images!); } catch { return []; } })() : [];
              const itemCount = getOrderItemCount(order);
              const subItems = parseSubItems(order.items);
              const isExpanded = expandedIds.has(order.id);
              return (
                <div
                  key={order.id}
                  className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-3.5 space-y-3 animate-fade-in-up"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  {/* Image + info */}
                  <div className="flex gap-3">
                    <div className="shrink-0 self-start">
                      {imgs.length > 0 ? (
                        <button type="button" onClick={() => setPreviewImg(imgs[0])}>
                          <img
                            src={imgs[0]}
                            alt=""
                            className="h-16 w-16 rounded-xl object-cover border border-[var(--border)] cursor-zoom-in"
                          />
                        </button>
                      ) : (
                        <div className="h-16 w-16 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-[var(--muted)]" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + tappable status badge */}
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm leading-snug truncate text-[var(--foreground)]">
                          {order.customer?.name || "-"}
                        </p>
                        <div
                          className="relative shrink-0"
                          ref={statusDropId === order.id ? statusDropRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={() => setStatusDropId(statusDropId === order.id ? null : order.id)}
                          >
                            <Badge
                              variant={statusBadgeVariant(order.status) as "default" | "secondary" | "destructive" | "outline" | "success" | "warning"}
                              className="hover:opacity-80 transition-opacity"
                            >
                              {prettyStatus(order.status)}
                            </Badge>
                          </button>
                          {statusDropId === order.id && (
                            <div
                              className="absolute z-50 top-full mt-1 end-0 rounded-lg shadow-xl overflow-hidden min-w-[9rem]"
                              style={{ backgroundColor: "#1e1e2e", border: "1px solid #333" }}
                            >
                              {STATUS_OPTIONS.map((s) => {
                                const colors: Record<string, string> = {
                                  new:         "#3b82f6",
                                  in_progress: "#eab308",
                                  bought:      "#a855f7",
                                  shipped:     "#f97316",
                                  delivered:   "#22c55e",
                                };
                                const active = order.status === s.value;
                                return (
                                  <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => updateOrderStatus(order.id, order.status, s.value)}
                                    style={{
                                      backgroundColor: active ? colors[s.value] + "33" : "transparent",
                                      color: colors[s.value] ?? "#e5e7eb",
                                      borderRight: active ? `3px solid ${colors[s.value]}` : "3px solid transparent",
                                    }}
                                    className="w-full text-start px-3 py-2 text-sm font-medium transition-colors hover:brightness-125"
                                  >
                                    {s.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product details */}
                      <div className="mt-1.5 space-y-[5px]">
                        <div className="flex items-center gap-1.5">
                          <Package size={14} className="text-[var(--muted)] shrink-0" />
                          <span className="text-[11px] text-[var(--muted)] opacity-50">نوع</span>
                          <span className="text-[13px] text-[var(--foreground)]">{PRODUCT_TYPE_LABELS[order.productType] || order.productType}</span>
                        </div>
                        {order.color && (
                          <div className="flex items-center gap-1.5">
                            <span className="shrink-0 h-[14px] w-[14px] rounded-full border border-[var(--border)]" style={{ background: order.color }} />
                            <span className="text-[11px] text-[var(--muted)] opacity-50">لون</span>
                            <span className="text-[13px] text-[var(--foreground)]">{order.color}</span>
                          </div>
                        )}
                        {order.size && (
                          <div className="flex items-center gap-1.5">
                            <span className="shrink-0 w-[14px] text-center text-[10px] font-mono leading-none text-[var(--muted)]">SZ</span>
                            <span className="text-[11px] text-[var(--muted)] opacity-50">مقاس</span>
                            <span className="text-[13px] text-[var(--foreground)]">{order.size}</span>
                          </div>
                        )}
                        {order.productLink && (
                          <div className="flex items-center gap-1.5">
                            <ExternalLink size={14} className="text-[var(--muted)] shrink-0" />
                            <span className="text-[11px] text-[var(--muted)] opacity-50">رابط</span>
                            <a href={order.productLink} target="_blank" rel="noopener noreferrer" className="text-[13px] text-blue-500 hover:underline">فتح</a>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 w-[14px] text-center text-[10px] font-mono leading-none text-[var(--muted)]">₺</span>
                          <span className="text-[11px] text-[var(--muted)] opacity-50">شراء</span>
                          <span className="text-[13px] text-[var(--foreground)]">{formatTRY(order.purchaseCost)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="shrink-0 w-[14px] text-center text-[10px] font-mono leading-none" style={{ color: "#c9a84c" }}>IQ</span>
                          <span className="text-[11px] text-[var(--muted)] opacity-50">بيع</span>
                          <span className="text-[13px]" style={{ color: "#c9a84c" }}>{formatIQD(order.sellingPrice)}</span>
                        </div>
                      </div>
                      <span className="mt-1 block text-[11px] text-[var(--muted)] opacity-50">
                        {format(new Date(order.createdAt), "dd/MM/yyyy")}
                      </span>
                    </div>
                  </div>

                  {/* Extra items toggle */}
                  {itemCount > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => toggleExpand(order.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[12px] font-medium transition-colors"
                        style={{ background: "var(--surface-secondary)", color: "var(--muted)" }}
                      >
                        <span>{itemCount - 1}+ منتج إضافي — اضغط للعرض</span>
                        <ChevronDown size={13} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      {isExpanded && subItems.map((sub, si) => (
                        <div key={si} className="rounded-xl p-3 space-y-1.5" style={{ background: "var(--surface-secondary)", border: "1px solid var(--border)" }}>
                          <div className="flex items-center gap-2">
                            {sub.images?.[0] && (
                              <button type="button" onClick={() => setPreviewImg(sub.images![0])}>
                                <img src={sub.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover border border-[var(--border)] cursor-zoom-in" />
                              </button>
                            )}
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <span className="text-[13px] font-medium text-[var(--foreground)]">{PRODUCT_TYPE_LABELS[sub.productType] || sub.productType}</span>
                              {sub.color && <p className="text-[11px] text-[var(--muted)]">{sub.color}{sub.size ? ` · ${sub.size}` : ""}</p>}
                            </div>
                            {sub.productLink && (
                              <a href={sub.productLink} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                                <ExternalLink size={10} />فتح
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Actions row */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-[var(--border)]/40">
                    <div className="flex items-center gap-0.5">
                      <a
                        href={buildWhatsAppUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center h-9 w-9 rounded-xl hover:bg-[var(--surface-secondary)] transition-colors"
                        title="واتساب"
                      >
                        <MessageCircle className="h-4 w-4 text-green-600" />
                      </a>
                      {buildInstagramUrl(order) && (
                        <a
                          href={buildInstagramUrl(order)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center h-9 w-9 rounded-xl hover:bg-[var(--surface-secondary)] transition-colors"
                          title="انستغرام"
                        >
                          <Instagram className="h-4 w-4" style={{ color: "#e1306c" }} />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEdit(order)}
                        className="flex items-center justify-center h-9 w-9 rounded-xl hover:bg-[var(--surface-secondary)] transition-colors"
                        title="تعديل"
                      >
                        <Pencil className="h-4 w-4 text-[var(--muted)]" />
                      </button>
                      {isAdmin() && (
                        <button
                          type="button"
                          onClick={() => handleDelete(order)}
                          className="flex items-center justify-center h-9 w-9 rounded-xl hover:bg-red-500/10 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      )}
                    </div>
                    {order.productLink ? (
                      <a
                        href={order.productLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--surface-secondary)] transition-colors text-[var(--foreground)]"
                      >
                        <ExternalLink className="h-3 w-3" />
                        فتح
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? "تعديل الطلب" : "طلب جديد"}
            </DialogTitle>
            <DialogClose onClose={() => setDialogOpen(false)} />
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-3 space-y-4">
            {/* Customer */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="customerName" className="text-xs">الاسم *</Label>
                  <Input id="customerName" required value={form.customerName} onChange={(e) => setField("customerName", e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customerPhone" className="text-xs">الهاتف</Label>
                  <Input id="customerPhone" value={form.customerPhone} onChange={(e) => setField("customerPhone", e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="instagram" className="text-xs">انستغرام</Label>
                <div className="relative">
                  <Input id="instagram" dir="ltr" className="h-8 text-sm text-left pr-8" value={form.instagram} onChange={(e) => setField("instagram", e.target.value)} />
                  {fetchingIG && <Loader2 className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />}
                  <button
                    type="button"
                    onClick={async () => { try { const t = await navigator.clipboard.readText(); setField("instagram", t.trim()); } catch { /* clipboard unavailable */ } }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    title="لصق"
                  >
                    <Clipboard className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Product Items */}
            <div className="space-y-3">
              {productItems.map((item, index) => renderProductItemCard(item, index))}
              <button
                type="button"
                onClick={addProductItem}
                className="w-full border border-dashed border-border rounded-lg p-2 text-center text-xs text-muted-foreground hover:border-accent hover:text-accent transition-all"
              >
                <Plus className="h-3 w-3 inline-block me-1" />
                إضافة منتج آخر
              </button>
              {productItems.length > 1 && (
                <div className="rounded-lg bg-muted/50 px-3 py-1.5 text-xs border border-border/50 flex gap-5">
                  <span><span className="text-muted-foreground">الشراء: </span><span className="font-semibold">{formatTRY(totalPurchaseCost)}</span></span>
                  <span><span className="text-muted-foreground">البيع: </span><span className="font-semibold">{formatIQD(totalSellingPrice)}</span></span>
                </div>
              )}
            </div>

            {/* Location & Batch */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="governorate" className="text-xs">المحافظة</Label>
                <Select id="governorate" value={form.governorate} onChange={(e) => setField("governorate", e.target.value)} className="h-8 text-sm">
                  <option value="">—</option>
                  {IRAQI_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="area" className="text-xs">المنطقة</Label>
                <Input id="area" value={form.area} onChange={(e) => setField("area", e.target.value)} className="h-8 text-sm" style={{ height: "2rem" }} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="batchId" className="text-xs">الشحنة</Label>
                <Select id="batchId" value={form.batchId} onChange={(e) => setField("batchId", e.target.value)} className="h-8 text-sm">
                  <option value="">—</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </div>
            </div>

            {/* Pricing + Total */}
            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="space-y-1">
                <Label htmlFor="deliveryCost" className="text-xs">توصيل</Label>
                <Select id="deliveryCost" value={form.deliveryCost} onChange={(e) => setField("deliveryCost", e.target.value)} className="h-8 text-sm">
                  <option value="">—</option>
                  {DELIVERY_COSTS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="deposit" className="text-xs">عربون</Label>
                <Input id="deposit" type="number" step="1" min="0" value={form.deposit} onChange={(e) => setField("deposit", e.target.value)} className="h-8 text-sm" style={{ height: "2rem" }} />
              </div>
              <div className="rounded-xl flex flex-col items-center justify-center gap-1 py-3"
                style={{ background: "#f0fdf4", border: "1px solid #86efac", color: "#166534", minHeight: "4rem" }}>
                <span className="text-[10px] font-medium opacity-60">السعر الكلي</span>
                <span className="text-sm font-bold">{formatIQD(finalPrice)}</span>
              </div>
            </div>

            {/* Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="status" className="text-xs">الحالة</Label>
                <Select id="status" value={form.status} onChange={(e) => setField("status", e.target.value)} className="h-8 text-sm">
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="paymentStatus" className="text-xs">الدفع</Label>
                <Select id="paymentStatus" value={form.paymentStatus} onChange={(e) => setField("paymentStatus", e.target.value)} className="h-8 text-sm">
                  {PAYMENT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs">ملاحظات</Label>
              <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => setField("notes", e.target.value)} className="text-sm resize-none" />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>إلغاء</Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2 className="me-2 h-3 w-3 animate-spin" />}
                {editingOrder ? "حفظ" : "إنشاء"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image preview modal */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          onClick={() => setPreviewImg(null)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImg}
              alt=""
              className="max-w-sm max-h-[70vh] rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewImg(null)}
              className="absolute -top-2.5 -right-2.5 bg-background border border-border rounded-full p-1 shadow hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
