"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuraBackground } from "./aura-background";
import { AppNavbar } from "./top-bar";
import { Dock } from "./dock";
import { useDir } from "@/lib/i18n";
import { useAuthStore } from "@/store/auth";

// All app routes — prefetched on mount for instant navigation
const ALL_ROUTES = ["/", "/orders", "/batches", "/warehouse"];
const ADMIN_ROUTES = ["/finance", "/customers", "/settings"];

function NavProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const start = () => {
      done.current = false;
      setWidth(8);
      setVisible(true);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => {
        setWidth((w) => {
          if (w >= 82) { clearInterval(timer.current!); return 82; }
          return w + Math.random() * 12;
        });
      }, 180);
    };

    const finish = () => {
      if (done.current) return;
      done.current = true;
      if (timer.current) clearInterval(timer.current);
      setWidth(100);
      setTimeout(() => { setVisible(false); setWidth(0); }, 300);
    };

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href === pathname) return;
      start();
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  // Finish when pathname changes (navigation complete)
  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      setWidth(100);
      if (timer.current) clearInterval(timer.current);
      setTimeout(() => { setVisible(false); setWidth(0); done.current = true; }, 280);
    }
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2.5px] transition-all duration-200"
      style={{
        width: `${width}%`,
        background: "linear-gradient(to right, #c9a84c, #f0d080)",
        boxShadow: "0 0 8px rgba(201,168,76,0.6)",
        transition: width === 100 ? "width 0.25s ease-out" : "width 0.18s ease",
      }}
    />
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const dir = useDir();
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.isAdmin);

  // Prefetch all routes immediately so navigation is instant
  useEffect(() => {
    ALL_ROUTES.forEach((r) => router.prefetch(r));
    if (isAdmin()) ADMIN_ROUTES.forEach((r) => router.prefetch(r));
  }, []);

  return (
    <div className="min-h-dvh bg-ground transition-colors duration-300" dir={dir}>
      <NavProgress />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[100] focus:bg-[var(--accent)] focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        تخطي إلى المحتوى
      </a>

      <AuraBackground />
      <AppNavbar />

      <main
        id="main-content"
        className="px-4 sm:px-7 lg:px-10"
        style={{
          paddingTop: "calc(56px + 20px)",
          paddingBottom: "calc(80px + 32px)",
        }}
      >
        {children}
      </main>

      <Dock />
    </div>
  );
}

export default AppShell;
