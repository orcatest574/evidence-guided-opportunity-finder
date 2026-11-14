import { useState } from "react";
import { ArrowUpRight, Bookmark, Building2, CalendarDays, ExternalLink, Globe2, Sparkles, ThumbsDown } from "lucide-react";
import { logoUrl, matchLevel, opportunities, relevantMembers, statusLabel, type Claim, type Company, type Match, type Opportunity, type OpportunityType } from "@/lib/science-park";
import { CompanyLogo, TypeTag } from "./ui";

const FILTERS: ("All" | OpportunityType)[] = ["All", "Testing", "Funding", "Event"];
const filterLabel = (f: "All" | OpportunityType) => (f === "All" ? "All opportunities" : f === "Event" ? "Events" : f);

function Filters({ value, onChange, counts }: { value: "All" | OpportunityType; onChange: (f: "All" | OpportunityType) => void; counts: Record<string, number> }) {
  return <div className="filter-bar">{FILTERS.map(f => <button key={f} className="filter-btn" data-active={value === f} onClick={() => onChange(f)}>{filterLabel(f)}<span className="tab-count">{counts[f] ?? 0}</span></button>)}</div>;
}

function Meta({ o }: { o: Opportunity }) {
  return <div className="opp-meta"><span><Globe2 size={13}/>{o.source}</span><span><CalendarDays size={13}/>{o.dates[0]?.value}</span><span><Building2 size={13}/>{o.location}</span></div>;
}

/** Member view: opportunities ranked for the signed-in company. */
export function MemberOpportunities({ company, matches, saved, toggleSaved, dismissed, savedOnly, onOpen }: {
  company: Company; matches: Match[]; saved: string[]; toggleSaved: (id: string) => void; dismissed: string[]; savedOnly: boolean; onOpen: (m: Match) => void;
}) {
  const [filter, setFilter] = useState<"All" | OpportunityType>("All");
  const base = matches.filter(m => !dismissed.includes(m.opportunity.id) && (!savedOnly || saved.includes(m.opportunity.id)));
  const counts = Object.fromEntries(FILTERS.map(f => [f, base.filter(m => f === "All" || m.opportunity.type === f).length]));

  const list = base.filter(m => filter === "All" || m.opportunity.type === filter);

  return <div>
    <header className="page-head">
      <h1 className="page-title">{savedOnly ? "Saved opportunities" : `Opportunities for ${company.name}`}</h1>
      <p className="page-sub">{savedOnly ? "Your shortlist." : `Testing environments, funding and events from public sources – most relevant to ${company.name}'s profile first.`}</p>
    </header>
    <Filters value={filter} onChange={setFilter} counts={counts}/>
    <div className="opp-grid">
      {list.map(m => {
        const o = m.opportunity, level = matchLevel(m.score);
        const reasons = m.keywordHits.slice(0, 3).map(h => h.keyword);
        return <article key={o.id} className="opp-card" data-closed={o.status === "closed"}>
          <div className="opp-top">
            <div className="flex flex-wrap items-center gap-2"><TypeTag type={o.type}/><span className="status" data-status={o.status}>{statusLabel(o)}</span></div>
            <button className="icon-btn" aria-label={saved.includes(o.id) ? `Unsave ${o.title}` : `Save ${o.title}`} onClick={() => toggleSaved(o.id)}><Bookmark size={17} className={saved.includes(o.id) ? "fill-current text-brand" : ""}/></button>
          </div>
          <h3 className="opp-title">{o.title}</h3>
          <p className="opp-summary">{o.summary}</p>
          <Meta o={o}/>
          <div className="opp-foot">
            <div className="reason">
              {level && <span className="match-badge" data-level={level}>{level}</span>}
              <span>{reasons.length ? <>Your profile mentions <strong>{reasons.join(", ")}</strong>{m.interestHits.length > 0 && <> and your interest <strong>{m.interestHits.join(", ")}</strong></>}</> : m.interestHits.length ? <>Matches your interest <strong>{m.interestHits.join(", ")}</strong></> : "A broader opportunity to explore"}</span>
            </div>
            <button className="link text-sm font-semibold" onClick={() => onOpen(m)}>View details<ArrowUpRight size={14}/></button>
          </div>
        </article>;
      })}

      {!list.length && <div className="empty">{savedOnly ? "Save an opportunity to see it here." : "No opportunities in this category."}</div>}
    </div>
  </div>;
}

/** Staff view: every opportunity, with the members it is relevant to. */
export function StaffOpportunities({ onOpen }: { onOpen: (o: Opportunity) => void }) {
  const [filter, setFilter] = useState<"All" | OpportunityType>("All");
  const rows = opportunities.map(o => ({ o, members: relevantMembers(o) })).sort((a, b) => b.members.length - a.members.length);
  const counts = Object.fromEntries(FILTERS.map(f => [f, rows.filter(r => f === "All" || r.o.type === f).length]));
  return <div>
    <header className="page-head">
      <h1 className="page-title">Opportunities</h1>
      <p className="page-sub">{opportunities.length} opportunities from {new Set(opportunities.map(o => o.source)).size} public sources, with the members each one is relevant to.</p>
    </header>
    <Filters value={filter} onChange={setFilter} counts={counts}/>
    <div className="opp-grid">
      {rows.filter(r => filter === "All" || r.o.type === filter).map(({ o, members }) => <article key={o.id} className="opp-card" data-closed={o.status === "closed"}>
        <div className="opp-top"><div className="flex flex-wrap items-center gap-2"><TypeTag type={o.type}/><span className="status" data-status={o.status}>{statusLabel(o)}</span></div></div>
        <h3 className="opp-title">{o.title}</h3>
        <p className="opp-summary">{o.summary}</p>
        <Meta o={o}/>
        <div className="opp-foot">
          <div className="reason">{members.length ? <><span className="text-ink-soft">Relevant for</span>{members.map(c => <span key={c.id} className="member-chip"><CompanyLogo src={logoUrl(c.id)} name={c.name} size={20}/>{c.name}</span>)}</> : <span className="text-ink-soft">No clear member match yet</span>}</div>
          <button className="link text-sm font-semibold" onClick={() => onOpen(o)}>View details<ArrowUpRight size={14}/></button>
        </div>
      </article>)}
    </div>
  </div>;
}

/** Detail drawer. With a match (member view) it explains the relevance; without one (staff view) it lists relevant members. */
export function OpportunityDetail({ opportunity: o, match, company, claims, saved, toggleSaved, dismiss }: {
  opportunity: Opportunity; match?: Match | undefined; company?: Company | undefined; claims?: Claim[] | undefined;
  saved?: boolean | undefined; toggleSaved?: (() => void) | undefined; dismiss?: (() => void) | undefined;
}) {
  const hitClaims = match && claims ? [...new Set(match.keywordHits.flatMap(h => h.claimIds))].map(id => claims.find(c => c.id === id)).filter(Boolean) as Claim[] : [];
  const level = match ? matchLevel(match.score) : null;
  const members = match ? [] : relevantMembers(o);
  return <div className="space-y-6">
    <div>
      <div className="flex flex-wrap items-center gap-2"><TypeTag type={o.type}/><span className="status" data-status={o.status}>{statusLabel(o)}</span></div>
      <h2 className="drawer-title">{o.title}</h2>
      <p className="mt-1 text-sm text-ink-soft">{o.organiser}</p>
      <p className="mt-4 text-[15px] leading-6">{o.summary}</p>
    </div>

    <dl className="facts-table">
      <div><dt>Who it's for</dt><dd>{o.audience}</dd></div>
      <div><dt>Format</dt><dd>{o.format}</dd></div>
      <div><dt>Where</dt><dd>{o.location}</dd></div>
      {o.dates.map(d => <div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}
    </dl>

    {match && company && <section className="why-box">
      <h3 className="card-title flex items-center gap-2"><Sparkles size={15} className="text-brand"/>Why this may matter to {company.name}</h3>
      {level && <span className="match-badge mt-2" data-level={level}>{level}</span>}
      <ul className="bullets mt-2">
        {match.keywordHits.length > 0 && <li>Your profile mentions <strong>{match.keywordHits.map(h => h.keyword).join(", ")}</strong>.</li>}
        {match.interestHits.length > 0 && <li>It fits the interest you added: <strong>{match.interestHits.join(", ")}</strong>.</li>}
        {match.closedPenalty && <li>The call is closed – useful to prepare for the next round.</li>}
        {!match.keywordHits.length && !match.interestHits.length && <li>No direct link to your profile – shown as a broader opportunity.</li>}
      </ul>
      {hitClaims.length > 0 && <div className="mt-3 space-y-1">{hitClaims.slice(0, 4).map(c => <p key={c.id} className="quote-line">“{c.value}”</p>)}</div>}
      <p className="mt-3 text-xs font-semibold">A potential match on topic – not confirmed eligibility.</p>
    </section>}

    {!match && <section className="why-box">
      <h3 className="card-title">Relevant members</h3>
      {members.length ? <div className="chip-row">{members.map(c => <span key={c.id} className="member-chip"><CompanyLogo src={logoUrl(c.id)} name={c.name} size={20}/>{c.name}</span>)}</div> : <p className="card-help">No clear member match yet.</p>}
    </section>}

    <section><h3 className="card-title">Key requirements</h3><ul className="bullets mt-2">{o.eligibility.map(e => <li key={e}>{e}</li>)}</ul></section>
    <section><h3 className="card-title">Possible next step</h3><p className="mt-2 text-sm leading-6">{o.nextStep}</p></section>
    <section><h3 className="card-title">Uncertainties</h3><p className="mt-2 text-sm leading-6">{o.caveat}</p></section>

    <section className="source-card">
      <a className="link text-sm font-semibold" href={o.url} target="_blank" rel="noreferrer">Open the {o.source} source<ExternalLink size={13}/></a>
      <p className="mt-1 text-xs text-ink-soft">Retrieved {o.retrievedAt} · {o.verification === "page-checked" ? "details checked on the source page" : "details from search results – confirm on the source"}</p>
    </section>

    {toggleSaved && <div className="flex flex-wrap gap-2">
      <button className="btn primary" onClick={toggleSaved}><Bookmark size={15}/>{saved ? "Saved" : "Save"}</button>
      {dismiss && <button className="btn" onClick={dismiss}><ThumbsDown size={15}/>Not relevant</button>}
    </div>}
    <p className="fine-print">Information and suggested next steps only – not professional advice, an eligibility decision or a commitment by Blue Science Park.</p>
  </div>;
}
