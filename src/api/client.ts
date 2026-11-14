// Shared helper for calls to the Python backend (backend/api.py).
// Set VITE_API_URL in .env to point at another server; default is the local dev server.
export const API_BASE = ((import.meta.env["VITE_API_URL"] as string | undefined) || "http://127.0.0.1:8000").replace(/\/+$/, "");

export class BackendOffline extends Error {
  constructor() { super("The AI service is not running. Start the backend (see README) and try again."); }
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new BackendOffline();
  }
  const data = await res.json().catch(() => null) as { detail?: string } | null;
  if (!res.ok) throw new Error(data?.detail ?? `Request failed (${res.status})`);
  return data as T;
}
