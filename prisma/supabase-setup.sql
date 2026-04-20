-- =============================================
-- Trendy Store — Full Setup SQL for Supabase
-- Run this in: Supabase → SQL Editor → New query
-- =============================================

-- ── 1. SCHEMA ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'worker',
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

CREATE TABLE IF NOT EXISTS "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instagram" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "area" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Batch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "openDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closeDate" TIMESTAMP(3),
    "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "storeName" TEXT NOT NULL DEFAULT 'Trendy Store',
    "logo" TEXT,
    "usdToTry" DOUBLE PRECISION NOT NULL DEFAULT 38.0,
    "usdToIqd" DOUBLE PRECISION NOT NULL DEFAULT 1460.0,
    "tryToIqd" DOUBLE PRECISION NOT NULL DEFAULT 38.4,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "batchId" TEXT,
    "productType" TEXT NOT NULL,
    "productName" TEXT,
    "color" TEXT,
    "size" TEXT,
    "instagramLink" TEXT,
    "productLink" TEXT,
    "governorate" TEXT,
    "area" TEXT,
    "phone" TEXT,
    "purchaseCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deposit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'new',
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "notes" TEXT,
    "images" TEXT,
    "items" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ── 2. USERS & SETTINGS ───────────────────────────────────────────────────

INSERT INTO "User" ("id","username","password","role","name") VALUES
('user_admin_001','admin','$2b$10$BRbYyrbjO6ZaJOl8k09UwOqGI8fq9XU81Z3.E66ClfMSVP4Mphv1q','admin','Admin'),
('user_worker_001','worker','$2b$10$S8IkJSb6xRibVoyNFGW3UeCoeB5LgECbTk2Vxst3P/14NbC4B5AHy','worker','Worker')
ON CONFLICT ("username") DO NOTHING;

INSERT INTO "Settings" ("id","storeName","usdToTry","usdToIqd","tryToIqd") VALUES
('default','Trendy Store',38.0,1460.0,38.4)
ON CONFLICT ("id") DO NOTHING;


-- ── 3. CUSTOMERS ──────────────────────────────────────────────────────────

INSERT INTO "Customer" ("id","name","instagram","phone","city","area") VALUES
('cust_01','أحمد محمد الكناني','ahmed_kanani','07701234567','بغداد','الكرادة'),
('cust_02','فاطمة علي الموسوي','fatima.mosawy','07709876543','البصرة','العشار'),
('cust_03','زينب حسين الخفاجي','zainab.khafaji','07705551234','أربيل','عينكاوة'),
('cust_04','محمد كريم الجبوري','mk_jbouri','07708887766','النجف','المركز'),
('cust_05','نور الهدى الربيعي','noor.rabiee','07703334455','كربلاء','المركز'),
('cust_06','سارة عبدالله التميمي','sara.tamimi','07701112233','بغداد','المنصور'),
('cust_07','علي حسن البياتي','ali.bayati','07706667788','بغداد','الزعفرانية'),
('cust_08','مريم طارق الشمري','maryam.shamri','07704445566','الموصل','الدواسة'),
('cust_09','يوسف عادل النعيمي','yousef.naaimi','07702223344','بغداد','الأعظمية'),
('cust_10','رنا سعد القيسي','rana.qaisi','07709990011','بابل','الحلة'),
('cust_11','حسين عليوي الزيدي','hussein.zeidy','07701230987','ذي قار','الناصرية'),
('cust_12','لمى جاسم العبيدي','lama.obaidi','07703219876','بغداد','الجادرية');


-- ── 4. BATCHES ────────────────────────────────────────────────────────────

INSERT INTO "Batch" ("id","name","openDate","closeDate","shippingCost","status") VALUES
('batch_01','شحنة ديسمبر 2025','2025-12-01','2025-12-28',180,'completed'),
('batch_02','شحنة يناير 2026','2026-01-05','2026-01-30',200,'completed'),
('batch_03','شحنة فبراير 2026','2026-02-03','2026-02-25',160,'in_distribution'),
('batch_04','شحنة مارس 2026','2026-03-01','2026-03-28',220,'shipped'),
('batch_05','شحنة أبريل 2026','2026-04-01',NULL,0,'open');


-- ── 5. ORDERS ─────────────────────────────────────────────────────────────

INSERT INTO "Order" ("id","customerId","batchId","productType","productName","color","size","governorate","area","phone","purchaseCost","sellingPrice","deliveryCost","deposit","status","paymentStatus") VALUES
-- Batch 1 (completed)
('ord_01','cust_01','batch_01','Bag','حقيبة يد جلدية Zara','أسود','M','بغداد','الكرادة','07701234567',380,52000,5000,52000,'delivered','paid'),
('ord_02','cust_02','batch_01','Shoe','بوت نسائي LC Waikiki','بني','38','البصرة','العشار','07709876543',420,58000,6000,30000,'delivered','partial'),
('ord_03','cust_03','batch_01','Clothing','معطف شتوي Koton','كحلي','M','أربيل','عينكاوة','07705551234',650,88000,6000,88000,'delivered','paid'),
('ord_04','cust_04','batch_01','Accessory','ساعة يد Casio','فضي',NULL,'النجف','المركز','07708887766',750,95000,5000,50000,'delivered','partial'),
('ord_05','cust_05','batch_01','Bag','شنطة ظهر DeFacto','رمادي','L','كربلاء','المركز','07703334455',300,42000,5000,42000,'delivered','paid'),
('ord_06','cust_06','batch_01','Clothing','بلوزة Boyner','وردي','S','بغداد','المنصور','07701112233',180,28000,5000,28000,'delivered','paid'),
('ord_07','cust_07','batch_01','Shoe','حذاء رياضي Nike','أبيض','43','بغداد','الزعفرانية','07706667788',820,110000,7000,60000,'delivered','partial'),
-- Batch 2 (completed)
('ord_08','cust_08','batch_02','Clothing','فستان سهرة Trendyol','أحمر','M','الموصل','الدواسة','07704445566',520,72000,6000,72000,'delivered','paid'),
('ord_09','cust_09','batch_02','Bag','حقيبة كتف Mango','بيج',NULL,'بغداد','الأعظمية','07702223344',450,62000,5000,35000,'delivered','partial'),
('ord_10','cust_10','batch_02','Accessory','نظارة شمسية Ray-Ban','أسود',NULL,'بابل','الحلة','07709990011',680,90000,5000,90000,'delivered','paid'),
('ord_11','cust_01','batch_02','Clothing','تراكسوت Adidas','أسود','L','بغداد','الكرادة','07701234567',600,82000,6000,82000,'delivered','paid'),
('ord_12','cust_02','batch_02','Shoe','كعب عالي Zara','أسود','37','البصرة','العشار','07709876543',390,54000,6000,30000,'delivered','partial'),
('ord_13','cust_11','batch_02','Bag','شنطة سفر Samsonite','أزرق','XL','ذي قار','الناصرية','07701230987',980,130000,8000,70000,'delivered','partial'),
-- Batch 3 (in_distribution)
('ord_14','cust_12','batch_03','Clothing','جاكيت جينز Koton','أزرق فاتح','M','بغداد','الجادرية','07703219876',420,58000,6000,58000,'delivered','paid'),
('ord_15','cust_03','batch_03','Shoe','بوت رجالي HepsiBurada','أسود','42','أربيل','عينكاوة','07705551234',560,76000,6000,40000,'delivered','partial'),
('ord_16','cust_04','batch_03','Accessory','حزام جلد LC Waikiki','بني',NULL,'النجف','المركز','07708887766',120,18000,4000,18000,'delivered','paid'),
('ord_17','cust_05','batch_03','Bag','حقيبة لابتوب DeFacto','أسود','15 inch','كربلاء','المركز','07703334455',340,48000,5000,25000,'shipped','partial'),
('ord_18','cust_06','batch_03','Clothing','عباءة تركية فاخرة','أسود','L','بغداد','المنصور','07701112233',780,105000,7000,55000,'shipped','partial'),
('ord_19','cust_07','batch_03','Shoe','سنيكر Puma','أبيض/أحمر','44','بغداد','الزعفرانية','07706667788',480,66000,6000,66000,'shipped','paid'),
('ord_20','cust_08','batch_03','Clothing','بيجاما شتوية Boyner','رمادي','M','الموصل','الدواسة','07704445566',220,32000,5000,0,'shipped','unpaid'),
-- Batch 4 (shipped)
('ord_21','cust_09','batch_04','Bag','حقيبة يد Versace نسخة','ذهبي',NULL,'بغداد','الأعظمية','07702223344',550,75000,6000,40000,'bought','partial'),
('ord_22','cust_10','batch_04','Shoe','صندل مريح Crocs','بيج','39','بابل','الحلة','07709990011',260,38000,5000,38000,'bought','paid'),
('ord_23','cust_11','batch_04','Clothing','قميص رجالي Zara','أبيض','L','ذي قار','الناصرية','07701230987',195,30000,5000,15000,'bought','partial'),
('ord_24','cust_12','batch_04','Accessory','عطر Vakko 100ml','شفاف',NULL,'بغداد','الجادرية','07703219876',890,120000,5000,60000,'bought','partial'),
('ord_25','cust_01','batch_04','Clothing','بدلة رجالي Koton','كحلي','XL','بغداد','الكرادة','07701234567',1100,148000,8000,80000,'bought','partial'),
('ord_26','cust_02','batch_04','Bag','حقيبة رياضية Nike','أسود/أحمر',NULL,'البصرة','العشار','07709876543',380,52000,5000,0,'in_progress','unpaid'),
('ord_27','cust_03','batch_04','Shoe','حذاء كلاسيكي Aldo','بني داكن','41','أربيل','عينكاوة','07705551234',620,84000,6000,42000,'in_progress','partial'),
-- Batch 5 (open)
('ord_28','cust_04','batch_05','Clothing','فستان ربيعي Trendyol','زهري','S','النجف','المركز','07708887766',310,44000,5000,22000,'in_progress','partial'),
('ord_29','cust_05','batch_05','Bag','حقيبة توت Zara','أبيض',NULL,'كربلاء','المركز','07703334455',420,58000,5000,0,'new','unpaid'),
('ord_30','cust_06','batch_05','Shoe','بالرينا مزخرف LC Waikiki','ذهبي','37','بغداد','المنصور','07701112233',175,26000,5000,13000,'new','partial'),
('ord_31','cust_07','batch_05','Accessory','محفظة رجالي Polo','أسود',NULL,'بغداد','الزعفرانية','07706667788',240,35000,4000,0,'new','unpaid'),
('ord_32','cust_08','batch_05','Clothing','بلوزة شيفون DeFacto','بيج','M','الموصل','الدواسة','07704445566',140,22000,5000,10000,'new','partial'),
('ord_33','cust_09','batch_05','Shoe','حذاء رياضي Adidas','أسود/أبيض','40','بغداد','الأعظمية','07702223344',750,100000,7000,50000,'new','partial'),
-- Unassigned
('ord_34','cust_10',NULL,'Bag','حقيبة يد صغيرة','وردي فيوشيا',NULL,'بابل','الحلة','07709990011',190,29000,5000,0,'new','unpaid'),
('ord_35','cust_11',NULL,'Clothing','كارديغان صوف Koton','كريمي','L','ذي قار','الناصرية','07701230987',280,40000,5000,20000,'new','partial');
