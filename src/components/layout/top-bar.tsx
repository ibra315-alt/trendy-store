"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Sun, Moon, Search, ChevronLeft, Plus, ChevronDown, Package, X, Users, Upload,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useBatchFilterStore } from "@/store/batch-filter";
import { useOrderFilterStore } from "@/store/order-filter";
import { useCustomerFilterStore } from "@/store/customer-filter";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "صباح الخير ☀️";
  if (h >= 12 && h < 18) return "مساء الخير 🌤️";
  if (h >= 18 && h < 24) return "مساء النور 🌙";
  return "وقت متأخر 🌙";
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = theme === "dark";
  if (!mounted) return <div className="w-9 h-9" />;
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative flex items-center justify-center w-9 h-9 rounded-xl text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-colors duration-200 cursor-pointer overflow-hidden"
    >
      <Sun size={17} strokeWidth={1.8} className="absolute transition-all duration-300"
        style={{ transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0)", opacity: isDark ? 1 : 0 }} />
      <Moon size={17} strokeWidth={1.8} className="absolute transition-all duration-300"
        style={{ transform: isDark ? "rotate(-90deg) scale(0)" : "rotate(0deg) scale(1)", opacity: isDark ? 0 : 1 }} />
    </button>
  );
}

const HEADER_CLS =
  "fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 sm:px-7 h-14 " +
  "bg-transparent backdrop-blur-md border-b border-white/8 shadow-[0_1px_16px_rgba(0,0,0,0.07)] " +
  "sm:bg-card/40 sm:backdrop-blur-3xl sm:border-border/30 sm:shadow-none";

export function AppNavbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [filterDropOpen, setFilterDropOpen] = useState(false);
  const filterDropRef = useRef<HTMLDivElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { statusFilter, counts, setStatusFilter } = useBatchFilterStore();
  const { activeTab, setActiveTab, search: orderSearch, setSearch: setOrderSearch } = useOrderFilterStore();
  const { search: customerSearch, count: customerCount, setSearch: setCustomerSearch } = useCustomerFilterStore();

  const isDark = theme === "dark";

  const openCommandBar = useCallback(() => {
    window.dispatchEvent(new CustomEvent("toggle-command-bar"));
  }, []);

  useEffect(() => { setMounted(true); setGreeting(getGreeting()); }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterDropRef.current && !filterDropRef.current.contains(e.target as Node)) {
        setFilterDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openCommandBar();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [openCommandBar]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  /* ── Home page ── */
  if (pathname === "/") {
    return (
      <header className={HEADER_CLS} style={{ height: "56px" }}>
        <div className="flex items-center gap-2.5">
          <a href="/" className="flex flex-col items-start sm:flex-row sm:items-center gap-0 group select-none" title="الرئيسية">
            <div className="flex items-center">
              <span className="transition-opacity duration-200 group-hover:opacity-75"
                style={{ fontSize: "17px", fontWeight: 500, letterSpacing: "0.16em", color: "var(--foreground)" }}>trendy</span>
              <span className="transition-opacity duration-200 group-hover:opacity-75"
                style={{ fontSize: "17px", fontWeight: 800, letterSpacing: "0.16em", color: "#c9a84c" }}>&nbsp;store</span>
            </div>
            {greeting && (
              <span className="sm:hidden text-[10px] font-medium leading-none -mt-0.5" style={{ color: "#c9a84c", opacity: 0.65 }}>
                {greeting}
              </span>
            )}
          </a>
          <div className="hidden sm:flex items-center gap-1.5">
            <ChevronLeft size={13} strokeWidth={1.5} className="text-[var(--muted)] opacity-40" />
            <span className="text-sm font-semibold" style={{ color: "#c9a84c" }}>{t.pageTitles["/"]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => router.push("/orders?new=true")}
            title={t.topbar.newOrder}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity duration-200 cursor-pointer shadow-sm"
            style={{ background: "#c9a84c", color: "#111111" }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">{t.topbar.newOrder}</span>
          </button>
          <button onClick={openCommandBar} className="flex sm:hidden items-center justify-center w-9 h-9 rounded-xl text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-colors duration-200 cursor-pointer">
            <Search size={18} strokeWidth={1.8} />
          </button>
          <button onClick={openCommandBar} className="hidden sm:flex items-center gap-3 px-4 h-9 rounded-2xl bg-[var(--surface-secondary)]/80 border border-[var(--border)]/40 text-[var(--muted)] text-[14px] hover:border-[var(--muted)] hover:bg-[var(--surface-secondary)] transition-all duration-200 cursor-pointer w-56">
            <Search size={16} strokeWidth={1.8} className="shrink-0" />
            <span className="flex-1 text-start">{t.topbar.search}</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--muted)] font-mono">⌘K</kbd>
          </button>
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-colors duration-200 cursor-pointer overflow-hidden"
            >
              <Sun size={17} strokeWidth={1.8} className="absolute transition-all duration-300"
                style={{ transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0)", opacity: isDark ? 1 : 0 }} />
              <Moon size={17} strokeWidth={1.8} className="absolute transition-all duration-300"
                style={{ transform: isDark ? "rotate(-90deg) scale(0)" : "rotate(0deg) scale(1)", opacity: isDark ? 0 : 1 }} />
            </button>
          )}
        </div>
      </header>
    );
  }

  /* ── Batches page ── */
  if (pathname === "/batches") {
    const filterOptions = [
      { value: "all", label: "الكل", color: "#6b7280" },
      { value: "open", label: t.batches.status.open, color: "#3b82f6" },
      { value: "shipped", label: t.batches.status.shipped, color: "#f97316" },
      { value: "in_distribution", label: t.batches.status.in_distribution, color: "#a855f7" },
      { value: "completed", label: t.batches.status.completed, color: "#22c55e" },
    ];
    const active = filterOptions.find((o) => o.value === statusFilter) ?? filterOptions[0];
    const activeCount = counts[statusFilter] ?? counts["all"] ?? 0;

    return (
      <header className={HEADER_CLS} style={{ height: "56px" }}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.25)" }}>
            <Package size={15} style={{ color: "#c084fc" }} />
          </div>
          <span className="text-base font-bold" style={{ color: "var(--foreground)" }}>{t.batches.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={filterDropRef}>
            <button
              onClick={() => setFilterDropOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              style={{ background: filterDropOpen ? "var(--surface-secondary)" : "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: active.color }} />
              <span className="hidden sm:inline">{active.label}</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: active.color + "22", color: active.color }}>
                {activeCount}
              </span>
              <ChevronDown size={12} className="text-[var(--muted)]"
                style={{ transform: filterDropOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
            {filterDropOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[170px] rounded-xl shadow-xl overflow-hidden py-1"
                style={{ background: "#1e1e2e", border: "1px solid #333" }} dir="rtl">
                {filterOptions.map(({ value, label, color }) => {
                  const cnt = counts[value] ?? 0;
                  const isActive = statusFilter === value;
                  return (
                    <button key={value}
                      onClick={() => { setStatusFilter(value); setFilterDropOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors text-right"
                      style={{ background: isActive ? color + "22" : "transparent", color: isActive ? color : "#ccc" }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                      <span className="flex-1">{label}</span>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold" style={{ background: color + "22", color }}>{cnt}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("trendy:open-new-batch"))}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            style={{ background: "#c9a84c", color: "#111111" }}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">{t.batches.newBatch}</span>
          </button>
        </div>
      </header>
    );
  }

  /* ── Orders page ── */
  if (pathname === "/orders") {
    const ORDER_TABS = [
      { label: "النشطة",       value: "active" },
      { label: "الكل",         value: "all" },
      { label: "جديد",         value: "new" },
      { label: "قيد التنفيذ",  value: "in_progress" },
      { label: "تم الشراء",    value: "bought" },
      { label: "تم الشحن",     value: "shipped" },
      { label: "تم التسليم",   value: "delivered" },
      { label: "غير مدفوع",   value: "unpaid" },
    ];
    const activeLabel = ORDER_TABS.find((t) => t.value === activeTab)?.label ?? "النشطة";

    return (
      <header className={HEADER_CLS} style={{ height: "56px", overflow: "visible" }}>
        {/* Right: title */}
        <span className="text-sm font-semibold" style={{ color: "#c9a84c" }}>طلبات</span>

        {/* Left: filter + search + add */}
        <div className="flex items-center gap-2" style={{ position: "relative", zIndex: 50 }}>
          {/* Filter dropdown */}
          <div className="relative" ref={filterDropRef}>
            <button
              onClick={() => setFilterDropOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              style={{ background: filterDropOpen ? "var(--surface-secondary)" : "var(--surface)", border: "1px solid var(--border)", color: "var(--foreground)" }}
            >
              <span>{activeLabel}</span>
              <ChevronDown size={12} className="text-[var(--muted)]"
                style={{ transform: filterDropOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
            {filterDropOpen && (
              <div className="absolute left-0 top-full mt-1.5 z-50 min-w-[150px] rounded-xl shadow-xl overflow-hidden py-1"
                style={{ background: "#1e1e2e", border: "1px solid #333" }} dir="rtl">
                {ORDER_TABS.map((tab) => {
                  const isActive = activeTab === tab.value;
                  return (
                    <button key={tab.value}
                      onClick={() => { setActiveTab(tab.value); setFilterDropOpen(false); }}
                      className="w-full text-start px-4 py-2 text-sm transition-colors"
                      style={{
                        background: isActive ? "rgba(201,168,76,0.15)" : "transparent",
                        color: isActive ? "#c9a84c" : "#e5e7eb",
                        borderRight: isActive ? "3px solid #c9a84c" : "3px solid transparent",
                        fontWeight: isActive ? 600 : 400,
                      }}>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expandable search */}
          {searchOpen ? (
            <div className="relative flex items-center" style={{ zIndex: 50 }}>
              <Search size={12} className="absolute end-2.5 text-[var(--muted)] pointer-events-none" />
              <input
                ref={searchInputRef}
                autoFocus
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                dir="rtl"
                className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm ps-8 pe-7 outline-none focus:border-[var(--accent)] transition-colors"
                style={{ width: "150px" }}
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setOrderSearch(""); setSearchOpen(false); }}
                className="absolute start-2 flex items-center justify-center w-5 h-5 rounded-full bg-[var(--muted)] text-[var(--background)] hover:opacity-80 transition-opacity"
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            >
              <Search size={15} strokeWidth={1.8} />
            </button>
          )}

          {/* Add order */}
          <button
            onClick={() => router.push("/orders?new=true")}
            title={t.topbar.newOrder}
            className="flex items-center justify-center w-9 h-9 rounded-full hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            style={{ background: "#c9a84c", color: "#111111" }}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </header>
    );
  }

  /* ── Customers page ── */
  if (pathname === "/customers") {
    return (
      <header className={HEADER_CLS} style={{ height: "56px", overflow: "visible" }}>
        <div className="flex items-center justify-between w-full" dir="rtl">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-[var(--muted)]" />
            <span className="text-sm font-semibold" style={{ color: "#c9a84c" }}>العملاء</span>
            {customerCount > 0 && (
              <span className="text-xs text-[var(--muted)] tabular-nums">({customerCount})</span>
            )}
          </div>
          <div className="flex items-center gap-2" style={{ position: "relative", zIndex: 50 }}>
            {searchOpen ? (
              <div className="relative flex items-center" style={{ zIndex: 50 }}>
                <Search size={12} className="absolute end-2.5 text-[var(--muted)] pointer-events-none" />
                <input
                  ref={searchInputRef}
                  autoFocus
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  dir="rtl"
                  className="h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm ps-8 pe-7 outline-none focus:border-[var(--accent)] transition-colors"
                  style={{ width: "160px" }}
                />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setCustomerSearch(""); setSearchOpen(false); }}
                  className="absolute start-2 flex items-center justify-center w-5 h-5 rounded-full bg-[var(--muted)] text-[var(--background)] hover:opacity-80 transition-opacity"
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center justify-center w-9 h-9 rounded-full text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
              >
                <Search size={15} strokeWidth={1.8} />
              </button>
            )}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("trendy:open-import-customers"))}
              title="استيراد زبائن"
              className="flex items-center justify-center w-9 h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer"
            >
              <Upload size={15} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("trendy:open-new-customer"))}
              title="عميل جديد"
              className="flex items-center justify-center w-9 h-9 rounded-full hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
              style={{ background: "#c9a84c", color: "#111111" }}
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </header>
    );
  }

  /* ── All other inner pages ── */
  function getPageTitle(p: string): string {
    if (t.pageTitles[p]) return t.pageTitles[p];
    for (const [path, title] of Object.entries(t.pageTitles)) {
      if (path !== "/" && p.startsWith(path)) return title as string;
    }
    return "";
  }
  const title = getPageTitle(pathname);

  return (
    <header className={HEADER_CLS} style={{ height: "56px" }}>
      <div className="flex items-center gap-2">
        {title && <span className="text-base font-bold" style={{ color: "var(--foreground)" }}>{title}</span>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={openCommandBar} className="flex items-center justify-center w-9 h-9 rounded-xl text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-colors cursor-pointer">
          <Search size={17} strokeWidth={1.8} />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}

export default AppNavbar;
