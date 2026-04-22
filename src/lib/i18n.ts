import { useLocaleStore } from "@/store/locale";

const translations = {
  ar: {
    nav: {
      home: "الرئيسية",
      orders: "الطلبات",
      batches: "الشحنات",
      finance: "المالية",
      customers: "العملاء",
      settings: "النظام",
    },
    topbar: {
      newOrder: "طلب جديد",
      search: "بحث أو أمر...",
      lightMode: "الوضع الفاتح",
      darkMode: "الوضع الداكن",
      skipToContent: "تخطي إلى المحتوى",
    },
    pageTitles: {
      "/": "الرئيسية",
      "/orders": "الطلبات",
      "/batches": "الشحنات",
      "/customers": "العملاء",
      "/finance": "المالية",
      "/settings": "الإعدادات",
    } as Record<string, string>,
    settings: {
      title: "مركز التحكم",
      subtitle: "إعدادات النظام والتخصيص",
      save: "حفظ الإعدادات",
      saving: "جاري الحفظ...",
      saved: "تم الحفظ!",
      searchPlaceholder: "بحث في الإعدادات...",
      noResults: "لا توجد نتائج",
      adminRequired: "صلاحية المسؤول مطلوبة.",
      loading: "جاري التحميل...",
      back: "رجوع",
      roleAdmin: "مدير",
      categories: {
        store: { label: "هوية المتجر", description: "الاسم والهاتف والشعار" },
        financial: { label: "المالية والشحن", description: "العملة وأسعار الصرف" },
        system: { label: "النظام والبيانات", description: "النسخ الاحتياطي والمعلومات" },
      },
      store: {
        title: "هوية المتجر",
        storeName: "اسم المتجر",
        storeNamePlaceholder: "متجر ترندي",
        logoUrl: "رابط الشعار",
        logoPreviewAlt: "معاينة الشعار",
      },
      financial: {
        title: "المالية وأسعار الصرف",
        usdToTry: "١ دولار = X ليرة تركية",
        usdToIqd: "١ دولار = X دينار عراقي",
        tryToIqd: "١ ليرة = X دينار عراقي",
        note: "تُستخدم هذه الأسعار لتحويل تكاليف المنتجات بالليرة التركية وتكاليف الشحن بالدولار إلى الدينار العراقي في التقارير المالية.",
      },
      system: {
        title: "النظام والبيانات",
        exportDatabase: "تصدير قاعدة البيانات",
        exportMeta: "تصدير للإعلانات",
        exporting: "جاري التصدير...",
        logout: "تسجيل خروج",
        logoutTitle: "تسجيل الخروج",
        backupNote: "يتم تنزيل نسخة احتياطية من قاعدة البيانات بصيغة JSON. احفظ هذه النسخة في مكان آمن.",
        importTitle: "استيراد عملاء",
        importNote: "ملف CSV يحتوي على أعمدة:",
        importing: "جاري الاستيراد...",
        importBtn: "استيراد عملاء",
        importEmptyFile: "الملف فارغ أو تنسيقه غير صحيح",
        importSuccess: (imported: number, skipped: number) => `تم استيراد ${imported} عميل، تم تخطي ${skipped} مكرر`,
        importError: "فشل الاستيراد. تحقق من تنسيق الملف وحاول مجدداً.",
        language: "لغة النظام",
        languageAr: "عربي",
        languageEn: "English",
      },
    },
  },
  en: {
    nav: {
      home: "Home",
      orders: "Orders",
      batches: "Batches",
      finance: "Finance",
      customers: "Customers",
      settings: "Settings",
    },
    topbar: {
      newOrder: "New Order",
      search: "Search or command...",
      lightMode: "Light mode",
      darkMode: "Dark mode",
      skipToContent: "Skip to content",
    },
    pageTitles: {
      "/": "Home",
      "/orders": "Orders",
      "/batches": "Batches",
      "/customers": "Customers",
      "/finance": "Finance",
      "/settings": "Settings",
    } as Record<string, string>,
    settings: {
      title: "Control Center",
      subtitle: "System settings & customization",
      save: "Save Settings",
      saving: "Saving...",
      saved: "Saved!",
      searchPlaceholder: "Search settings...",
      noResults: "No results",
      adminRequired: "Admin access required.",
      loading: "Loading...",
      back: "Back",
      roleAdmin: "Admin",
      categories: {
        store: { label: "Store Identity", description: "Name, phone and logo" },
        financial: { label: "Finance & Shipping", description: "Currency and exchange rates" },
        system: { label: "System & Data", description: "Backup and information" },
      },
      store: {
        title: "Store Identity",
        storeName: "Store Name",
        storeNamePlaceholder: "Trendy Store",
        logoUrl: "Logo URL",
        logoPreviewAlt: "Logo preview",
      },
      financial: {
        title: "Finance & Exchange Rates",
        usdToTry: "1 USD = X Turkish Lira",
        usdToIqd: "1 USD = X Iraqi Dinar",
        tryToIqd: "1 TRY = X Iraqi Dinar",
        note: "These rates are used to convert product costs in Turkish Lira and shipping costs in USD to Iraqi Dinar in financial reports.",
      },
      system: {
        title: "System & Data",
        exportDatabase: "Export Database",
        exportMeta: "Export for Ads",
        exporting: "Exporting...",
        logout: "Sign Out",
        logoutTitle: "Sign out",
        backupNote: "Downloads a JSON backup of the database. Keep this file in a safe place.",
        importTitle: "Import Customers",
        importNote: "CSV file with columns:",
        importing: "Importing...",
        importBtn: "Import Customers",
        importEmptyFile: "File is empty or format is invalid",
        importSuccess: (imported: number, skipped: number) => `Imported ${imported} customers, skipped ${skipped} duplicates`,
        importError: "Import failed. Check the file format and try again.",
        language: "System Language",
        languageAr: "عربي",
        languageEn: "English",
      },
    },
  },
} as const;

export type Translations = typeof translations.ar;

export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return translations[locale];
}

export function useDir() {
  const locale = useLocaleStore((s) => s.locale);
  return locale === "ar" ? "rtl" : "ltr";
}
