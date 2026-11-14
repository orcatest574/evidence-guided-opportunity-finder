import { useState } from "react";
import { Bot, ChevronDown, FlaskConical, Leaf, Link2, Network, RadioTower, Ship, ShieldCheck, Sparkles, Wind, Zap } from "lucide-react";
import { THEMES, companies, logoUrl, suggestedConnections, themeClaims, type Connection } from "@/lib/science-park";
import { CompanyLogo, Cover, PillRail, type CoverTone } from "./ui";

const THEME_LOOK: Record<string, { icon: typeof Wind; tone: CoverTone }> = {
  "Offshore & wind energy": { icon: Wind, tone: "blue" },
  "Power grids & cables": { icon: Zap, tone: "amber" },
  "Marine & naval": { icon: Ship, tone: "navy" },
  "Materials & testing": { icon: FlaskConical, tone: "purple" },
  "Connectivity 5G/6G": { icon: RadioTower, tone: "blue" },
  "AI & automation": { icon: Bot, tone: "purple" },
  "Security & resilience": { icon: ShieldCheck, tone: "red" },
  "Sustainability": { icon: Leaf, tone: "green" },
};

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

    <PillRail label="Ecosystem" value={tab} onChange={setTab} items={[
      { key: "themes", label: "Shared themes", icon: Sparkles, count: themes.length },
      { key: "connections", label: "Suggested connections", icon: Network, count: connections.length },
    ]}/>

    {tab === "themes" ? <div className="theme-grid">
      {themes.map(t => <article key={t.name} className="opp-card theme-card">
        <Cover tone={THEME_LOOK[t.name]?.tone ?? "gray"} icon={THEME_LOOK[t.name]?.icon ?? Sparkles} small/>
        <div className="flex items-center justify-between gap-3"><h3 className="opp-title mt-0">{t.name}</h3><span className="theme-share">{t.members.length} of {companies.length} members</span></div>
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
  return <article className="opp-card connection-card">
    <div className="opp-cover connection-cover" data-tone="purple" data-small="true" aria-hidden="true">
      <Network className="opp-cover-icon" size={96} strokeWidth={1.2}/>
      <span className="opp-cover-logo"><img src={logoUrl(c.a.id)} alt=""/></span>
      <span className="connection-link"><Link2 size={16}/></span>
      <span className="opp-cover-logo"><img src={logoUrl(c.b.id)} alt=""/></span>
    </div>
    <h3 className="opp-title mt-0">{c.a.name} <span className="text-ink-soft">+</span> {c.b.name}</h3>
    <p className="opp-summary">{c.themes.length} shared {c.themes.length === 1 ? "theme" : "themes"} in their public profiles.</p>
    <div className="chip-row">{c.themes.map(t => <span key={t.name} className="chip static">{t.name}</span>)}</div>
    <button className="link mt-3 text-sm" onClick={() => setOpen(!open)} aria-expanded={open}>Why this suggestion<ChevronDown size={14} className={open ? "rotate-180" : ""}/></button>
    {open && <div className="mt-3 space-y-4">{c.themes.slice(0, 3).map(t => <div key={t.name}>
      <p className="text-xs font-semibold">{t.name}</p>
      <p className="quote-line"><strong>{c.a.name}:</strong> {t.aClaims[0]!.value}</p>
      <p className="quote-line"><strong>{c.b.name}:</strong> {t.bClaims[0]!.value}</p>
    </div>)}</div>}
  </article>;
}
