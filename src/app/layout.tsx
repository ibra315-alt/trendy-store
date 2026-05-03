import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/theme-provider";
import { AuthGuard } from "@/components/auth-guard";
import { LocaleProvider } from "@/components/locale-provider";
import { PWARegister } from "@/components/pwa-register";

const ibmPlex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Trendy Store",
  description: "نظام إدارة متجر ترندي",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trendy Store",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1a1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${ibmPlex.variable} h-full`}
      style={{ background: "#0f0f0f", colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Trendy Store" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="min-h-full antialiased" style={{ background: "#0f0f0f" }}>
        <Providers>
          <LocaleProvider>
            <AuthGuard>{children}</AuthGuard>
          </LocaleProvider>
        </Providers>
        <PWARegister />
      </body>
    </html>
  );
}
