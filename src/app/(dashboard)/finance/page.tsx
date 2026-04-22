"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { formatIQD, formatUSD, formatTRY } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  Truck,
  Calculator,
  MessageCircle,
} from "lucide-react";

interface Order {
  id: string;
  productName: string;
  sellingPrice: number;
  purchaseCost: number;
  deposit: number;
  deliveryCost: number;
  status: string;
  paymentStatus: string;
  phone: string | null;
  batchId: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  batch: {
    id: string;
    name: string;
    shippingCost: number;
  } | null;
}

interface Batch {
  id: string;
  name: string;
  shippingCost: number;
  _count: { orders: number };
}

interface Settings {
  usdToTry: number;
  usdToIqd: number;
  tryToIqd: number;
}

export default function FinancePage() {
  const { isAdmin } = useAuthStore();
  const t = useT();
  const paymentLabels: Record<string, string> = { ...t.orders.status };
  const [orders, setOrders] = useState<Order[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ordersRes, batchesRes, settingsRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/batches"),
          fetch("/api/settings"),
        ]);

        if (ordersRes.ok) setOrders(await ordersRes.json());
        if (batchesRes.ok) setBatches(await batchesRes.json());
        if (settingsRes.ok) setSettings(await settingsRes.json());
      } catch (err) {
        console.error("Failed to fetch finance data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">{t.settings.adminRequired}</p>
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">{t.finance.loading}</p>
      </div>
    );
  }

  const { tryToIqd, usdToIqd } = settings;

  // Calculate finances
  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + o.sellingPrice, 0);

  const totalCostsTRY = orders.reduce((sum, o) => sum + o.purchaseCost, 0);
  const totalCostsIQD = totalCostsTRY * tryToIqd;

  // Shipping costs per batch, distributed across orders
  const batchMap = new Map(batches.map((b) => [b.id, b]));
  const totalShippingUSD = batches.reduce((sum, b) => sum + b.shippingCost, 0);
  const totalShippingIQD = totalShippingUSD * usdToIqd;

  const netProfit = totalRevenue - totalCostsIQD - totalShippingIQD;

  // Outstanding debts: orders where customer still owes money
  const debts = orders.filter((o) => {
    const owed = o.sellingPrice - o.deposit;
    return owed > 0 && o.paymentStatus !== "paid";
  });

  const totalDebt = debts.reduce(
    (sum, o) => sum + (o.sellingPrice - o.deposit),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          {t.finance.title}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t.finance.subtitle}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.finance.stats.revenue}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatIQD(totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.finance.stats.revenueSub(paidOrders.length)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.finance.stats.costs}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatIQD(totalCostsIQD)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.finance.stats.costsSub(formatTRY(totalCostsTRY), tryToIqd)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t.finance.stats.shipping}
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">
              {formatIQD(totalShippingIQD)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.finance.stats.shippingSub(formatUSD(totalShippingUSD), usdToIqd)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.finance.stats.profit}</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-bold ${
                netProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatIQD(netProfit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t.finance.stats.profitSub}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Debts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t.finance.debts.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t.finance.debts.subtitle(debts.length, formatIQD(totalDebt))}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {debts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">
                {t.finance.debts.empty}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.finance.debts.colCustomer}</TableHead>
                  <TableHead>{t.finance.debts.colProduct}</TableHead>
                  <TableHead className="text-start">{t.finance.debts.colTotal}</TableHead>
                  <TableHead className="text-start">{t.finance.debts.colDeposit}</TableHead>
                  <TableHead className="text-start">{t.finance.debts.colOwed}</TableHead>
                  <TableHead>{t.finance.debts.colPhone}</TableHead>
                  <TableHead>{t.finance.debts.colPayment}</TableHead>
                  <TableHead className="text-start">{t.finance.debts.colContact}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debts.map((order) => {
                  const owed = order.sellingPrice - order.deposit;
                  const phone =
                    order.customer?.phone || order.phone || "";
                  const whatsappUrl = phone
                    ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}`
                    : null;

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.customer?.name || t.finance.debts.unknown}
                      </TableCell>
                      <TableCell>{order.productName}</TableCell>
                      <TableCell className="text-start">
                        {formatIQD(order.sellingPrice)}
                      </TableCell>
                      <TableCell className="text-start">
                        {formatIQD(order.deposit)}
                      </TableCell>
                      <TableCell className="text-start font-semibold text-red-600">
                        {formatIQD(owed)}
                      </TableCell>
                      <TableCell>{phone || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.paymentStatus === "partial"
                              ? "warning"
                              : "destructive"
                          }
                        >
                          {paymentLabels[order.paymentStatus] || order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-start">
                        {whatsappUrl ? (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground"
                          >
                            <MessageCircle className="h-4 w-4 text-green-600" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
