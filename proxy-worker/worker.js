// Cloudflare Worker — lightweight proxy for fetching product pages
// Cloudflare IPs are NOT blocked by Turkish shopping sites (unlike Vercel/AWS)

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    if (request.method !== "POST") {
      return new Response("POST only", { status: 405, headers: corsHeaders() });
    }

    try {
      const { url } = await request.json();
      if (!url || typeof url !== "string") {
        return new Response(JSON.stringify({ error: "url required" }), {
          status: 400,
          headers: { ...corsHeaders(), "Content-Type": "application/json" },
        });
      }

      // Determine best UA based on target site
      const hostname = new URL(url).hostname.toLowerCase();
      const isInstagram = hostname.includes("instagram.com");
      const ua = isInstagram
        ? "Googlebot/2.1 (+http://www.google.com/bot.html)"
        : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

      const res = await fetch(url, {
        headers: {
          "User-Agent": ua,
          "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });

      const html = await res.text();

      return new Response(html, {
        status: res.status,
        headers: {
          ...corsHeaders(),
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
      });
    }
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
