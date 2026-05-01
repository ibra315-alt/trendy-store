"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Settings,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useT } from "@/lib/i18n";

export function Dock() {
  const pathname = usePathname();
  const isAdmin = useAuthStore((s) => s.isAdmin);
  const t = useT();

  const navItems = [
    { href: "/", label: t.nav.home, icon: LayoutDashboard, adminOnly: false },
    { href: "/orders", label: t.nav.orders, icon: ShoppingCart, adminOnly: false },
    { href: "/batches", label: t.nav.batches, icon: Package, adminOnly: false },
    { href: "/finance", label: t.nav.finance, icon: DollarSign, adminOnly: true },
    { href: "/customers", label: t.nav.customers, icon: Users, adminOnly: true },
    { href: "/settings", label: t.nav.settings, icon: Settings, adminOnly: true },
  ];

  const filteredItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin()) return false;
    return true;
  });

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed z-50 left-1/2 -translate-x-1/2 flex items-center px-2 sm:px-3 py-2 rounded-[2.5rem] bg-card/50 backdrop-blur-2xl border border-[var(--border)]/25"
      style={{
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        boxShadow: "0 4px 24px rgba(0,0,0,0.18), 0 1px 6px rgba(0,0,0,0.10), 0 0 0 1px rgba(255,255,255,0.06)",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {filteredItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center justify-center gap-0.5 w-14 sm:w-16 py-1.5 rounded-3xl transition-all duration-200 group ${
              active
                ? "text-[var(--accent)]"
                : "text-[var(--muted)] hover:text-[var(--accent)]"
            }`}
          >
            {/* Top pill indicator */}
            {active && (
              <span className="absolute -top-0.5 w-5 h-[3px] rounded-full bg-[var(--accent)]" />
            )}

            {/* Icon container with glow */}
            <div
              className={`relative flex items-center justify-center w-10 h-8 rounded-3xl transition-all duration-200 ${
                active
                  ? "bg-[var(--accent)]/12 dock-glow"
                  : "group-hover:bg-[var(--accent)]/5"
              }`}
            >
              {active && <span className="pulse-ring" />}
              <Icon
                size={active ? 22 : 20}
                strokeWidth={active ? 2.4 : 1.8}
              />
            </div>

            <span
              className={`leading-tight transition-colors duration-200 ${
                active
                  ? "text-[11px] font-semibold text-[var(--accent)]"
                  : "text-[10px] font-medium text-[var(--muted)] group-hover:text-[var(--accent)]"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default Dock;
