import { useEffect, useState } from "react";
import { CalendarDays, ExternalLink, MapPin, RefreshCw, Search } from "lucide-react";
import { fetchEvents, type EventItem } from "@/api/events";

// Kept for the whole browser session so the slow live search only runs once per company.
const cache: Record<string, EventItem[]> = {};

/**
 * Live results from the collector agent (AI + web search), shown below the curated opportunities.
 * Loads in the background and never blocks the rest of the page.
 */
export function LiveEvents({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [events, setEvents] = useState<EventItem[] | null>(cache[companyId] ?? null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cache[companyId]) { setEvents(cache[companyId]!); return; }
    let active = true;
    setEvents(null); setError(null);
    fetchEvents(companyId)
      .then(res => { cache[companyId] = res; if (active) setEvents(res); })
      .catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [companyId, attempt]);

  return <section className="live-section">
    <div className="live-head">
      <div>
        <h2 className="section-heading"><Search size={18}/>Found by the search agent</h2>
        <p className="card-help">An AI agent searched the web for upcoming opportunities that fit {companyName}'s profile. These results are not verified – check the source before acting.</p>
      </div>
      <span className="ai-badge">Live AI search · unverified</span>
    </div>

    {error ? <div className="card live-error">
      <p className="text-sm">{error}</p>
      <button className="btn mt-3" onClick={() => setAttempt(a => a + 1)}><RefreshCw size={14}/>Try again</button>
    </div>
    : !events ? <div className="opp-grid">{[0, 1, 2].map(i => <article key={i} className="opp-card skeleton-card" aria-busy="true"><span className="skeleton w-24"/><span className="skeleton w-3/4 mt-3"/><span className="skeleton w-full mt-2"/><span className="skeleton w-2/3 mt-2"/></article>)}
      <p className="card-help col-span-full">Searching the web – this takes up to half a minute…</p></div>
    : !events.length ? <div className="empty">The search agent found no upcoming opportunities this time.</div>
    : <div className="opp-grid">{events.map((e, i) => <article key={`${e.title}-${i}`} className="opp-card" data-live="true">
        <div className="opp-top"><div className="flex flex-wrap items-center gap-2">{e.type && <span className="type-tag" data-type={e.type}>{e.type}</span>}<span className="status">AI search result</span></div></div>
        <h3 className="opp-title">{e.title}</h3>
        {e.description && <p className="opp-summary">{e.description}</p>}
        <div className="opp-meta">{e.date && <span><CalendarDays size={13}/>{e.date}</span>}{e.location && <span><MapPin size={13}/>{e.location}</span>}</div>
        <div className="opp-foot">{e.url ? <a className="link text-sm font-semibold" href={e.url} target="_blank" rel="noopener noreferrer">Check the source<ExternalLink size={13}/></a> : <span className="card-help">No source link – treat with caution.</span>}</div>
      </article>)}</div>}
  </section>;
}
