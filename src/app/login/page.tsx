"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { ShoppingBag, Loader2, Eye, EyeOff } from "lucide-react";

function StoreName({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return <span style={{ color: "#c9a84c" }}>{name}</span>;
  }
  const mid = Math.ceil(parts.length / 2);
  const first = parts.slice(0, mid).join(" ");
  const second = parts.slice(mid).join(" ");
  return (
    <>
      <span style={{ color: "#c9a84c" }}>{first}</span>
      <span style={{ color: "var(--foreground)" }}> {second}</span>
    </>
  );
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [storeName, setStoreName] = useState("متجر ترندي");
  const [logo, setLogo] = useState<string | null>(null);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d) return;
        if (d.storeName) setStoreName(d.storeName);
        if (d.logo) setLogo(d.logo);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "فشل تسجيل الدخول"); return; }
      setAuth(data.user, data.token);
      router.push("/");
    } catch {
      setError("خطأ في الشبكة. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4 relative overflow-hidden">

      {/* Radial glow behind card */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
        style={{ background: "radial-gradient(ellipse at center, rgba(201,168,76,0.07) 0%, transparent 70%)" }}
      />

      {/* Subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "28px 28px" }}
      />

      {/* Aura blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="aura-blob aura-blob-1" />
        <div className="aura-blob aura-blob-2" />
        <div className="aura-blob aura-blob-3" />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-[400px]" style={{ animation: "fadeInUp 0.45s ease both" }}>
        <div
          className="rounded-3xl border border-[var(--border)] p-8"
          style={{
            background: "rgba(var(--surface-rgb, 22,22,22), 0.85)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 8px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.05), 0 0 60px rgba(201,168,76,0.06)",
          }}
        >
          {/* Logo / Branding */}
          <div className="flex flex-col items-center mb-8">
            {logo ? (
              <img
                src={logo}
                alt={storeName}
                className="mb-5"
                style={{
                  width: "90px",
                  height: "90px",
                  objectFit: "contain",
                  filter: "drop-shadow(0 2px 8px rgba(201,168,76,0.45)) drop-shadow(0 8px 24px rgba(0,0,0,0.55)) drop-shadow(0 1px 2px rgba(255,255,255,0.08))",
                  transform: "perspective(400px) rotateX(4deg)",
                  transformOrigin: "center bottom",
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: "linear-gradient(135deg, #c9a84c 0%, #b8860b 100%)", boxShadow: "0 4px 20px rgba(201,168,76,0.35)" }}
              >
                <ShoppingBag className="w-8 h-8 text-black" />
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-wide" style={{ letterSpacing: "0.04em" }}>
              <StoreName name={storeName} />
            </h1>
          </div>

          {/* Divider */}
          <div className="h-px mb-6" style={{ background: "linear-gradient(to right, transparent, var(--border), transparent)" }} />

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-400 border border-red-500/20" style={{ background: "rgba(239,68,68,0.08)" }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 px-4 rounded-xl text-sm outline-none transition-all duration-150"
                style={{
                  background: "var(--background)",
                  border: "1.5px solid var(--border)",
                  color: "var(--foreground)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#c9a84c"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-medium" style={{ color: "var(--muted)" }}>
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-4 pe-10 rounded-xl text-sm outline-none transition-all duration-150"
                  style={{
                    background: "var(--background)",
                    border: "1.5px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#c9a84c"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
                  placeholder="أدخل كلمة المرور"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80"
                  style={{ color: "var(--muted)" }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{
                background: "linear-gradient(135deg, #c9a84c 0%, #b8860b 100%)",
                color: "#111",
                boxShadow: loading ? "none" : "0 4px 16px rgba(201,168,76,0.3)",
              }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </button>
          </form>
        </div>

        {/* Bottom label */}
        <p className="text-center text-[11px] mt-4" style={{ color: "var(--muted)" }}>
          &copy; {new Date().getFullYear()} {storeName}
        </p>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
