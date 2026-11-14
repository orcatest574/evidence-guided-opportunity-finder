import { useMemo, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { companies, logoUrl, opportunities, relevantMembers } from "@/lib/science-park";
import { CompanyLogo } from "./ui";

/** Staff start page: every profiled member as a card. Click a card to open the profile. */
export function MembersView({ onOpen }: { onOpen: (companyId: string) => void }) {
  const [query, setQuery] = useState("");
  const sources = new Set(opportunities.map(o => o.source)).size;
  const filteredCompanies = useMemo(() => {
    const tokenize = (value: string) => value
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? [];
    const searchTokens = tokenize(query);
    if (!searchTokens.length) return companies;
    return companies.filter(c => {
      const profileTokens = [
        c.name,
        c.id,
        c.website,
        c.summary,
        ...c.claims.map(claim => claim.value),
        ...c.topics.map(topic => topic.topic),
      ].flatMap(tokenize);
      return searchTokens.every(searchToken => profileTokens.some(profileToken => profileToken.startsWith(searchToken)));
    });
  }, [query]);

  return <div>
    <header className="page-head">
      <h1 className="page-title">Members</h1>
      <p className="page-sub">Baseline profiles built from public sources. Open a member to see the evidence behind each claim.</p>
    </header>

    <div className="kpi-row">
      <div className="kpi"><strong>{companies.length}</strong><span>Members profiled</span></div>
      <div className="kpi"><strong>{companies.reduce((n, c) => n + c.claims.filter(x => x.type === "fact").length, 0)}</strong><span>Verified facts</span></div>
      <div className="kpi"><strong>{opportunities.length}</strong><span>Opportunities from {sources} sources</span></div>
    </div>

    <div className="member-search-row">
      <label className="member-search">
        <Search size={18} aria-hidden="true"/>
        <input
          className="text-input"
          type="search"
          aria-label="Search member companies"
          placeholder="Search companies by name or expertise"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        {query && <button className="member-search-clear" type="button" aria-label="Clear company search" onClick={() => setQuery("")}><X size={16}/></button>}
      </label>
      <span className="member-results-count" role="status">{filteredCompanies.length} {filteredCompanies.length === 1 ? "company" : "companies"} found</span>
    </div>

    {filteredCompanies.length ? <div className="member-grid">
      {filteredCompanies.map(c => {
        const facts = c.claims.filter(x => x.type === "fact").length;
        const interests = c.claims.filter(x => x.type === "inferred").length;
        const relevant = opportunities.filter(o => relevantMembers(o).some(m => m.id === c.id)).length;
        return <button key={c.id} className="member-card" onClick={() => onOpen(c.id)}>
          <div className="member-card-head">
            <CompanyLogo src={logoUrl(c.id)} name={c.name} size={56}/>
            <ArrowUpRight size={18} className="text-ink-soft"/>
          </div>
          <h3 className="member-name">{c.name}</h3>
          <p className="member-summary">{c.summary}</p>
          <div className="member-stats">
            <span><strong>{facts}</strong> verified facts</span>
            <span><strong>{interests}</strong> interests</span>
            <span><strong>{relevant}</strong> relevant opportunities</span>
          </div>
          <span className="member-date">Profile built {c.createdAt}</span>
        </button>;
      })}
    </div> : <div className="empty member-empty">No companies match “{query}”. <button className="link" onClick={() => setQuery("")}>Clear search</button></div>}
    <p className="fine-print">Currently showing {companies.length} profiled members. Add more by placing their profile JSON in src/data/companies/.</p>
  </div>;
}
