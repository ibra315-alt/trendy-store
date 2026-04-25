import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export interface ScrapedProduct {
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  price?: string;
  currency?: string;
  image?: string;
  allImages?: string[];
  colors?: { name: string; image?: string }[];
  sizes?: string[];
  productType?: string;
}

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PROXY_URL = "https://trendy-proxy.ibra-315.workers.dev";

// Turkish sites that work with direct fetch (no IP blocking)
const DIRECT_FETCH_HOSTS = [
  "shulebags.com", "ticimax.cloud", "tiamoda.com",
  "trendyol.com", "hepsiburada.com", "n11.com",
  "koton.com", "lcwaikiki.com", "defacto.com.tr",
  "boyner.com.tr", "morhipo.com", "markafoni.com",
  "modanisa.com", "lidyana.com", "fashfed.com",
  "pttavm.com", "gittigidiyor.com", "ciceksepeti.com",
  "nisantasishoes.com",
];

async function fetchHtml(url: string): Promise<string> {
  const hostname = new URL(url).hostname.toLowerCase();
  const useDirect = DIRECT_FETCH_HOSTS.some((h) => hostname.includes(h));

  if (useDirect) {
    const res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, "Accept": "text/html" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  const proxyRes = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!proxyRes.ok) throw new Error(`Proxy ${proxyRes.status}`);
  return proxyRes.text();
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let html: string;
    try {
      html = await fetchHtml(url);
    } catch {
      return NextResponse.json({ error: "فشل في جلب الصفحة" }, { status: 502 });
    }

    const result: ScrapedProduct = { name: "" };
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Extract size and color from URL query parameters
    // e.g. ?Numara=37  ?Beden=S  ?Renk=Kahve
    const sizeParamNames = ["numara", "beden", "size", "beden_id", "numara_id"];
    for (const param of sizeParamNames) {
      const val = parsedUrl.searchParams.get(param) ?? parsedUrl.searchParams.get(param[0].toUpperCase() + param.slice(1));
      if (val?.trim()) { result.sizes = [val.trim()]; break; }
    }
    const colorParamNames = ["renk", "color", "colour", "renk_id", "color_id"];
    for (const param of colorParamNames) {
      const val = parsedUrl.searchParams.get(param) ?? parsedUrl.searchParams.get(param[0].toUpperCase() + param.slice(1));
      if (val?.trim()) { result.colors = [{ name: val.trim() }]; break; }
    }

    // ──────────────────────────────────────────────
    // 1. Universal: OG tags + JSON-LD
    // ──────────────────────────────────────────────
    result.name =
      extractMeta(html, "og:title") ||
      extractMeta(html, "twitter:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "";

    const ogImg = extractMeta(html, "og:image") || extractMeta(html, "twitter:image");
    if (ogImg) result.image = normalizeUrl(ogImg);

    const ogPrice = extractMeta(html, "product:price:amount") || extractMeta(html, "og:price:amount");
    if (ogPrice) result.price = ogPrice;

    const ogCurrency = extractMeta(html, "product:price:currency") || extractMeta(html, "og:price:currency");
    if (ogCurrency) result.currency = ogCurrency;

    const ogDesc = extractMeta(html, "og:description") || extractMeta(html, "description");
    if (ogDesc) result.description = ogDesc.slice(0, 500);

    // ──────────────────────────────────────────────
    // 2. JSON-LD structured data
    // ──────────────────────────────────────────────
    const jsonLdBlocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const block of jsonLdBlocks) {
      try {
        const raw = JSON.parse(block[1]);
        const items = Array.isArray(raw) ? raw : raw["@graph"] ? raw["@graph"] : [raw];
        for (const item of items) {
          if (item["@type"] !== "Product") continue;
          if (item.name) result.name = item.name;
          if (item.color) { const c = resolveColor(item.color); if (c) result.colors = [{ name: c }]; }
          if (item.brand?.name) result.brand = item.brand.name;
          if (item.description) result.description = String(item.description).slice(0, 500);
          if (item.image) {
            const img = Array.isArray(item.image) ? item.image[0] : item.image;
            result.image = normalizeUrl(typeof img === "string" ? img : img?.url || "");
            if (Array.isArray(item.image) && item.image.length > 1) {
              result.allImages = item.image.slice(0, 10).map((i: string | { url: string }) =>
                normalizeUrl(typeof i === "string" ? i : i?.url || "")
              );
            }
          }
          if (item.offers) {
            const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
            const first = offers[0];
            if (first?.price) result.price = String(first.price);
            if (first?.priceCurrency) result.currency = first.priceCurrency;
            // Extract sizes from multiple offers
            const sizeSet = new Set<string>();
            for (const o of offers) {
              if (o.sku) {
                const sizeMatch = o.sku.match(/[-_](\d{2,3}|XS|S|M|L|XL|XXL|XXXL)$/i);
                if (sizeMatch) sizeSet.add(sizeMatch[1].toUpperCase());
              }
              if (o.name) {
                const sMatch = o.name.match(/(XS|S|M|L|XL|XXL|XXXL|\d{2,3})/i);
                if (sMatch) sizeSet.add(sMatch[1].toUpperCase());
              }
            }
            if (sizeSet.size > 0) result.sizes = [...sizeSet];
          }
          break;
        }
      } catch { /* skip */ }
    }

    // ──────────────────────────────────────────────
    // 3. TRENDYOL — rich variant extraction
    // ──────────────────────────────────────────────
    if (hostname.includes("trendyol")) {
      const stateMatch = html.match(/__PRODUCT_DETAIL_APP_INITIAL_STATE__\s*=\s*({[\s\S]*?});\s*<\/script>/);
      if (stateMatch) {
        try {
          const state = JSON.parse(stateMatch[1]);
          const p = state?.product;
          if (p) {
            if (p.name) result.name = p.name;
            if (p.brand?.name) result.brand = p.brand.name;
            if (p.category?.name) result.category = p.category.name;
            if (p.images?.length) {
              result.image = normalizeUrl(p.images[0]);
              result.allImages = p.images.slice(0, 10).map(normalizeUrl);
            }
            const price = p.price?.sellingPrice?.value || p.price?.sellingPrice || p.price?.originalPrice?.value;
            if (price) result.price = String(price);

            // Extract the current variant's color from attributes FIRST (specific to this URL)
            let currentColor: string | null = resolveColor(p.color || p.colorName || "");
            if (p.attributes) {
              for (const attr of p.attributes) {
                const key = (attr.key?.name || attr.name || "").toLowerCase();
                const val = attr.value?.name || attr.value || "";
                if (key.includes("renk") || key.includes("color")) {
                  currentColor = resolveColor(val) || currentColor;
                }
                if (key.includes("beden") || key.includes("size") || key.includes("numara")) {
                  if (!result.sizes?.length && val) result.sizes = [val];
                }
              }
            }

            // Colors from all variants (for the color picker list)
            if (p.allVariants || p.variants) {
              const variants = p.allVariants || p.variants;
              const colorMap = new Map<string, { name: string; image?: string }>();
              const sizeSet = new Set<string>();

              if (Array.isArray(variants)) {
                for (const v of variants) {
                  const colorName = resolveColor(v.colorName || v.color || v.attributeValue || "");
                  if (colorName && !colorMap.has(colorName)) {
                    colorMap.set(colorName, {
                      name: colorName,
                      image: v.images?.[0] ? normalizeUrl(v.images[0]) : undefined,
                    });
                  }
                  const sizeName = v.sizeName || v.size || v.barcodeName;
                  if (sizeName) sizeSet.add(sizeName);
                }
              }

              if (colorMap.size > 0) result.colors = [...colorMap.values()];
              if (sizeSet.size > 0) result.sizes = [...sizeSet];
            }

            // Color groups (other color variants)
            if (p.otherColors && Array.isArray(p.otherColors)) {
              const colors: { name: string; image?: string }[] = [];
              for (const c of p.otherColors) {
                const name = resolveColor(c.colorName || c.name || "") || c.colorName || c.name || "";
                if (name) colors.push({ name, image: c.imageUrl ? normalizeUrl(c.imageUrl) : undefined });
              }
              if (colors.length > 0) result.colors = colors;
            }

            // Ensure the current page's specific color is always first
            if (currentColor) {
              const rest = (result.colors || []).filter(c => c.name.toLowerCase() !== currentColor!.toLowerCase());
              result.colors = [{ name: currentColor }, ...rest];
            }
          }
        } catch { /* ignore */ }
      }

      // Extract sizes from size selector HTML
      if (!result.sizes?.length) {
        const sizeMatches = [...html.matchAll(/class="[^"]*sp-itm[^"]*"[^>]*>([^<]+)</g)];
        if (sizeMatches.length) {
          result.sizes = [...new Set(sizeMatches.map(m => m[1].trim()))].filter(Boolean);
        }
      }

      // Extract colors from color variant links
      if (!result.colors?.length) {
        const colorMatches = [...html.matchAll(/title="([^"]+)"[^>]*class="[^"]*slc-img[^"]*"[^>]*src="([^"]*)"/gi)];
        if (colorMatches.length) {
          result.colors = colorMatches.map(m => ({
            name: m[1],
            image: normalizeUrl(m[2]),
          }));
        }
      }

      // CDN fallback images
      if (!result.allImages?.length) {
        const cdnImgs = [...html.matchAll(/src="(https:\/\/cdn\.dsmcdn\.com\/ty\d+\/[^"]*\.(?:jpg|jpeg|png|webp))"/gi)];
        if (cdnImgs.length) {
          const unique = [...new Set(cdnImgs.map(m => m[1]))];
          result.allImages = unique.slice(0, 10);
          if (!result.image) result.image = unique[0];
        }
      }
    }

    // ──────────────────────────────────────────────
    // 4. HEPSIBURADA
    // ──────────────────────────────────────────────
    if (hostname.includes("hepsiburada")) {
      // Size extraction
      const hbSizes = [...html.matchAll(/data-test-id="size-variant"[^>]*>([^<]+)/gi)];
      if (hbSizes.length) {
        result.sizes = [...new Set(hbSizes.map(m => m[1].trim()))];
      }
      // Color extraction
      const hbColors = [...html.matchAll(/data-test-id="color-variant"[^>]*title="([^"]+)"[^>]*(?:style="[^"]*background[^"]*url\(([^)]+)\))?/gi)];
      if (hbColors.length) {
        result.colors = hbColors.map(m => ({ name: m[1], image: m[2] ? normalizeUrl(m[2]) : undefined }));
      }
      // Images
      if (!result.allImages?.length) {
        const hbImgs = [...html.matchAll(/src="(https:\/\/productimages\.hepsiburada\.net\/[^"]+)"/gi)];
        if (hbImgs.length) {
          const unique = [...new Set(hbImgs.map(m => m[1]))];
          result.allImages = unique.slice(0, 10);
          if (!result.image) result.image = unique[0];
        }
      }
    }

    // ──────────────────────────────────────────────
    // 5. N11, Koton, LC Waikiki, DeFacto, Boyner
    // ──────────────────────────────────────────────
    if (hostname.includes("n11")) {
      const n11Price = html.match(/<span[^>]*class="[^"]*newPrice[^"]*"[^>]*>([\d.,]+)/i);
      if (n11Price) result.price = n11Price[1].replace(".", "").replace(",", ".");
      const n11Sizes = [...html.matchAll(/<span[^>]*class="[^"]*optionSize[^"]*"[^>]*>([^<]+)/gi)];
      if (n11Sizes.length) result.sizes = [...new Set(n11Sizes.map(m => m[1].trim()))];
      const n11Colors = [...html.matchAll(/<span[^>]*class="[^"]*optionColor[^"]*"[^>]*title="([^"]+)"/gi)];
      if (n11Colors.length) result.colors = n11Colors.map(m => ({ name: m[1] }));
    }

    // Generic size extraction from HTML
    if (!result.sizes?.length) {
      const genericSizes = [...html.matchAll(/(?:data-(?:size|variant-size)|class="[^"]*size[^"]*")[^>]*>([^<]{1,10})</gi)];
      if (genericSizes.length) {
        const sizes = [...new Set(genericSizes.map(m => m[1].trim()).filter(s => /^(?:XS|S|M|L|XL|XXL|XXXL|\d{2,3})$/i.test(s)))];
        if (sizes.length) result.sizes = sizes;
      }
    }

    // Embedded script JSON scan for size/beden/numara keys
    if (!result.sizes?.length) {
      for (const [, content] of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
        // Array of sizes: "beden": ["S","M","L"] or "sizes": [...]
        const arrMatch = content.match(/"(?:beden|numara|sizes?|availableSizes?|sizeValues?|bedenler)"\s*:\s*(\[[^\]]{1,500}\])/i);
        if (arrMatch) {
          try {
            const arr: unknown[] = JSON.parse(arrMatch[1]);
            const sizes = arr
              .map((v) => (typeof v === "string" ? v : typeof v === "object" && v !== null ? (v as Record<string, string>).name || (v as Record<string, string>).value || "" : String(v)))
              .map((s) => s.trim())
              .filter(Boolean);
            if (sizes.length) { result.sizes = sizes; break; }
          } catch { /* skip */ }
        }
        // Single value: "beden": "M"
        const singleMatch = content.match(/"(?:beden|numara|sizeName)"\s*:\s*"([^"]{1,30})"/i);
        if (singleMatch?.[1]?.trim()) { result.sizes = [singleMatch[1].trim()]; break; }
      }
    }

    // Embedded script JSON scan for color/renk keys
    if (!result.colors?.length) {
      for (const [, content] of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)) {
        const m = content.match(/"(?:renk|color|colorName|colour)"\s*:\s*"([^"]{1,60})"/i);
        if (m?.[1]?.trim()) {
          const c = resolveColor(m[1].trim());
          if (c) { result.colors = [{ name: c }]; break; }
        }
      }
    }

    // Generic color extraction
    if (!result.colors?.length) {
      const genericColors = [...html.matchAll(/(?:data-(?:color|variant-color)|class="[^"]*color[^"]*")[^>]*title="([^"]+)"/gi)];
      if (genericColors.length) {
        result.colors = [...new Map(genericColors.map(m => [m[1], { name: m[1] }])).values()];
      }
    }

    // Slug-based color fallback (e.g. shulebags.com URLs contain color in slug)
    if (!result.colors?.length) {
      try {
        const pathname = new URL(url).pathname.toLowerCase();
        const segments = pathname.split(/[-\/]+/).filter(Boolean);

        // Longer/compound slugs must be checked first; single-word slugs must match a full segment
        const slugColorMap: [string, string][] = [
          ["findik-kabugu", "Fındık Kabuğu"],
          ["findik", "Fındık Kabuğu"],
          ["kiremit", "Kiremit"],
          ["antrasit", "Antrasit"],
          ["vizon", "Vizon"],
          ["nefti", "Nefti"],
          ["somon", "Somon"],
          ["pudra", "Pudra"],
          ["ekru", "Ekru"],
          ["camel", "Camel"],
          ["leopar", "Leopar"],
          ["lacivert", "Lacivert"],
          ["turuncu", "Turuncu"],
          ["bordo", "Bordo"],
          ["kirmizi", "Kırmızı"],
          ["pembe", "Pembe"],
          ["yesil", "Yeşil"],
          ["altin", "Altın"],
          ["gumus", "Gümüş"],
          ["cevizi", "Cevizi"],
          ["kahve", "Kahve"],
          ["krem", "Krem"],
          ["haki", "Haki"],
          ["bej", "Bej"],
          ["gri", "Gri"],
          ["sari", "Sarı"],
          ["mavi", "Mavi"],
          ["beyaz", "Beyaz"],
          ["siyah", "Siyah"],
          ["mor", "Mor"],
        ];

        for (const [slug, name] of slugColorMap) {
          const matched = slug.includes("-")
            ? pathname.includes(slug)          // compound: substring of full path
            : segments.includes(slug);          // single word: must be a full segment
          if (matched) { result.colors = [{ name }]; break; }
        }
      } catch { /* invalid URL */ }
    }

    // Generic site images fallback
    if (!result.allImages?.length) {
      for (const cdn of ["img-koton.mncdn.com", "img-lcwaikiki.mncdn.com", "dfcdn.defacto.com.tr", "img-boyner.mncdn.com"]) {
        const re = new RegExp(`src="(https://${cdn.replace(/\./g, "\\.")}[^"]+)"`, "gi");
        const matches = [...html.matchAll(re)];
        if (matches.length) {
          const unique = [...new Set(matches.map(m => m[1]))];
          result.allImages = unique.slice(0, 10);
          if (!result.image) result.image = unique[0];
          break;
        }
      }
    }

    // Generic gallery fallback
    if (!result.allImages?.length) {
      const galleryImgs = [...html.matchAll(/<img[^>]+src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"[^>]*(?:class="[^"]*(?:product|gallery|detail|zoom)[^"]*"|data-(?:zoom|src|image))/gi)];
      if (galleryImgs.length) {
        const unique = [...new Set(galleryImgs.map(m => m[1]))];
        result.allImages = unique.slice(0, 10);
        if (!result.image) result.image = unique[0];
      }
    }

    // ──────────────────────────────────────────────
    // 6. Detect product type
    // ──────────────────────────────────────────────
    const nameLower = ((result.name) || "").toLowerCase() + " " + ((result.category) || "").toLowerCase();
    if (/çanta|bag|shopper|clutch|sırt\s?çant|el\s?çant|omuz\s?çant|postacı/i.test(nameLower)) {
      result.productType = "Bag";
    } else if (/ayakkabı|shoe|bot|sneaker|sandalet|terlik|topuklu|babet|loafer/i.test(nameLower)) {
      result.productType = "Shoe";
    } else if (/elbise|gömlek|pantolon|tişört|ceket|mont|kazak|triko|bluz|etek|şort|yelek|hoodie|sweatshirt|eşofman/i.test(nameLower)) {
      result.productType = "Clothing";
    } else if (/aksesuar|kolye|küpe|bileklik|yüzük|saat|kemer|şal|gözlük|cüzdan/i.test(nameLower)) {
      result.productType = "Accessory";
    }

    if (!result.allImages?.length && result.image) {
      result.allImages = [result.image];
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json({ error: "فشل في جلب بيانات المنتج" }, { status: 500 });
  }
}

function extractMeta(html: string, property: string): string | null {
  const r1 = new RegExp(`<meta[^>]*(?:property|name)="${property}"[^>]*content="([^"]*)"`, "i");
  const m1 = html.match(r1);
  if (m1) return m1[1];
  const r2 = new RegExp(`<meta[^>]*content="([^"]*)"[^>]*(?:property|name)="${property}"`, "i");
  const m2 = html.match(r2);
  if (m2) return m2[1];
  return null;
}

function normalizeUrl(u: string): string {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}


// Returns the raw color string as-is; filters out hex/rgb values which are not human-readable names.
function resolveColor(raw: string): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t) return null;
  if (/^#[0-9a-f]{3,8}$/i.test(t) || /^rgb/i.test(t)) return null;
  return t;
}
