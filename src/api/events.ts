import { postJson } from "./client";

export interface EventItem {
  title: string; type?: string | null; date: string | null; location: string | null; description: string | null; url: string | null;
  /** Set by the backend after fetching the page: what was found on it. */
  verification?: "title_and_date" | "title_and_month" | "title_only" | null;
  checked_at?: string | null;
}

/** Asks the collector agent to search the web for upcoming opportunities for a company id. */
export async function fetchEvents(companyId: string): Promise<{ events: EventItem[]; dropped: number }> {
  const data = await postJson<{ events?: EventItem[]; dropped?: number }>("/events", { company_name: companyId });
  return { events: Array.isArray(data?.events) ? data.events : [], dropped: data?.dropped ?? 0 };
}
