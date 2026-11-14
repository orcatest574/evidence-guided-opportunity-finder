import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, CircleAlert, ExternalLink, MapPin, RefreshCw, Search } from "lucide-react";
import { fetchEvents, type EventItem } from "@/api/events";

// Kept for the whole browser session so the slow live search only runs once per company.
const cache: Record<string, { events: EventItem[]; dropped: number }> = {};

const CHECK_LABEL = {
  title_and_date: "Title and date found on the page",
  title_and_month: "Title and month found on the page",
  title_only: "Title found on the page – date not confirmed",
} as const;

/**
 * Live results from the collector agent (AI + web search), shown below the curated opportunities.
 * Loads in the background and never blocks the rest of the page.
 */
export function LiveEvents({ companyId, companyName }: { companyId: string; companyName: string }) {
  const [result, setResult] = useState(cache[companyId] ?? null);
  const events = result?.events ?? null;
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cache[companyId]) { setResult(cache[companyId]!); return; }
    let active = true;
    setResult(null); setError(null);
    fetchEvents(companyId)
      .then(res => { cache[companyId] = res; if (active) setResult(res); })
      .catch((e: Error) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [companyId, attempt]);

  return <section className="live-section">
    <div className="live-head">
      <div>
        <h2 className="section-heading"><Search size={18}/>Found by the search agent</h2>
        <p className="card-help">An AI agent searched the web for upcoming opportunities that fit {companyName}'s profile. Each suggested page was then fetched and checked by code: suggestions whose title was not on the page were removed{result && result.dropped > 0 ? ` (${result.dropped} this time)` : ""}.</p>
      </div>
      <span className="ai-badge">Live AI search · checked against source</span>
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
        {e.verification && <p className="check-line" data-ok={e.verification !== "title_only"}>{e.verification === "title_only" ? <CircleAlert size={13}/> : <CheckCircle2 size={13}/>}{CHECK_LABEL[e.verification]}{e.checked_at && ` · checked ${e.checked_at}`}</p>}
        <h3 className="opp-title">{e.title}</h3>
        {e.description && <p className="opp-summary">{e.description}</p>}
        <div className="opp-meta">{e.date && <span><CalendarDays size={13}/>{e.date}</span>}{e.location && <span><MapPin size={13}/>{e.location}</span>}</div>
        <div className="opp-foot">{e.url ? <a className="link text-sm font-semibold" href={e.url} target="_blank" rel="noopener noreferrer">Check the source<ExternalLink size={13}/></a> : <span className="card-help">No source link – treat with caution.</span>}</div>
      </article>)}</div>}
  </section>;
}
