import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Clearing existing simulation data...");
  await prisma.order.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.customer.deleteMany();

  // ── Customers ──────────────────────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.create({ data: { name: "أحمد محمد الكناني", instagram: "ahmed_kanani", phone: "07701234567", city: "بغداد", area: "الكرادة" } }),
    prisma.customer.create({ data: { name: "فاطمة علي الموسوي", instagram: "fatima.mosawy", phone: "07709876543", city: "البصرة", area: "العشار" } }),
    prisma.customer.create({ data: { name: "زينب حسين الخفاجي", instagram: "zainab.khafaji", phone: "07705551234", city: "أربيل", area: "عينكاوة" } }),
    prisma.customer.create({ data: { name: "محمد كريم الجبوري", instagram: "mk_jbouri", phone: "07708887766", city: "النجف", area: "المركز" } }),
    prisma.customer.create({ data: { name: "نور الهدى الربيعي", instagram: "noor.rabiee", phone: "07703334455", city: "كربلاء", area: "المركز" } }),
    prisma.customer.create({ data: { name: "سارة عبدالله التميمي", instagram: "sara.tamimi", phone: "07701112233", city: "بغداد", area: "المنصور" } }),
    prisma.customer.create({ data: { name: "علي حسن البياتي", instagram: "ali.bayati", phone: "07706667788", city: "بغداد", area: "الزعفرانية" } }),
    prisma.customer.create({ data: { name: "مريم طارق الشمري", instagram: "maryam.shamri", phone: "07704445566", city: "الموصل", area: "الدواسة" } }),
    prisma.customer.create({ data: { name: "يوسف عادل النعيمي", instagram: "yousef.naaimi", phone: "07702223344", city: "بغداد", area: "الأعظمية" } }),
    prisma.customer.create({ data: { name: "رنا سعد القيسي", instagram: "rana.qaisi", phone: "07709990011", city: "بابل", area: "الحلة" } }),
    prisma.customer.create({ data: { name: "حسين عليوي الزيدي", instagram: "hussein.zeidy", phone: "07701230987", city: "ذي قار", area: "الناصرية" } }),
    prisma.customer.create({ data: { name: "لمى جاسم العبيدي", instagram: "lama.obaidi", phone: "07703219876", city: "بغداد", area: "الجادرية" } }),
  ]);
  console.log(`✓ Created ${customers.length} customers`);

  // ── Batches ─────────────────────────────────────────────────────────────────
  const batch1 = await prisma.batch.create({ data: {
    name: "شحنة ديسمبر 2025",
    openDate: new Date("2025-12-01"),
    closeDate: new Date("2025-12-28"),
    shippingCost: 180,
    status: "completed",
  }});

  const batch2 = await prisma.batch.create({ data: {
    name: "شحنة يناير 2026",
    openDate: new Date("2026-01-05"),
    closeDate: new Date("2026-01-30"),
    shippingCost: 200,
    status: "completed",
  }});

  const batch3 = await prisma.batch.create({ data: {
    name: "شحنة فبراير 2026",
    openDate: new Date("2026-02-03"),
    closeDate: new Date("2026-02-25"),
    shippingCost: 160,
    status: "in_distribution",
  }});

  const batch4 = await prisma.batch.create({ data: {
    name: "شحنة مارس 2026",
    openDate: new Date("2026-03-01"),
    closeDate: new Date("2026-03-28"),
    shippingCost: 220,
    status: "shipped",
  }});

  const batch5 = await prisma.batch.create({ data: {
    name: "شحنة أبريل 2026",
    openDate: new Date("2026-04-01"),
    shippingCost: 0,
    status: "open",
  }});

  console.log(`✓ Created 5 batches`);

  // ── Orders ───────────────────────────────────────────────────────────────────
  const orders = [
    // ── Batch 1 (completed) ──
    { customerId: customers[0].id, batchId: batch1.id, productType: "Bag", productName: "حقيبة يد جلدية Zara", color: "أسود", size: "M", purchaseCost: 380, sellingPrice: 52000, deliveryCost: 5000, deposit: 52000, status: "delivered", paymentStatus: "paid" },
    { customerId: customers[1].id, batchId: batch1.id, productType: "Shoe", productName: "بوت نسائي LC Waikiki", color: "بني", size: "38", purchaseCost: 420, sellingPrice: 58000, deliveryCost: 6000, deposit: 30000, status: "delivered", paymentStatus: "partial" },
    { customerId: customers[2].id, batchId: batch1.id, productType: "Clothing", productName: "معطف شتوي Koton", color: "كحلي", size: "M", purchaseCost: 650, sellingPrice: 88000, deliveryCost: 6000, deposit: 88000, status: "delivered", paymentStatus: "paid" },
    { customerId: customers[3].id, batchId: batch1.id, productType: "Accessory", productName: "ساعة يد Casio", color: "فضي", purchaseCost: 750, sellingPrice: 95000, deliveryCost: 5000, deposit: 50000, status: "delivered", paymentStatus: "partial" },
    { customerId: customers[4].id, batchId: batch1.id, productType: "Bag", productName: "شنطة ظهر DeFacto", color: "رمادي", size: "L", purchaseCost: 300, sellingPrice: 42000, deliveryCost: 5000, deposit: 42000, status: "delivered", paymentStatus: "paid" },
    { customerId: customers[5].id, batchId: batch1.id, productType: "Clothing", productName: "بلوزة Boyner", color: "وردي", size: "S", purchaseCost: 180, sellingPrice: 28000, deliveryCost: 5000, deposit: 28000, status: "delivered", paymentStatus: "paid" },
    { customerId: customers[6].id, batchId: batch1.id, productType: "Shoe", productName: "حذاء رياضي Nike", color: "أبيض", size: "43", purchaseCost: 820, sellingPrice: 110000, deliveryCost: 7000, deposit: 60000, status: "delivered", paymentStatus: "partial" },

    // ── Batch 2 (completed) ──
    { customerId: customers[7].id, batchId: batch2.id, productType: "Clothing", productName: "فستان سهرة Trendyol", color: "أحمر", size: "M", purchaseCost: 520, sellingPrice: 72000, deliveryCost: 6000, deposit: 72000, status: "delivered", paymentStatus: "paid" },
    { customerId: customers[8].id, batchId: batch2.id, productType: "Bag", productName: "حقيبة كتف Mango", color: "بيج", purchaseCost: 450, sellingPrice: 62000, deliveryCost: 5000, deposit: 35000, status: "delivered", paymentStatus: "partial" },
    { customerId: customers[9].id, batchId: batch2.id, productType: "Accessory", productName: "نظارة شمسية Ray-Ban", color: "أسود", purchaseCost: 680, sellingPrice: 90000, deliveryCost: 5000, deposit: 90000, status: "delivered", paymentStatus: "paid" },
    { customerId: customers[0].id, batchId: batch2.id, productType: "Clothing", productName: "تراكسوت Adidas", color: "أسود", size: "L", purchaseCost: 600, sellingPrice: 82000, deliveryCost: 6000, deposit: 82000, status: "delivered", paymentStatus: "paid" },
    { customerId: customers[1].id, batchId: batch2.id, productType: "Shoe", productName: "كعب عالي Zara", color: "أسود", size: "37", purchaseCost: 390, sellingPrice: 54000, deliveryCost: 6000, deposit: 30000, status: "delivered", paymentStatus: "partial" },
    { customerId: customers[10].id, batchId: batch2.id, productType: "Bag", productName: "شنطة سفر Samsonite", color: "أزرق", size: "XL", purchaseCost: 980, sellingPrice: 130000, deliveryCost: 8000, deposit: 70000, status: "delivered", paymentStatus: "partial" },

    // ── Batch 3 (in_distribution) ──
    { customerId: customers[11].id, batchId: batch3.id, productType: "Clothing", productName: "جاكيت جينز Koton", color: "أزرق فاتح", size: "M", purchaseCost: 420, sellingPrice: 58000, deliveryCost: 6000, deposit: 58000, status: "delivered", paymentStatus: "paid" },
    { customerId: customers[2].id, batchId: batch3.id, productType: "Shoe", productName: "بوت رجالي HepsiBurada", color: "أسود", size: "42", purchaseCost: 560, sellingPrice: 76000, deliveryCost: 6000, deposit: 40000, status: "delivered", paymentStatus: "partial" },
    { customerId: customers[3].id, batchId: batch3.id, productType: "Accessory", productName: "حزام جلد LC Waikiki", color: "بني", purchaseCost: 120, sellingPrice: 18000, deliveryCost: 4000, deposit: 18000, status: "delivered", paymentStatus: "paid" },
    { customerId: customers[4].id, batchId: batch3.id, productType: "Bag", productName: "حقيبة لابتوب DeFacto", color: "أسود", size: "15 inch", purchaseCost: 340, sellingPrice: 48000, deliveryCost: 5000, deposit: 25000, status: "shipped", paymentStatus: "partial" },
    { customerId: customers[5].id, batchId: batch3.id, productType: "Clothing", productName: "عباءة تركية فاخرة", color: "أسود", size: "L", purchaseCost: 780, sellingPrice: 105000, deliveryCost: 7000, deposit: 55000, status: "shipped", paymentStatus: "partial" },
    { customerId: customers[6].id, batchId: batch3.id, productType: "Shoe", productName: "سنيكر Puma", color: "أبيض/أحمر", size: "44", purchaseCost: 480, sellingPrice: 66000, deliveryCost: 6000, deposit: 66000, status: "shipped", paymentStatus: "paid" },
    { customerId: customers[7].id, batchId: batch3.id, productType: "Clothing", productName: "بيجاما شتوية Boyner", color: "رمادي", size: "M", purchaseCost: 220, sellingPrice: 32000, deliveryCost: 5000, deposit: 0, status: "shipped", paymentStatus: "unpaid" },

    // ── Batch 4 (shipped) ──
    { customerId: customers[8].id, batchId: batch4.id, productType: "Bag", productName: "حقيبة يد Versace نسخة", color: "ذهبي", purchaseCost: 550, sellingPrice: 75000, deliveryCost: 6000, deposit: 40000, status: "bought", paymentStatus: "partial" },
    { customerId: customers[9].id, batchId: batch4.id, productType: "Shoe", productName: "صندل مريح Crocs", color: "بيج", size: "39", purchaseCost: 260, sellingPrice: 38000, deliveryCost: 5000, deposit: 38000, status: "bought", paymentStatus: "paid" },
    { customerId: customers[10].id, batchId: batch4.id, productType: "Clothing", productName: "قميص رجالي Zara", color: "أبيض", size: "L", purchaseCost: 195, sellingPrice: 30000, deliveryCost: 5000, deposit: 15000, status: "bought", paymentStatus: "partial" },
    { customerId: customers[11].id, batchId: batch4.id, productType: "Accessory", productName: "عطر Vakko 100ml", color: "شفاف", purchaseCost: 890, sellingPrice: 120000, deliveryCost: 5000, deposit: 60000, status: "bought", paymentStatus: "partial" },
    { customerId: customers[0].id, batchId: batch4.id, productType: "Clothing", productName: "بدلة رجالي Koton", color: "كحلي", size: "XL", purchaseCost: 1100, sellingPrice: 148000, deliveryCost: 8000, deposit: 80000, status: "bought", paymentStatus: "partial" },
    { customerId: customers[1].id, batchId: batch4.id, productType: "Bag", productName: "حقيبة رياضية Nike", color: "أسود/أحمر", purchaseCost: 380, sellingPrice: 52000, deliveryCost: 5000, deposit: 0, status: "in_progress", paymentStatus: "unpaid" },
    { customerId: customers[2].id, batchId: batch4.id, productType: "Shoe", productName: "حذاء كلاسيكي Aldo", color: "بني داكن", size: "41", purchaseCost: 620, sellingPrice: 84000, deliveryCost: 6000, deposit: 42000, status: "in_progress", paymentStatus: "partial" },

    // ── Batch 5 (open - current) ──
    { customerId: customers[3].id, batchId: batch5.id, productType: "Clothing", productName: "فستان ربيعي Trendyol", color: "زهري", size: "S", purchaseCost: 310, sellingPrice: 44000, deliveryCost: 5000, deposit: 22000, status: "in_progress", paymentStatus: "partial" },
    { customerId: customers[4].id, batchId: batch5.id, productType: "Bag", productName: "حقيبة توت Zara", color: "أبيض", purchaseCost: 420, sellingPrice: 58000, deliveryCost: 5000, deposit: 0, status: "new", paymentStatus: "unpaid" },
    { customerId: customers[5].id, batchId: batch5.id, productType: "Shoe", productName: "بالرينا مزخرف LC Waikiki", color: "ذهبي", size: "37", purchaseCost: 175, sellingPrice: 26000, deliveryCost: 5000, deposit: 13000, status: "new", paymentStatus: "partial" },
    { customerId: customers[6].id, batchId: batch5.id, productType: "Accessory", productName: "محفظة رجالي Polo", color: "أسود", purchaseCost: 240, sellingPrice: 35000, deliveryCost: 4000, deposit: 0, status: "new", paymentStatus: "unpaid" },
    { customerId: customers[7].id, batchId: batch5.id, productType: "Clothing", productName: "بلوزة شيفون DeFacto", color: "بيج", size: "M", purchaseCost: 140, sellingPrice: 22000, deliveryCost: 5000, deposit: 10000, status: "new", paymentStatus: "partial" },
    { customerId: customers[8].id, batchId: batch5.id, productType: "Shoe", productName: "حذاء رياضي Adidas", color: "أسود/أبيض", size: "40", purchaseCost: 750, sellingPrice: 100000, deliveryCost: 7000, deposit: 50000, status: "new", paymentStatus: "partial" },

    // ── Unassigned orders ──
    { customerId: customers[9].id, productType: "Bag", productName: "حقيبة يد صغيرة", color: "وردي فيوشيا", purchaseCost: 190, sellingPrice: 29000, deliveryCost: 5000, deposit: 0, status: "new", paymentStatus: "unpaid" },
    { customerId: customers[10].id, productType: "Clothing", productName: "كارديغان صوف Koton", color: "كريمي", size: "L", purchaseCost: 280, sellingPrice: 40000, deliveryCost: 5000, deposit: 20000, status: "new", paymentStatus: "partial" },
  ];

  await prisma.order.createMany({ data: orders });
  console.log(`✓ Created ${orders.length} orders`);

  const counts = {
    customers: await prisma.customer.count(),
    batches: await prisma.batch.count(),
    orders: await prisma.order.count(),
  };
  console.log("\n📊 Database summary:", counts);
  console.log("✅ Simulation complete!");
}

main()
  .catch((e) => { console.error("Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
