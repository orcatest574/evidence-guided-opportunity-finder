import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { THEMES, companies, logoUrl, suggestedConnections, themeClaims, type Connection } from "@/lib/science-park";
import { CompanyLogo } from "./ui";

/** Staff view: themes members share and possible connections between them. */
export function EcosystemView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const [tab, setTab] = useState<"themes" | "connections">("themes");
  const themes = THEMES.map(t => ({ name: t.name, members: companies.map(c => ({ company: c, n: themeClaims(c.claims, t).length })).filter(m => m.n > 0).sort((a, b) => b.n - a.n) }))
    .filter(t => t.members.length > 0)
    .sort((a, b) => b.members.length - a.members.length);
  const connections = suggestedConnections();

  return <div>
    <header className="page-head">
      <h1 className="page-title">Ecosystem</h1>
      <p className="page-sub">Shared interests and possible connections across members, based only on their public profiles.</p>
    </header>

    <nav className="section-tabs" aria-label="Ecosystem">
      <button data-active={tab === "themes"} onClick={() => setTab("themes")}>Shared themes<span className="tab-count">{themes.length}</span></button>
      <button data-active={tab === "connections"} onClick={() => setTab("connections")}>Suggested connections<span className="tab-count">{connections.length}</span></button>
    </nav>

    {tab === "themes" ? <div className="theme-grid">
      {themes.map(t => <article key={t.name} className="card theme-card">
        <div className="flex items-center justify-between"><h3 className="card-title">{t.name}</h3><span className="text-xs text-ink-soft">{t.members.length} of {companies.length} members</span></div>
        <ul className="theme-members">
          {t.members.map(m => <li key={m.company.id}>
            <button className="member-chip" onClick={() => onOpenCompany(m.company.id)}><CompanyLogo src={logoUrl(m.company.id)} name={m.company.name} size={22}/>{m.company.name}</button>
            <span className="theme-bar"><span style={{ width: `${Math.min(100, m.n * 8)}%` }}/></span>
            <span className="text-xs text-ink-soft">{m.n} {m.n === 1 ? "claim" : "claims"}</span>
          </li>)}
        </ul>
      </article>)}
    </div> : <div className="connection-grid">
      {connections.map(c => <ConnectionCard key={c.a.id + c.b.id} connection={c}/>)}
    </div>}
    <p className="fine-print">Suggestions are based on overlapping public claims. Neither company has expressed an interest in collaborating; Blue Science Park decides whether to make an introduction.</p>
  </div>;
}

function ConnectionCard({ connection: c }: { connection: Connection }) {
  const [open, setOpen] = useState(false);
  return <article className="card connection-card">
    <div className="connection-pair">
      <span className="member-chip"><CompanyLogo src={logoUrl(c.a.id)} name={c.a.name} size={28}/>{c.a.name}</span>
      <span className="pair-line"/>
      <span className="member-chip"><CompanyLogo src={logoUrl(c.b.id)} name={c.b.name} size={28}/>{c.b.name}</span>
    </div>
    <div className="chip-row">{c.themes.map(t => <span key={t.name} className="chip static">{t.name}</span>)}</div>
    <button className="link mt-3 text-sm" onClick={() => setOpen(!open)} aria-expanded={open}>Why this suggestion<ChevronDown size={14} className={open ? "rotate-180" : ""}/></button>
    {open && <div className="mt-3 space-y-4">{c.themes.slice(0, 3).map(t => <div key={t.name}>
      <p className="text-xs font-semibold">{t.name}</p>
      <p className="quote-line"><strong>{c.a.name}:</strong> {t.aClaims[0]!.value}</p>
      <p className="quote-line"><strong>{c.b.name}:</strong> {t.bClaims[0]!.value}</p>
    </div>)}</div>}
  </article>;
}
