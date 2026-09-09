const providerA = process.env.GEO_PROVIDER_A || "https://ip-api.com/json";
const providerB = process.env.GEO_PROVIDER_B || "https://ipapi.co";

async function getJson(url, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function enrichIp(ip, fetcher = getJson) {
  if (!ip || ip === "::1" || ip === "127.0.0.1") {
    return { provider: "local", country: null, city: null };
  }

  try {
    const data = await fetcher(`${providerA}/${encodeURIComponent(ip)}`);
    if (data.status === "fail") throw new Error("Provider A failed");
    return { provider: "A", country: data.country || null, city: data.city || null };
  } catch {
    try {
      const data = await fetcher(`${providerB}/${encodeURIComponent(ip)}/json/`);
      return { provider: "B", country: data.country_name || null, city: data.city || null };
    } catch {
      return { provider: "none", country: null, city: null };
    }
  }
}
