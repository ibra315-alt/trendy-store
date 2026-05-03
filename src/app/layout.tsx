import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/theme-provider";
import { AuthGuard } from "@/components/auth-guard";
import { LocaleProvider } from "@/components/locale-provider";

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
      <body className="min-h-full antialiased" style={{ background: "#0f0f0f" }}>
        <Providers>
          <LocaleProvider>
            <AuthGuard>{children}</AuthGuard>
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  );
}
