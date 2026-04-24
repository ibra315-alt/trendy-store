"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Search, ChevronLeft, Plus, X, Users } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useT } from "@/lib/i18n";
import { useCustomerFilterStore } from "@/store/customer-filter";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "صباح الخير ☀️";
  if (h >= 12 && h < 18) return "مساء الخير 🌤️";
  if (h >= 18 && h < 24) return "مساء النور 🌙";
  return "وقت متأخر 🌙";
}

const HEADER_CLS = `fixed top-0 left-0 right-0 z-40 flex flex-col
  bg-transparent backdrop-blur-md border-b border-white/8 shadow-[0_1px_16px_rgba(0,0,0,0.07)]
  sm:bg-card/40 sm:backdrop-blur-3xl sm:border-border/30 sm:shadow-none`;

function BrandLogo({ greeting }: { greeting: string }) {
  return (
    <a
      href="/"
      className="flex flex-col items-start sm:flex-row sm:items-center gap-0 group select-none"
      title="الرئيسية"
    >
      <div className="flex items-center">
        <span className="transition-opacity duration-200 group-hover:opacity-75"
          style={{ fontSize: "17px", fontWeight: 500, letterSpacing: "0.16em", color: "var(--foreground)" }}>
          trendy
        </span>
        <span className="transition-opacity duration-200 group-hover:opacity-75"
          style={{ fontSize: "17px", fontWeight: 800, letterSpacing: "0.16em", color: "#c9a84c" }}>
          &nbsp;store
        </span>
      </div>
      {greeting && (
        <span className="sm:hidden text-[10px] font-medium leading-none -mt-0.5" style={{ color: "#c9a84c", opacity: 0.65 }}>
          {greeting}
        </span>
      )}
    </a>
  );
}

export function AppNavbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { search: customerSearch, count: customerCount, setSearch: setCustomerSearch } = useCustomerFilterStore();

  const router = useRouter();
  const isDark = theme === "dark";

  const openCommandBar = useCallback(() => {
    window.dispatchEvent(new CustomEvent("toggle-command-bar"));
  }, []);

  useEffect(() => {
    setMounted(true);
    setGreeting(getGreeting());
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

  // ── Customers page ──────────────────────────────────────────────────────────
  if (pathname === "/customers") {
    return (
      <header className={HEADER_CLS} style={{ height: "56px" }}>
        <div className="flex items-center justify-between px-4 sm:px-7 h-14 min-h-[56px]" dir="rtl">
          {/* Right: Brand + title + count */}
          <div className="flex items-center gap-2.5">
            <BrandLogo greeting={greeting} />
            <ChevronLeft size={13} strokeWidth={1.5} className="text-[var(--muted)] opacity-40" />
            <Users size={14} className="text-[var(--muted)]" />
            <span className="text-sm font-semibold" style={{ color: "#c9a84c" }}>العملاء</span>
            {customerCount > 0 && (
              <span className="text-xs text-[var(--muted)] tabular-nums">({customerCount})</span>
            )}
          </div>

          {/* Left: search + add customer */}
          <div className="flex items-center gap-2">
            {/* Expandable search */}
            {searchOpen ? (
              <div className="relative flex items-center">
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

            {/* Add customer button */}
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

  // ── Default bar (all other pages) ───────────────────────────────────────────
  function getPageTitle(p: string): string {
    if (t.pageTitles[p]) return t.pageTitles[p];
    for (const [path, title] of Object.entries(t.pageTitles)) {
      if (path !== "/" && p.startsWith(path)) return title;
    }
    return t.pageTitles["/"];
  }
  const title = getPageTitle(pathname);

  return (
    <header className={HEADER_CLS} style={{ height: "56px" }}>
      <div className="flex items-center justify-between px-4 sm:px-7 h-14 min-h-[56px]">
        {/* Right side: Brand + Breadcrumb */}
        <div className="flex items-center gap-2.5">
          <BrandLogo greeting={greeting} />
          <div className="hidden sm:flex items-center gap-1.5">
            <ChevronLeft size={13} strokeWidth={1.5} className="text-[var(--muted)] opacity-40" />
            <span className="text-sm font-semibold" style={{ color: "#c9a84c" }}>{title}</span>
          </div>
        </div>

        {/* Left side: Add Order + Search + Theme */}
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

          <button
            onClick={openCommandBar}
            className="flex sm:hidden items-center justify-center w-9 h-9 rounded-xl text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-colors duration-200 cursor-pointer"
          >
            <Search size={18} strokeWidth={1.8} />
          </button>
          <button
            onClick={openCommandBar}
            className="hidden sm:flex items-center gap-3 px-4 h-9 rounded-2xl bg-[var(--surface-secondary)]/80 border border-[var(--border)]/40 text-[var(--muted)] text-[14px] hover:border-[var(--muted)] hover:bg-[var(--surface-secondary)] transition-all duration-200 cursor-pointer w-56"
          >
            <Search size={16} strokeWidth={1.8} className="shrink-0" />
            <span className="flex-1 text-start">{t.topbar.search}</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--muted)] font-mono">⌘K</kbd>
          </button>

          {mounted && (
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-colors duration-200 cursor-pointer overflow-hidden"
              title={isDark ? t.topbar.lightMode : t.topbar.darkMode}
            >
              <Sun size={17} strokeWidth={1.8} className="absolute transition-all duration-300"
                style={{ transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0)", opacity: isDark ? 1 : 0 }} />
              <Moon size={17} strokeWidth={1.8} className="absolute transition-all duration-300"
                style={{ transform: isDark ? "rotate(-90deg) scale(0)" : "rotate(0deg) scale(1)", opacity: isDark ? 0 : 1 }} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppNavbar;
