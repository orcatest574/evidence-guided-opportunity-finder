import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Bookmark, CalendarDays, ExternalLink, MapPin, ThumbsDown } from "lucide-react";
import { statusLabel, type Claim, type Company, type Edits, type Match, type OpportunityType } from "@/lib/science-park";
import { FOCUS_OPTIONS } from "./profile-view";
import { Segmented, TypeTag } from "./ui";

type Props = {
  company: Company; claims: Claim[]; edits: Edits; setEdits: (e: Edits) => void; matches: Match[];
  saved: string[]; toggleSaved: (id: string) => void; dismissed: string[]; restoreDismissed: () => void;
  onOpen: (m: Match) => void;
};

/** Animates cards to their new position when the ranking changes (FLIP technique). */
function useFlip(keys: string[]) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const last = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    nodes.current.forEach((el, key) => {
      const before = last.current.get(key);
      const after = el.getBoundingClientRect();
      if (before && Math.abs(before.top - after.top) > 1) {
        el.animate([{ transform: `translateY(${before.top - after.top}px)` }, { transform: "none" }], { duration: 450, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
      last.current.set(key, after);
    });
  }, [keys.join("|")]);
  return (key: string) => (el: HTMLElement | null) => { if (el) nodes.current.set(key, el); else nodes.current.delete(key); };
}

export function OpportunitiesView({ company, claims, edits, setEdits, matches, saved, toggleSaved, dismissed, restoreDismissed, onOpen }: Props) {
  const [type, setType] = useState<"All" | OpportunityType>("All");
  const [savedOnly, setSavedOnly] = useState(false);
  const list = matches.filter(m => !dismissed.includes(m.opportunity.id) && (type === "All" || m.opportunity.type === type) && (!savedOnly || saved.includes(m.opportunity.id)));
  const flip = useFlip(list.map(m => m.opportunity.id));

  // Rank movement since the previous ranking (shown as ↑/↓ after a refinement).
  const prevRanks = useRef<Map<string, number>>(new Map());
  const prevKey = useRef("");
  const [moves, setMoves] = useState<Map<string, number>>(new Map());
  const rankKey = matches.map(m => m.opportunity.id).join("|");
  useLayoutEffect(() => {
    const now = new Map(matches.map((m, i) => [m.opportunity.id, i]));
    if (prevKey.current && prevKey.current !== rankKey) {
      const delta = new Map<string, number>();
      now.forEach((i, id) => { const before = prevRanks.current.get(id); if (before !== undefined && before !== i) delta.set(id, before - i); });
      setMoves(delta);
    }
    prevRanks.current = now; prevKey.current = rankKey;
  }, [rankKey]);
  useLayoutEffect(() => { setMoves(new Map()); }, [company.id]);

  const claimText = (id: string) => claims.find(c => c.id === id)?.value ?? id;

  return <div>
    <header className="page-head">
      <div>
        <div className="eyebrow">Ranked for {company.name}</div>
        <h1 className="display">Opportunities</h1>
        <p className="lede">Testing environments, funding and events from {new Set(matches.map(m => m.opportunity.source)).size} public sources, ranked against {company.name}'s verified profile.</p>
      </div>
    </header>

    <div className="toolbar">
      <div><span className="toolbar-label">Your priority</span><Segmented label="Your priority" value={edits.focus} options={FOCUS_OPTIONS} onChange={focus => setEdits({ ...edits, focus })}/></div>
      <div><span className="toolbar-label">Show</span><Segmented label="Type" value={type} options={[{ value: "All", label: "All" }, { value: "Testing", label: "Testing" }, { value: "Funding", label: "Funding" }, { value: "Event", label: "Events" }]} onChange={setType}/></div>
      <label className="check"><input type="checkbox" checked={savedOnly} onChange={e => setSavedOnly(e.target.checked)}/>Saved only ({saved.length})</label>
      {dismissed.length > 0 && <button className="link text-xs" onClick={restoreDismissed}>Show {dismissed.length} hidden</button>}
    </div>

    <ol className="opp-list">
      {list.map(m => {
        const o = m.opportunity;
        const move = moves.get(o.id);
        const why = m.keywordHits.slice(0, 3);
        return <li key={o.id} ref={flip(o.id)} className="opp-card" data-closed={o.status === "closed"}>
          <div className="opp-score" title="Heuristic relevance score, not a probability">
            <span className="score-num">{m.score}</span>
            <span className="score-bar"><span style={{ width: `${m.score}%` }}/></span>
            {move ? <span className="rank-move" data-up={move > 0}>{move > 0 ? <ArrowUp size={11}/> : <ArrowDown size={11}/>}{Math.abs(move)}</span> : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="opp-tags"><TypeTag type={o.type}/><span className="status" data-status={o.status}>{statusLabel(o)}</span><span className="text-ink-soft">{o.source}</span></div>
            <button className="opp-title" onClick={() => onOpen(m)}>{o.title}</button>
            <div className="opp-meta"><span><CalendarDays size={13}/>{o.dates[0]?.value}</span><span><MapPin size={13}/>{o.location}</span></div>
            <p className="opp-why">
              {why.length ? <>Matches <strong>{why.map(h => h.keyword).join(", ")}</strong> in your profile (<span title={why.flatMap(h => h.claimIds).map(claimText).join("\n")}>{[...new Set(why.flatMap(h => h.claimIds))].slice(0, 3).join(", ")}</span>)</> : "No direct match with your profile"}
              {m.interestHits.length > 0 && <> · your interest <strong>{m.interestHits.join(", ")}</strong></>}
              {m.focusBonus && <> · fits your <strong>{edits.focus.toLowerCase()}</strong> priority</>}
            </p>
          </div>
          <div className="opp-actions">
            <button className="icon-btn" aria-label={saved.includes(o.id) ? "Unsave" : "Save"} onClick={() => toggleSaved(o.id)}><Bookmark size={17} className={saved.includes(o.id) ? "fill-current text-brand" : ""}/></button>
          </div>
        </li>;
      })}
      {!list.length && <li className="empty">Nothing here. Try another filter.</li>}
    </ol>
    <p className="fine-print">Scores are a transparent heuristic: profile keyword matches, your interests and your priority. Closed calls are kept visible but ranked lower so you can prepare for the next round.</p>
  </div>;
}

export function OpportunityDetail({ match, company, claims, saved, toggleSaved, dismiss }: { match: Match; company: Company; claims: Claim[]; saved: boolean; toggleSaved: () => void; dismiss: () => void }) {
  const o = match.opportunity;
  const hitClaims = [...new Set(match.keywordHits.flatMap(h => h.claimIds))].map(id => claims.find(c => c.id === id)).filter(Boolean) as Claim[];
  return <div className="space-y-6">
    <div>
      <div className="opp-tags"><TypeTag type={o.type}/><span className="status" data-status={o.status}>{statusLabel(o)}</span></div>
      <h2 className="display-sm mt-3">{o.title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{o.organiser}</p>
      <p className="mt-4 text-[15px] leading-6">{o.summary}</p>
    </div>

    <dl className="facts-table">
      <div><dt>For</dt><dd>{o.audience}</dd></div>
      <div><dt>Format</dt><dd>{o.format}</dd></div>
      <div><dt>Where</dt><dd>{o.location}</dd></div>
      {o.dates.map(d => <div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}
    </dl>

    <section className="why-box">
      <h3 className="panel-title">Why this may matter to {company.name}</h3>
      <ul className="score-parts">
        <li><span>Base</span><span>10</span></li>
        <li><span>Profile matches: {match.keywordHits.map(h => h.keyword).join(", ") || "none"}</span><span>+{Math.min(4, match.keywordHits.length) * 15}</span></li>
        {match.interestHits.length > 0 && <li><span>Your interests: {match.interestHits.join(", ")}</span><span>+{Math.min(2, match.interestHits.length) * 15}</span></li>}
        {match.focusBonus && <li><span>Fits your current priority</span><span>+25</span></li>}
        {match.closedPenalty && <li><span>Call is closed</span><span>−20</span></li>}
        <li className="total"><span>Relevance</span><span>{match.score}</span></li>
      </ul>
      {hitClaims.length > 0 && <div className="mt-3 space-y-1">{hitClaims.slice(0, 4).map(c => <p key={c.id} className="text-xs"><span className="ref">{c.id}</span> {c.value}</p>)}</div>}
      <p className="mt-3 text-xs font-medium">A potential match on topic – not confirmed eligibility.</p>
    </section>

    <section><h3 className="panel-title">Key requirements</h3><ul className="note-list">{o.eligibility.map(e => <li key={e}>{e}</li>)}</ul></section>
    <section><h3 className="panel-title">Possible next step</h3><p className="text-sm leading-6">{o.nextStep}</p></section>
    <section><h3 className="panel-title">Uncertainties</h3><p className="text-sm leading-6">{o.caveat}</p></section>

    <section className="source-card">
      <a className="link text-sm font-semibold" href={o.url} target="_blank" rel="noreferrer">Open the {o.source} source<ExternalLink size={13}/></a>
      <p className="mt-1 text-xs text-ink-soft">Retrieved {o.retrievedAt} · {o.verification === "page-checked" ? "details checked on the source page" : "details from search results – confirm on the source"}</p>
    </section>

    <div className="flex flex-wrap gap-2">
      <button className="btn primary" onClick={toggleSaved}><Bookmark size={15}/>{saved ? "Saved" : "Save"}</button>
      <button className="btn" onClick={dismiss}><ThumbsDown size={15}/>Not relevant</button>
    </div>
    <p className="fine-print">Information and suggested next steps only – not professional advice, an eligibility decision or a commitment by Blue Science Park.</p>
  </div>;
}
