"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Search, ChevronLeft, Plus } from "lucide-react";
import { useAuthStore } from "@/store/auth";

const pageTitles: Record<string, string> = {
  "/": "الرئيسية",
  "/orders": "الطلبات",
  "/batches": "الشحنات",
  "/customers": "العملاء",
  "/finance": "المالية",
  "/settings": "الإعدادات",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  for (const [path, title] of Object.entries(pageTitles)) {
    if (path !== "/" && pathname.startsWith(path)) return title;
  }
  return "الرئيسية";
}

export function AppNavbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user } = useAuthStore();
  const title = getPageTitle(pathname);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";
  const router = useRouter();

  const openCommandBar = useCallback(() => {
    window.dispatchEvent(new CustomEvent("toggle-command-bar"));
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

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 flex flex-col bg-card/40 backdrop-blur-3xl border-b border-border/30"
      style={{ height: "56px" }}
    >
      {/* Single Row: Logo + Breadcrumb + Search + Controls */}
      <div className="flex items-center justify-between px-4 sm:px-7 h-14 min-h-[56px]">
        {/* Right side: Brand + Breadcrumb */}
        <div className="flex items-center gap-2.5">
          <a
            href="/"
            className="flex items-center gap-0 group select-none"
            title="الرئيسية"
          >
            <span
              className="text-base font-light text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors duration-200"
              style={{ letterSpacing: "0.18em" }}
            >
              trendy
            </span>
            <span
              className="text-base font-bold bg-gradient-to-l from-[var(--accent)] to-purple-500 bg-clip-text text-transparent group-hover:opacity-80 transition-opacity duration-200"
              style={{ letterSpacing: "0.18em" }}
            >
              &nbsp;store
            </span>
          </a>
          <div className="hidden sm:flex items-center gap-1.5">
            <ChevronLeft size={13} strokeWidth={1.5} className="text-[var(--muted)] opacity-40" />
            <span className="text-sm font-medium text-[var(--foreground)]">{title}</span>
          </div>
        </div>

        {/* Left side: Add Order + Search + Theme */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Add new order button */}
          <button
            onClick={() => router.push("/orders?new=true")}
            title="طلب جديد"
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-to-l from-[var(--accent)] to-purple-500 text-white text-sm font-medium shadow-sm hover:opacity-90 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">طلب جديد</span>
          </button>

          {/* Search — icon on mobile, full bar on desktop */}
          <button
            onClick={openCommandBar}
            className="flex sm:hidden items-center justify-center w-9 h-9 rounded-xl text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-colors duration-200 cursor-pointer"
          >
            <Search size={18} strokeWidth={1.8} />
          </button>
          <button
            onClick={openCommandBar}
            className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-2xl bg-[var(--surface-secondary)]/80 border border-[var(--border)]/40 text-[var(--muted)] text-[14px] hover:border-[var(--muted)] hover:bg-[var(--surface-secondary)] transition-all duration-200 cursor-pointer w-56"
          >
            <Search size={16} strokeWidth={1.8} className="shrink-0" />
            <span className="flex-1 text-start">بحث أو أمر...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--muted)] font-mono">⌘K</kbd>
          </button>

          {/* Theme toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-colors duration-200 cursor-pointer overflow-hidden"
              title={isDark ? "الوضع الفاتح" : "الوضع الداكن"}
            >
              <Sun
                size={17}
                strokeWidth={1.8}
                className="absolute transition-all duration-300"
                style={{
                  transform: isDark ? "rotate(0deg) scale(1)" : "rotate(90deg) scale(0)",
                  opacity: isDark ? 1 : 0,
                }}
              />
              <Moon
                size={17}
                strokeWidth={1.8}
                className="absolute transition-all duration-300"
                style={{
                  transform: isDark ? "rotate(-90deg) scale(0)" : "rotate(0deg) scale(1)",
                  opacity: isDark ? 0 : 1,
                }}
              />
            </button>
          )}
        </div>
      </div>

    </header>
  );
}

export default AppNavbar;
