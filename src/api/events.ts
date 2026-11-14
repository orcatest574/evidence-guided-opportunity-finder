export interface EventItem {
  title: string;
  date: string | null;
  location: string | null;
  description: string | null;
  url: string | null;
}

const BASE = (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export async function fetchEvents(companyName: string): Promise<EventItem[]> {
  const url = `${BASE}/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_name: companyName }),
  });
  let body: any;
  try { body = await res.json(); } catch (e) { throw new Error(`Unexpected response: ${res.status} ${res.statusText}`); }
  if (!res.ok) {
    const detail = body?.detail ?? body?.message ?? res.statusText;
    throw new Error(detail);
  }
  if (!Array.isArray(body.events)) return [];
  return body.events as EventItem[];
}
