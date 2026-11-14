import { postJson } from "./client";

export interface EventItem { title: string; type?: string | null; date: string | null; location: string | null; description: string | null; url: string | null }

/** Asks the collector agent to search the web for upcoming opportunities for a company id. */
export async function fetchEvents(companyId: string): Promise<EventItem[]> {
  const data = await postJson<{ events?: EventItem[] }>("/events", { company_name: companyId });
  return Array.isArray(data?.events) ? data.events : [];
}
