"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, ImageIcon } from "lucide-react";
import { useAuthStore } from "@/store/auth";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Order {
  id: string;
  createdAt: string;
  status: string;
  customer: { name: string; phone?: string; instagram?: string };
  productType: string;
  productLink?: string;
  images?: string;
  color?: string;
  size?: string;
  purchaseCost: number;
  sellingPrice: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  Bag: "حقيبة",
  Shoe: "حذاء",
  Clothing: "ملابس",
  Accessory: "إكسسوار",
  Other: "أخرى",
};

const STATUS_CYCLE = ["new", "in_progress", "bought", "shipped", "delivered"] as const;
type StatusKey = (typeof STATUS_CYCLE)[number];

const STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  in_progress: "قيد التنفيذ",
  bought: "تم الشراء",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
};

const STATUS_COLORS: Record<string, string> = {
  new:         "bg-blue-100   text-blue-700   hover:bg-blue-200",
  in_progress: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
  bought:      "bg-purple-100 text-purple-700 hover:bg-purple-200",
  shipped:     "bg-orange-100 text-orange-700 hover:bg-orange-200",
  delivered:   "bg-green-100  text-green-700  hover:bg-green-200",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function advanceStatus(current: string): string {
  const idx = STATUS_CYCLE.indexOf(current as StatusKey);
  return STATUS_CYCLE[idx === -1 ? 0 : (idx + 1) % STATUS_CYCLE.length];
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`;
}

function firstImage(images?: string): string | null {
  if (!images) return null;
  try { return (JSON.parse(images) as string[])[0] ?? null; } catch { return null; }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrdersPage() {
  const { token } = useAuthStore();
  const [orders, setOrders]       = useState<Order[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((data: Order[]) => setOrders(data))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Inline status cycle ──────────────────────────────────────────────────
  const cycleStatus = useCallback(
    async (id: string, current: string) => {
      const next = advanceStatus(current);
      setUpdatingId(id);
      // Optimistic update
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: next } : o)));
      try {
        const res = await fetch(`/api/orders/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error();
      } catch {
        // Revert on failure
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: current } : o)));
      } finally {
        setUpdatingId(null);
      }
    },
    [token]
  );

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading) return <p className="p-8 text-muted-foreground">جارٍ التحميل…</p>;
  if (error)   return <p className="p-8 text-destructive">{error}</p>;

  // ── Table ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">الطلبات</h1>
        <span className="text-sm text-muted-foreground">{orders.length} طلب</span>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted text-muted-foreground border-b border-border">
              <th className="px-2 py-2 text-start w-12">صورة</th>
              <th className="px-2 py-2 text-start w-16">النوع</th>
              <th className="px-2 py-2 text-start">اللون</th>
              <th className="px-2 py-2 text-start w-14">المقاس</th>
              <th className="px-2 py-2 text-start w-16">التاريخ</th>
              <th className="px-2 py-2 text-start">العميل</th>
              <th className="px-2 py-2 text-start w-16">شراء ₺</th>
              <th className="px-2 py-2 text-start w-20">بيع د.ع</th>
              <th className="px-2 py-2 text-start w-12">رابط</th>
              <th className="px-2 py-2 text-start w-24">الحالة</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {orders.map((o) => {
              const img = firstImage(o.images);
              return (
                <tr key={o.id} className="hover:bg-accent/30 transition-colors">

                  {/* Image */}
                  <td className="px-2 py-1.5">
                    {img ? (
                      <img src={img} alt="" className="h-10 w-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </td>

                  {/* Type */}
                  <td className="px-2 py-1.5 font-medium">
                    {TYPE_LABELS[o.productType] ?? o.productType}
                  </td>

                  {/* Color */}
                  <td className="px-2 py-1.5 text-muted-foreground">{o.color || "—"}</td>

                  {/* Size */}
                  <td className="px-2 py-1.5 text-muted-foreground">{o.size || "—"}</td>

                  {/* Date */}
                  <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">
                    {fmtDate(o.createdAt)}
                  </td>

                  {/* Customer + copy */}
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-medium truncate max-w-[6rem]">{o.customer.name}</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(o.customer.name)}
                        title="نسخ"
                        className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </td>

                  {/* Purchase price */}
                  <td className="px-2 py-1.5 font-mono">{o.purchaseCost.toLocaleString()}</td>

                  {/* Sale price */}
                  <td className="px-2 py-1.5 font-mono">{o.sellingPrice.toLocaleString()}</td>

                  {/* Link */}
                  <td className="px-2 py-1.5">
                    {o.productLink ? (
                      <a
                        href={o.productLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-accent hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        فتح
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>

                  {/* Status badge — cycles on click */}
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      disabled={updatingId === o.id}
                      onClick={() => cycleStatus(o.id, o.status)}
                      className={`px-2 py-0.5 rounded-full font-medium transition-colors whitespace-nowrap
                        ${STATUS_COLORS[o.status] ?? "bg-muted text-muted-foreground hover:bg-muted/80"}
                        ${updatingId === o.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {STATUS_LABELS[o.status] ?? o.status}
                    </button>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>

        {orders.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">لا توجد طلبات</p>
        )}
      </div>
    </div>
  );
}
