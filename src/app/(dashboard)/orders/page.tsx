"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";

// ---------------------------------------------------------------------------
// Types — mapped to DB fields
// ---------------------------------------------------------------------------

interface Order {
  id: string;
  createdAt: string;
  status: string;
  customer: {
    name: string;
    phone?: string;
    instagram?: string;
  };
  // product
  productType: string;
  productLink?: string;
  images?: string;   // JSON-encoded string: ["url"]
  color?: string;
  size?: string;
  // pricing
  purchaseCost: number;   // DB: purchaseCost  (TRY)
  sellingPrice: number;   // DB: sellingPrice  (IQD)
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OrdersPage() {
  const { token } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);

    fetch("/api/orders", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Order[]>;
      })
      .then((data) => {
        // API already returns newest-first (orderBy createdAt desc)
        setOrders(data);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [token]);

  // ── minimal confirmation view ────────────────────────────────────────────
  if (loading) return <p className="p-8 text-muted-foreground">جارٍ التحميل…</p>;
  if (error)   return <p className="p-8 text-destructive">{error}</p>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">الطلبات — {orders.length} نتيجة</h1>

      <div className="overflow-x-auto rounded border border-border text-xs">
        <table className="w-full">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              {["#", "التاريخ", "الحالة", "العميل", "النوع", "اللون", "المقاس", "شراء ₺", "بيع د.ع"].map((h) => (
                <th key={h} className="px-3 py-2 text-start font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => {
              const image = (() => { try { return JSON.parse(o.images || "[]")[0]; } catch { return null; } })();
              return (
                <tr key={o.id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(o.createdAt).toLocaleDateString("ar-IQ")}
                  </td>
                  <td className="px-3 py-2">{o.status}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div>{o.customer.name}</div>
                    {o.customer.phone && <div className="text-muted-foreground">{o.customer.phone}</div>}
                  </td>
                  <td className="px-3 py-2">{o.productType}</td>
                  <td className="px-3 py-2">{o.color || "—"}</td>
                  <td className="px-3 py-2">{o.size || "—"}</td>
                  <td className="px-3 py-2">{o.purchaseCost}</td>
                  <td className="px-3 py-2">{o.sellingPrice}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm sort order */}
      {orders.length >= 2 && (
        <p className="text-xs text-muted-foreground">
          ترتيب: {new Date(orders[0].createdAt).toLocaleDateString("ar-IQ")} →{" "}
          {new Date(orders[orders.length - 1].createdAt).toLocaleDateString("ar-IQ")} (الأحدث أولاً)
        </p>
      )}
    </div>
  );
}
