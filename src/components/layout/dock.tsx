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

const navItems = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard, adminOnly: false },
  { href: "/orders", label: "الطلبات", icon: ShoppingCart, adminOnly: false },
  { href: "/batches", label: "الشحنات", icon: Package, adminOnly: false },
  { href: "/finance", label: "المالية", icon: DollarSign, adminOnly: true },
  { href: "/customers", label: "العملاء", icon: Users, adminOnly: true },
  { href: "/settings", label: "النظام", icon: Settings, adminOnly: true },
];

export function Dock() {
  const pathname = usePathname();
  const isAdmin = useAuthStore((s) => s.isAdmin);

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
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 sm:justify-center sm:gap-2 bg-card/40 backdrop-blur-3xl border-t border-border/30"
      style={{
        height: "calc(80px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {filteredItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center justify-center gap-0.5 w-14 sm:w-16 py-1.5 rounded-xl transition-all duration-200 group ${
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
              className={`relative flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-200 ${
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
