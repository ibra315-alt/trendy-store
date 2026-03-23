import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();
    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    let handle = username.trim();
    // Extract username from full URL
    if (handle.includes("instagram.com/")) {
      const match = handle.match(/instagram\.com\/([^/?#]+)/);
      if (match) handle = match[1];
    }
    handle = handle.replace(/^@/, "");
    if (!handle) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }

    // The Cloudflare Worker handles all Instagram strategies:
    // 1. Instagram API with app ID
    // 2. Googlebot UA for og:title
    // 3. DuckDuckGo search fallback
    const PROXY_URL = "https://trendy-proxy.ibra-315.workers.dev";
    const proxyRes = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: `https://www.instagram.com/${encodeURIComponent(handle)}/` }),
    });

    if (!proxyRes.ok) {
      const err = await proxyRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.error || "لم يتم العثور على الحساب" },
        { status: proxyRes.status }
      );
    }

    // Worker returns { displayName: "..." } for Instagram
    const data = await proxyRes.json();
    if (data.displayName) {
      return NextResponse.json({ displayName: data.displayName });
    }

    return NextResponse.json({ error: "لم يتم العثور على الاسم" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "فشل في جلب البيانات" }, { status: 500 });
  }
}
