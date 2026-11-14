import { useMemo, useState } from "react";
import { ArrowRight, Building2, Globe2, Search, ShieldCheck, Sparkles, X } from "lucide-react";
import { companies, logoUrl, opportunities, relevantMembers } from "@/lib/science-park";
import { CompanyLogo, Kpi } from "./ui";

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
      <Kpi icon={Building2} tone="blue" value={companies.length} label="Members profiled"/>
      <Kpi icon={ShieldCheck} tone="green" value={companies.reduce((n, c) => n + c.claims.filter(x => x.type === "fact").length, 0)} label="Verified facts with quotes"/>
      <Kpi icon={Sparkles} tone="purple" value={opportunities.length} label={`Opportunities from ${sources} sources`}/>
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
        const topics = [...c.topics].sort((x, y) => y.weight - x.weight).slice(0, 3);
        return <button key={c.id} className="opp-card member-card" onClick={() => onOpen(c.id)}>
          <div className="member-cover">
            <img src={c.background ?? "/companies/BSP_background.png"} alt="" loading="lazy"/>
            <span className="member-cover-shade"/>
            <CompanyLogo src={logoUrl(c.id)} name={c.name} size={60}/>
          </div>
          <h3 className="member-name">{c.name}</h3>
          {c.website && <span className="member-site"><Globe2 size={13}/>{c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>}
          <p className="member-summary">{c.summary}</p>
          {topics.length > 0 && <div className="member-topics">{topics.map(t => <span key={t.topic}>{topicLabel(t.topic)}</span>)}</div>}
          <div className="member-figures">
            <div><strong>{facts}</strong><span>facts</span></div>
            <div><strong>{interests}</strong><span>interests</span></div>
            <div><strong>{relevant}</strong><span>matches</span></div>
          </div>
          <div className="member-foot"><span>Built {c.createdAt}</span><span className="member-open">Open profile<ArrowRight size={14}/></span></div>
        </button>;
      })}
    </div> : <div className="empty member-empty">No companies match “{query}”. <button className="link" onClick={() => setQuery("")}>Clear search</button></div>}
    <p className="fine-print">Currently showing {companies.length} profiled members. Add more by placing their profile JSON in src/data/companies/.</p>
  </div>;
}

const ACRONYMS = new Set(["hvdc", "emc", "ai", "5g", "6g", "ran", "lca", "epd", "hemp", "iot"]);
/** "open-ran" → "Open RAN", "offshore-wind" → "Offshore wind". */
function topicLabel(slug: string) {
  const words = slug.split(/[-_\s]+/).map(w => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.toLowerCase()));
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
