// Cloudflare Worker — lightweight proxy for fetching product pages & Instagram profiles

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== "POST") {
      return new Response("POST only", { status: 405, headers: corsHeaders() });
    }

    try {
      const { url } = await request.json();
      if (!url || typeof url !== "string") {
        return jsonResponse({ error: "url required" }, 400);
      }

      const hostname = new URL(url).hostname.toLowerCase();

      // Special handling for Instagram — extract display name server-side
      if (hostname.includes("instagram.com")) {
        return await handleInstagram(url);
      }

      // Default: fetch page with browser UA
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });

      const html = await res.text();
      return new Response(html, {
        status: res.status,
        headers: { ...corsHeaders(), "Content-Type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  },
};

async function handleInstagram(url) {
  // Extract username from URL
  const match = url.match(/instagram\.com\/([^/?#]+)/);
  if (!match) return jsonResponse({ error: "invalid instagram url" }, 400);
  const username = match[1];

  // Strategy 1: Try Instagram's web profile API with app ID
  try {
    const apiRes = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      {
        headers: {
          "User-Agent": "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100)",
          "X-IG-App-ID": "936619743392459",
          Accept: "*/*",
        },
      }
    );
    if (apiRes.ok) {
      const data = await apiRes.json();
      const fullName = data?.data?.user?.full_name;
      if (fullName) {
        return jsonResponse({ displayName: fullName });
      }
    }
  } catch {}

  // Strategy 2: Try Googlebot UA (Instagram shows og:title to Googlebot)
  try {
    const botRes = await fetch(url, {
      headers: {
        "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    if (botRes.ok) {
      const html = await botRes.text();
      const ogMatch = html.match(/"og:title"\s+content="([^"]+)"/i) ||
                       html.match(/content="([^"]+)"\s+property="og:title"/i);
      if (ogMatch) {
        const decoded = decodeEntities(ogMatch[1]);
        const nameMatch = decoded.match(/^(.+?)\s*\(@/);
        if (nameMatch) {
          return jsonResponse({ displayName: nameMatch[1].trim() });
        }
      }
    }
  } catch {}

  // Strategy 3: Search DuckDuckGo for the Instagram profile
  try {
    const ddgRes = await fetch(
      `https://html.duckduckgo.com/html/?q=instagram.com/${username}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "text/html",
        },
      }
    );
    if (ddgRes.ok) {
      const html = await ddgRes.text();
      // Look for: DisplayName (@username) • Instagram photos and videos
      const re = new RegExp(`([^<"]+?)\\s*\\(@${username}\\)\\s*[•·]`, "i");
      const m = html.match(re);
      if (m) {
        return jsonResponse({ displayName: decodeEntities(m[1].trim()) });
      }
    }
  } catch {}

  return jsonResponse({ error: "could not find profile" }, 404);
}

function decodeEntities(str) {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#064;/g, "@");
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
