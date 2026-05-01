interface CacheEntry { data: unknown; ts: number }
const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL = 45_000; // 45 seconds

export async function cachedFetch(
  url: string,
  options?: RequestInit,
  ttl = DEFAULT_TTL,
): Promise<Response> {
  // Only cache GET requests with no body
  const isGet = !options?.method || options.method === "GET";
  if (isGet) {
    const hit = cache.get(url);
    if (hit && Date.now() - hit.ts < ttl) {
      return new Response(JSON.stringify(hit.data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const res = await fetch(url, options);
  if (isGet && res.ok) {
    const clone = res.clone();
    clone.json().then((data) => {
      cache.set(url, { data, ts: Date.now() });
    }).catch(() => {});
  }
  return res;
}

/** Call this after a mutation (POST/PUT/DELETE) to invalidate related caches */
export function invalidateCache(...patterns: string[]) {
  for (const key of cache.keys()) {
    if (patterns.some((p) => key.includes(p))) {
      cache.delete(key);
    }
  }
}
