/** Shared HTTP helpers for channel adapters. */

export async function jsonFetch<T = unknown>(
  url: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.token) headers.set("Authorization", `Bearer ${init.token}`);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${url}: ${typeof data === "string" ? data.slice(0, 200) : JSON.stringify(data).slice(0, 200)}`);
  }
  return data as T;
}

export function chunkText(text: string, max: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += max) out.push(text.slice(i, i + max));
  return out.length ? out : [""];
}

export function opt(cfg: { options?: Record<string, string> }, key: string, fallback = ""): string {
  return cfg.options?.[key]?.trim() || fallback;
}
