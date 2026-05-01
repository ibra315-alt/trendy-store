/**
 * BottomDock — Standalone Navigation Bar
 *
 * يعمل في أي تطبيق React بدون أي مكتبات خارجية.
 * كل ما تحتاجه: React + أيقونات من أي مصدر (أو SVG مباشر).
 *
 * الاستخدام:
 * ─────────────────────────────────────────────────────────────
 * import { BottomDock } from "./BottomDock";
 *
 * const items = [
 *   { href: "/",        label: "الرئيسية", icon: HomeIcon },
 *   { href: "/orders",  label: "الطلبات",  icon: CartIcon },
 *   { href: "/settings",label: "الإعدادات",icon: GearIcon },
 * ];
 *
 * // لتحديد الصفحة النشطة يدوياً:
 * <BottomDock items={items} currentPath={window.location.pathname} />
 *
 * // للتنقل بدون Next.js:
 * <BottomDock items={items} currentPath={currentPage} onNavigate={setCurrentPage} />
 * ─────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, ElementType } from "react";

// ─── Types ───────────────────────────────────────────────────

export interface DockItem {
  href: string;
  label: string;
  /** أي component يقبل size و strokeWidth (مثل lucide-react) */
  icon: ElementType<{ size?: number; strokeWidth?: number }>;
}

export interface BottomDockProps {
  items: DockItem[];
  /** المسار الحالي للصفحة النشطة */
  currentPath?: string;
  /** عند النقر على عنصر — يمرر الـ href المختار */
  onNavigate?: (href: string) => void;
  /** لون العنصر النشط (افتراضي: ذهبي) */
  accentColor?: string;
  /** لون النص العادي (افتراضي: رمادي) */
  mutedColor?: string;
  /** خلفية الدوك */
  background?: string;
}

// ─── Sound (اختياري — يعمل تلقائياً إذا دعم المتصفح) ────────

function playTap() {
  try {
    type AC = typeof AudioContext;
    const Ctor: AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: AC }).webkitAudioContext;
    const ac = new Ctor();
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.07);
    gain.gain.setValueAtTime(0.10, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    osc.start(t);
    osc.stop(t + 0.08);
    setTimeout(() => { try { ac.close(); } catch { /**/ } }, 300);
    try { if (navigator.vibrate) navigator.vibrate(6); } catch { /**/ }
  } catch { /**/ }
}

// ─── CSS injected once ───────────────────────────────────────

const STYLE_ID = "bottom-dock-styles";

function injectStyles(accent: string) {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .bd-pulse-ring {
      position: absolute;
      inset: -4px;
      border-radius: 999px;
      border: 1.5px solid ${accent};
      opacity: 0;
      animation: bd-pulse 2s ease-out infinite;
      pointer-events: none;
    }
    @keyframes bd-pulse {
      0%   { transform: scale(0.85); opacity: 0.5; }
      70%  { transform: scale(1.15); opacity: 0; }
      100% { transform: scale(1.15); opacity: 0; }
    }
    .bd-item {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      width: 56px;
      padding: 6px 0;
      border-radius: 999px;
      transition: all 0.2s;
      cursor: pointer;
      text-decoration: none;
      border: none;
      background: transparent;
      -webkit-tap-highlight-color: transparent;
    }
    @media (min-width: 640px) { .bd-item { width: 64px; } }
    .bd-icon-wrap {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 32px;
      border-radius: 999px;
      transition: all 0.2s;
    }
    .bd-label {
      line-height: 1.2;
      font-family: inherit;
      transition: color 0.2s;
    }
  `;
  document.head.appendChild(style);
}

// ─── Component ───────────────────────────────────────────────

export function BottomDock({
  items,
  currentPath,
  onNavigate,
  accentColor  = "#C9A84C",
  mutedColor   = "#69717E",
  background   = "rgba(28,28,30,0.75)",
}: BottomDockProps) {
  const [activePath, setActivePath] = useState(
    currentPath ?? (typeof window !== "undefined" ? window.location.pathname : "/")
  );

  // تزامن مع currentPath الخارجي
  useEffect(() => {
    if (currentPath !== undefined) setActivePath(currentPath);
  }, [currentPath]);

  // inject CSS مرة واحدة
  useEffect(() => {
    injectStyles(accentColor);
  }, [accentColor]);

  function isActive(href: string) {
    if (href === "/") return activePath === "/";
    return activePath.startsWith(href);
  }

  function handleClick(href: string) {
    playTap();
    setActivePath(href);
    onNavigate?.(href);
  }

  return (
    <nav
      style={{
        position: "fixed",
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        padding: "8px 8px",
        borderRadius: "40px",
        background,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "0 4px 24px rgba(0,0,0,0.28), 0 1px 6px rgba(0,0,0,0.14), 0 0 0 1px rgba(255,255,255,0.05)",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {items.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        const color = active ? accentColor : mutedColor;

        return (
          <button
            key={item.href}
            className="bd-item"
            onClick={() => handleClick(item.href)}
            style={{ color }}
          >
            {/* Top pill indicator */}
            {active && (
              <span
                style={{
                  position: "absolute",
                  top: "-2px",
                  width: "20px",
                  height: "3px",
                  borderRadius: "999px",
                  background: accentColor,
                }}
              />
            )}

            {/* Icon box */}
            <div
              className="bd-icon-wrap"
              style={{
                background: active
                  ? `${accentColor}1F`  /* 12% opacity */
                  : "transparent",
              }}
            >
              {active && <span className="bd-pulse-ring" />}
              <Icon
                size={active ? 22 : 20}
                strokeWidth={active ? 2.4 : 1.8}
              />
            </div>

            {/* Label */}
            <span
              className="bd-label"
              style={{
                fontSize: active ? "11px" : "10px",
                fontWeight: active ? 600 : 500,
                color,
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomDock;

// ─── مثال للاستخدام (يمكن حذفه) ─────────────────────────────
/*
import { BottomDock } from "./BottomDock";
import { Home, ShoppingBag, Package, Settings } from "lucide-react";

const NAV = [
  { href: "/",        label: "الرئيسية",  icon: Home       },
  { href: "/orders",  label: "الطلبات",   icon: ShoppingBag },
  { href: "/batches", label: "الشحنات",   icon: Package     },
  { href: "/settings",label: "الإعدادات", icon: Settings    },
];

function App() {
  const [page, setPage] = React.useState("/");
  return (
    <>
      <BottomDock
        items={NAV}
        currentPath={page}
        onNavigate={setPage}
        accentColor="#C9A84C"   // لون الذهبي — غيّره كما تشاء
        mutedColor="#69717E"    // لون الأيقونات غير النشطة
      />
    </>
  );
}
*/
