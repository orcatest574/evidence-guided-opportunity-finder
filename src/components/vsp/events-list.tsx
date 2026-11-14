import { useEffect, useRef, useState } from "react";
import type { EventItem, fetchEvents as _fetchEvents } from "@/api/events";
import { fetchEvents } from "@/api/events";

export function EventsList({ companyName, onLoadingChange, onResults }: { companyName: string; onLoadingChange?: (loading: boolean) => void; onResults?: (events: EventItem[] | null, error?: string | null) => void }) {
  const cache = useRef<Record<string, EventItem[] | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[] | null>(null);

  useEffect(() => {
    let mounted = true;
    setError(null);
    setEvents(null);
    onResults?.(null, null);
    if (!companyName) return;
    const cached = cache.current[companyName];
    if (cached) {
      setEvents(cached);
      onResults?.(cached, null);
      return;
    }
    setLoading(true);
    onLoadingChange?.(true);
    (async () => {
      try {
        const res = await fetchEvents(companyName);
        if (!mounted) return;
        cache.current[companyName] = res;
        setEvents(res);
        onResults?.(res, null);
      } catch (e: any) {
        if (!mounted) return;
        const msg = e?.message || "Failed to fetch events";
        setError(msg);
        onResults?.(null, msg);
      } finally {
        if (!mounted) return;
        setLoading(false);
        onLoadingChange?.(false);
      }
    })();
    return () => { mounted = false; };
  }, [companyName]);

  if (!companyName) return null;

  if (loading) {
    return <div>
      <header className="page-head">
        <h2 className="page-title">Events</h2>
        <p className="page-sub">Searching for events...</p>
      </header>
      <div className="opp-grid">
        {[0,1,2].map(i => <article key={i} className="opp-card" aria-busy="true"><div className="opp-top"><div className="skeleton" style={{width:120,height:14}}/></div><h3 className="opp-title">Searching for events...</h3><p className="opp-summary">&nbsp;</p></article>)}
      </div>
    </div>;
  }

  if (error) {
    return <div className="card">
      <div className="card-body">
        <p className="text-danger">Error searching for events: {error}</p>
        <div className="mt-3"><button className="btn" onClick={() => {
          // retry: clear cache for this company and re-run effect by bumping state
          delete cache.current[companyName];
          setError(null);
          setEvents(null);
          setLoading(true);
          onLoadingChange?.(true);
          (async () => {
            try {
              const res = await fetchEvents(companyName);
              cache.current[companyName] = res;
              setEvents(res);
            } catch (e: any) {
              setError(e?.message || "Failed to fetch events");
            } finally {
              setLoading(false);
              onLoadingChange?.(false);
            }
          })();
        }}>Try again</button></div>
      </div>
    </div>;
  }

  if (events && events.length === 0) {
    return <div className="card">
      <div className="card-body">No events found for {companyName}.</div>
    </div>;
  }

  return <div>
    <header className="page-head">
      <h2 className="page-title">Events</h2>
      <p className="page-sub">Events found for {companyName}</p>
    </header>
    <div className="opp-grid">
      {events?.map((e, i) => <article key={`${e.title}-${i}`} className="opp-card">
        <div className="opp-top" />
        <h3 className="opp-title"><strong>{e.title}</strong></h3>
        <p className="mt-1 text-sm text-ink-soft">{e.date ? <span>{e.date}</span> : null}{e.date && e.location ? <span> · </span> : null}{e.location ? <span>{e.location}</span> : null}</p>
        <p className="opp-summary">{e.description}</p>
        <div className="opp-foot">
          {e.url ? <a className="link text-sm font-semibold" href={e.url} target="_blank" rel="noopener noreferrer">Learn more</a> : null}
        </div>
      </article>)}
    </div>
  </div>;
}
