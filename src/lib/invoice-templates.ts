import { format } from "date-fns";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvoiceOrderData {
  id: string;
  createdAt: string;
  customer?: { name?: string; phone?: string } | null;
  phone?: string;
  governorate?: string;
  area?: string;
  productType: string;
  productName?: string;
  color?: string;
  size?: string;
  sellingPrice: number;
  deliveryCost: number;
  deposit: number;
  status: string;
  paymentStatus: string;
  notes?: string;
  images?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_AR: Record<string, string> = {
  new: "جديد", in_progress: "قيد التنفيذ", bought: "تم الشراء",
  shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغي",
  unpaid: "غير مدفوع", partial: "دفع جزئي", paid: "مدفوع",
};

const TYPE_AR: Record<string, string> = {
  Bag: "حقيبة", Shoe: "حذاء", Clothing: "ملابس", Accessory: "إكسسوار", Other: "أخرى",
};

function fmtIQD(n: number): string {
  return new Intl.NumberFormat("ar-IQ", {
    style: "currency", currency: "IQD", minimumFractionDigits: 0,
  }).format(n);
}

// ---------------------------------------------------------------------------
// Variable builder — converts Order to flat key/value map
// ---------------------------------------------------------------------------

export function buildInvoiceVars(order: InvoiceOrderData, storeName: string): Record<string, string> {
  const phone = order.phone || order.customer?.phone || "";
  const remaining = order.sellingPrice + order.deliveryCost - order.deposit;
  const images: string[] = order.images
    ? (() => { try { return JSON.parse(order.images!); } catch { return []; } })()
    : [];

  const productImageHtml = images.length > 0
    ? `<div style="text-align:center;margin:20px 0"><img src="${images[0]}" style="max-width:200px;max-height:200px;border-radius:12px;border:2px solid #e5e7eb;object-fit:cover"/></div>`
    : "";

  const notesHtml = order.notes
    ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:20px 0;font-size:13px;color:#92400e;direction:rtl;line-height:1.6"><strong>ملاحظات: </strong>${order.notes}</div>`
    : "";

  return {
    STORE_NAME: storeName,
    ORDER_ID: order.id.slice(0, 8).toUpperCase(),
    ORDER_DATE: format(new Date(order.createdAt), "dd/MM/yyyy"),
    CUSTOMER_NAME: order.customer?.name || "-",
    CUSTOMER_PHONE: phone || "-",
    LOCATION: [order.governorate, order.area].filter(Boolean).join("، ") || "-",
    PRODUCT_IMAGE_HTML: productImageHtml,
    PRODUCT_TYPE: TYPE_AR[order.productType] || order.productType || "-",
    PRODUCT_NAME: order.productName || "-",
    COLOR: order.color || "-",
    SIZE: order.size || "-",
    SELLING_PRICE: fmtIQD(order.sellingPrice),
    DELIVERY_COST: fmtIQD(order.deliveryCost),
    DEPOSIT: fmtIQD(order.deposit),
    REMAINING: fmtIQD(remaining),
    STATUS: STATUS_AR[order.status] || order.status,
    PAYMENT_STATUS: STATUS_AR[order.paymentStatus] || order.paymentStatus,
    NOTES: order.notes || "",
    NOTES_HTML: notesHtml,
  };
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (html, [key, value]) => html.split(`{{${key}}}`).join(value ?? ""),
    template,
  );
}

// ---------------------------------------------------------------------------
// Template: Classic — أنيق أبيض وأسود
// ---------------------------------------------------------------------------

export const CLASSIC_TEMPLATE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>فاتورة - {{ORDER_ID}}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,sans-serif;padding:40px;color:#111;max-width:760px;margin:0 auto;direction:rtl;background:#fff}
.header{text-align:center;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #111}
.header h1{font-size:30px;font-weight:800;letter-spacing:2px}
.header .sub{color:#666;font-size:13px;margin-top:4px}
.order-badge{display:inline-block;background:#f4f4f4;border:1px solid #ddd;border-radius:6px;padding:3px 12px;font-size:12px;font-family:monospace;margin-top:8px;color:#444}
.sec{margin-bottom:20px}
.sec-title{font-size:10px;font-weight:700;letter-spacing:1.5px;color:#aaa;text-transform:uppercase;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #f0f0f0}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 32px}
.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ebebeb;font-size:13px}
.row:last-child{border-bottom:none}
.lbl{color:#888;font-weight:500}
.val{font-weight:600}
.totals{background:#f8f8f8;border-radius:10px;padding:16px 20px;margin-top:24px;border:1px solid #eee}
.total-final{padding-top:12px;margin-top:4px;border-top:2px solid #ddd;font-size:17px;font-weight:800}
.footer{text-align:center;margin-top:40px;color:#bbb;font-size:12px;border-top:1px solid #f0f0f0;padding-top:20px}
@media print{body{padding:20px}}
</style>
</head>
<body>
<div class="header">
  <h1>{{STORE_NAME}}</h1>
  <p class="sub">فاتورة بيع</p>
  <span class="order-badge">#{{ORDER_ID}}</span>
</div>
{{PRODUCT_IMAGE_HTML}}
<div class="sec">
  <div class="sec-title">معلومات الطلب</div>
  <div class="grid">
    <div>
      <div class="row"><span class="lbl">رقم الطلب</span><span class="val">#{{ORDER_ID}}</span></div>
      <div class="row"><span class="lbl">الحالة</span><span class="val">{{STATUS}}</span></div>
    </div>
    <div>
      <div class="row"><span class="lbl">التاريخ</span><span class="val">{{ORDER_DATE}}</span></div>
      <div class="row"><span class="lbl">الدفع</span><span class="val">{{PAYMENT_STATUS}}</span></div>
    </div>
  </div>
</div>
<div class="sec">
  <div class="sec-title">معلومات العميل</div>
  <div class="grid">
    <div>
      <div class="row"><span class="lbl">الاسم</span><span class="val">{{CUSTOMER_NAME}}</span></div>
    </div>
    <div>
      <div class="row"><span class="lbl">الهاتف</span><span class="val">{{CUSTOMER_PHONE}}</span></div>
      <div class="row"><span class="lbl">الموقع</span><span class="val">{{LOCATION}}</span></div>
    </div>
  </div>
</div>
<div class="sec">
  <div class="sec-title">المنتج</div>
  <div class="grid">
    <div>
      <div class="row"><span class="lbl">النوع</span><span class="val">{{PRODUCT_TYPE}}</span></div>
      <div class="row"><span class="lbl">اللون</span><span class="val">{{COLOR}}</span></div>
    </div>
    <div>
      <div class="row"><span class="lbl">الاسم</span><span class="val">{{PRODUCT_NAME}}</span></div>
      <div class="row"><span class="lbl">المقاس</span><span class="val">{{SIZE}}</span></div>
    </div>
  </div>
</div>
<div class="totals">
  <div class="sec-title">الأسعار</div>
  <div class="row"><span class="lbl">سعر البيع</span><span class="val">{{SELLING_PRICE}}</span></div>
  <div class="row"><span class="lbl">التوصيل</span><span class="val">{{DELIVERY_COST}}</span></div>
  <div class="row"><span class="lbl">العربون</span><span class="val">- {{DEPOSIT}}</span></div>
  <div class="row total-final"><span class="lbl">المتبقي للدفع</span><span class="val">{{REMAINING}}</span></div>
</div>
{{NOTES_HTML}}
<div class="footer">
  <p>شكراً لتسوقكم من {{STORE_NAME}}</p>
  <p style="margin-top:4px">{{ORDER_DATE}}</p>
</div>
<script>window.onload=function(){window.print()}</script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Template: Modern — احترافي بخلفية داكنة
// ---------------------------------------------------------------------------

export const MODERN_TEMPLATE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>فاتورة - {{ORDER_ID}}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,sans-serif;background:#f1f5f9;min-height:100vh;direction:rtl}
.wrapper{max-width:720px;margin:0 auto;padding:32px 16px}
.header{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);border-radius:16px 16px 0 0;padding:28px 32px;color:#fff;display:flex;justify-content:space-between;align-items:center}
.header h1{font-size:24px;font-weight:800;letter-spacing:1px}
.header .meta{text-align:left;font-size:12px;color:#94a3b8;line-height:1.8}
.header .meta strong{color:#e2e8f0;display:block;font-size:14px}
.body{background:#fff;padding:28px 32px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.08)}
.img-row{text-align:center;margin-bottom:20px}
.img-row img{max-width:160px;max-height:160px;border-radius:12px;border:2px solid #e2e8f0;object-fit:cover}
.card{border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:16px}
.card-title{font-size:10px;font-weight:700;letter-spacing:1.5px;color:#94a3b8;text-transform:uppercase;margin-bottom:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px}
.field{font-size:13px;padding:5px 0;border-bottom:1px solid #f1f5f9}
.field:last-child{border-bottom:none}
.field .k{color:#64748b;font-weight:500}
.field .v{font-weight:600;color:#0f172a}
.prices{background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:12px;padding:16px 20px;margin-bottom:16px}
.prices .card-title{color:#16a34a}
.price-row{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid #bbf7d0}
.price-row:last-child{border-bottom:none;font-size:18px;font-weight:800;color:#15803d;padding-top:10px;margin-top:4px;border-top:2px solid #86efac}
.badges{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}
.badge-status{background:#dbeafe;color:#1d4ed8}
.badge-payment{background:#fef9c3;color:#a16207}
.badge-payment.paid{background:#dcfce7;color:#15803d}
.footer{text-align:center;padding:20px 0 4px;color:#94a3b8;font-size:12px}
@media print{body{background:#fff}.wrapper{padding:0}.header{border-radius:0}.body{box-shadow:none;border-radius:0}}
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div>
      <h1>{{STORE_NAME}}</h1>
      <p style="color:#94a3b8;font-size:13px;margin-top:4px">فاتورة بيع</p>
    </div>
    <div class="meta">
      <strong>#{{ORDER_ID}}</strong>
      {{ORDER_DATE}}
    </div>
  </div>
  <div class="body">
    {{PRODUCT_IMAGE_HTML}}
    <div class="badges">
      <span class="badge badge-status">{{STATUS}}</span>
      <span class="badge badge-payment">{{PAYMENT_STATUS}}</span>
    </div>
    <div class="card">
      <div class="card-title">معلومات العميل</div>
      <div class="grid">
        <div class="field"><span class="k">الاسم</span><br/><span class="v">{{CUSTOMER_NAME}}</span></div>
        <div class="field"><span class="k">الهاتف</span><br/><span class="v">{{CUSTOMER_PHONE}}</span></div>
        <div class="field"><span class="k">الموقع</span><br/><span class="v">{{LOCATION}}</span></div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">تفاصيل المنتج</div>
      <div class="grid">
        <div class="field"><span class="k">النوع</span><br/><span class="v">{{PRODUCT_TYPE}}</span></div>
        <div class="field"><span class="k">الاسم</span><br/><span class="v">{{PRODUCT_NAME}}</span></div>
        <div class="field"><span class="k">اللون</span><br/><span class="v">{{COLOR}}</span></div>
        <div class="field"><span class="k">المقاس</span><br/><span class="v">{{SIZE}}</span></div>
      </div>
    </div>
    <div class="prices">
      <div class="card-title">الأسعار</div>
      <div class="price-row"><span>سعر البيع</span><span>{{SELLING_PRICE}}</span></div>
      <div class="price-row"><span>التوصيل</span><span>{{DELIVERY_COST}}</span></div>
      <div class="price-row"><span>العربون المدفوع</span><span>- {{DEPOSIT}}</span></div>
      <div class="price-row"><span>المتبقي للدفع</span><span>{{REMAINING}}</span></div>
    </div>
    {{NOTES_HTML}}
    <div class="footer">
      <p>شكراً لتسوقكم من {{STORE_NAME}} ❤️</p>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Template: Minimal — بسيط كإيصال
// ---------------------------------------------------------------------------

export const MINIMAL_TEMPLATE = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"/>
<title>فاتورة - {{ORDER_ID}}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Courier New',Courier,monospace;padding:40px;color:#222;max-width:480px;margin:0 auto;direction:rtl;background:#fff;font-size:13px}
.center{text-align:center}
h1{font-size:18px;font-weight:700;letter-spacing:3px;text-transform:uppercase}
.divider{border:none;border-top:1px dashed #999;margin:12px 0}
.divider-solid{border:none;border-top:2px solid #222;margin:12px 0}
.sec-title{font-size:11px;font-weight:700;letter-spacing:1px;margin:10px 0 6px;color:#555}
.row{display:flex;justify-content:space-between;padding:3px 0}
.lbl{color:#555}
.val{font-weight:700}
.big{font-size:16px;font-weight:800}
@media print{body{padding:20px}}
</style>
</head>
<body>
<div class="center">
  <h1>{{STORE_NAME}}</h1>
  <p style="font-size:11px;color:#666;margin-top:4px">فاتورة بيع</p>
</div>
<hr class="divider-solid"/>
<div class="row"><span class="lbl">رقم الطلب</span><span class="val">#{{ORDER_ID}}</span></div>
<div class="row"><span class="lbl">التاريخ</span><span class="val">{{ORDER_DATE}}</span></div>
<div class="row"><span class="lbl">الحالة</span><span class="val">{{STATUS}}</span></div>
<div class="row"><span class="lbl">الدفع</span><span class="val">{{PAYMENT_STATUS}}</span></div>
<hr class="divider"/>
<div class="sec-title">العميل</div>
<div class="row"><span class="lbl">الاسم</span><span class="val">{{CUSTOMER_NAME}}</span></div>
<div class="row"><span class="lbl">الهاتف</span><span class="val">{{CUSTOMER_PHONE}}</span></div>
<div class="row"><span class="lbl">الموقع</span><span class="val">{{LOCATION}}</span></div>
<hr class="divider"/>
<div class="sec-title">المنتج</div>
<div class="row"><span class="lbl">النوع</span><span class="val">{{PRODUCT_TYPE}}</span></div>
<div class="row"><span class="lbl">الاسم</span><span class="val">{{PRODUCT_NAME}}</span></div>
<div class="row"><span class="lbl">اللون</span><span class="val">{{COLOR}}</span></div>
<div class="row"><span class="lbl">المقاس</span><span class="val">{{SIZE}}</span></div>
<hr class="divider"/>
<div class="sec-title">الأسعار</div>
<div class="row"><span class="lbl">سعر البيع</span><span class="val">{{SELLING_PRICE}}</span></div>
<div class="row"><span class="lbl">التوصيل</span><span class="val">{{DELIVERY_COST}}</span></div>
<div class="row"><span class="lbl">العربون</span><span class="val">- {{DEPOSIT}}</span></div>
<hr class="divider-solid"/>
<div class="row big"><span>المتبقي</span><span>{{REMAINING}}</span></div>
{{NOTES_HTML}}
<hr class="divider"/>
<div class="center" style="margin-top:16px;font-size:12px;color:#888">
  <p>شكراً لتسوقكم من {{STORE_NAME}}</p>
</div>
<script>window.onload=function(){window.print()}</script>
</body>
</html>`;

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

export const INVOICE_TEMPLATES = [
  { id: "classic", nameAr: "كلاسيكي", nameEn: "Classic", descAr: "أنيق بالأبيض والأسود", descEn: "Elegant black & white", template: CLASSIC_TEMPLATE },
  { id: "modern",  nameAr: "عصري",    nameEn: "Modern",  descAr: "احترافي بخلفية داكنة", descEn: "Professional dark header", template: MODERN_TEMPLATE },
  { id: "minimal", nameAr: "بسيط",    nameEn: "Minimal", descAr: "إيصال نصي بسيط", descEn: "Simple text receipt", template: MINIMAL_TEMPLATE },
] as const;

export type TemplateId = typeof INVOICE_TEMPLATES[number]["id"];

// Sample order for settings preview
export const SAMPLE_INVOICE_ORDER: InvoiceOrderData = {
  id: "DEMO12345678",
  createdAt: new Date().toISOString(),
  customer: { name: "أحمد محمد علي", phone: "+964 770 123 4567" },
  phone: "+964 770 123 4567",
  governorate: "بغداد",
  area: "المنصور",
  productType: "Bag",
  productName: "حقيبة يد كلاسيكية",
  color: "أسود",
  size: "M",
  sellingPrice: 65000,
  deliveryCost: 5000,
  deposit: 20000,
  status: "shipped",
  paymentStatus: "partial",
  notes: "يرجى التواصل قبل التسليم",
  images: "",
};
