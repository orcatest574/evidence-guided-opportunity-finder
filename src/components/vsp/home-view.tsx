import { ArrowRight, Building2, ArrowUpRight, CalendarClock, Check, CheckCircle2, CircleAlert, ExternalLink, Lightbulb, Network, RefreshCw, Search, ShieldCheck, Sparkles } from "lucide-react";
import {
  TODAY, THEMES, companies, effectiveClaims, logoUrl, matchLevel, opportunities, relevantMembers, suggestedConnections, themeClaims,
  type Claim, type Company, type Edits, type Match, type Opportunity,
} from "@/lib/science-park";
import { useLiveEvents } from "./events-list";
import { MatchCard } from "./opportunities-view";
import { CompanyLogo, Cover, Kpi, type CoverTone } from "./ui";

const daysUntil = (date: string) => Math.round((Date.parse(date) - Date.parse(TODAY)) / 86_400_000);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Opportunities with a deadline from today on, soonest first. */
function upcomingDeadlines(): Opportunity[] {
  return opportunities.filter(o => o.deadline && daysUntil(o.deadline) >= 0).sort((a, b) => a.deadline!.localeCompare(b.deadline!));
}

function DateBlock({ date }: { date: string }) {
  const d = new Date(date);
  return <span className="date-block"><strong>{d.getUTCDate()}</strong><span>{MONTHS[d.getUTCMonth()]}</span></span>;
}

function HomeHero({ image, eyebrow, title, text, children }: { image: string; eyebrow: string; title: string; text: React.ReactNode; children?: React.ReactNode }) {
  return <section className="home-hero">
    <img className="profile-hero-img" src={image} alt="" width={1600} height={608}/>
    <div className="profile-hero-overlay"/>
    <div className="home-hero-content">
      <span className="hero-eyebrow">{eyebrow}</span>
      <h1 className="hero-title">{title}</h1>
      <p className="home-hero-text">{text}</p>
      {children && <div className="home-hero-actions">{children}</div>}
    </div>
  </section>;
}

function Panel({ icon: Icon, tone, title, action, children, wide }: { icon: typeof Sparkles; tone: CoverTone; title: string; action?: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  return <section className="opp-card home-panel" data-wide={wide}>
    <Cover tone={tone} icon={Icon} small/>
    <header className="home-panel-head"><h2 className="home-panel-title">{title}</h2>{action}</header>
    {children}
  </section>;
}

// =====================================================================
// Member overview
// =====================================================================

export function MemberHome({ company, edits, setEdits, matches, saved, toggleSaved, onNavigate, onOpenMatch }: {
  company: Company; edits: Edits; setEdits: (e: Edits) => void; matches: Match[]; saved: string[]; toggleSaved: (id: string) => void; onNavigate: (view: string) => void; onOpenMatch: (m: Match) => void;
}) {
  const claims = effectiveClaims(company, edits);
  const top = matches.filter(m => matchLevel(m.score) && m.opportunity.status !== "closed").slice(0, 3);
  const strong = matches.filter(m => matchLevel(m.score) === "Strong match").length;
  const deadlines = upcomingDeadlines().map(o => ({ o, m: matches.find(m => m.opportunity.id === o.id) })).slice(0, 4);
  const toReview = claims.filter(c => c.type === "inferred");
  const facts = claims.filter(c => c.type === "fact").length;
  const confirm = (c: Claim) => setEdits({ ...edits, confirmed: [...edits.confirmed, c.id] });

  return <div>
    <HomeHero image={company.background ?? "/companies/BSP_background.png"} eyebrow={`Overview · ${company.name}`} title={`Welcome back, ${company.name}`}
      text={<>{strong} strong {strong === 1 ? "match" : "matches"} for your profile, {deadlines.length} upcoming {deadlines.length === 1 ? "deadline" : "deadlines"} and {toReview.length} inferred {toReview.length === 1 ? "interest" : "interests"} waiting for your review.</>}>
      <button className="btn primary" onClick={() => onNavigate("opportunities")}>See all opportunities<ArrowRight size={15}/></button>
      <button className="btn hero-btn" onClick={() => onNavigate("profile")}>Open your profile</button>
    </HomeHero>

    <section className="home-section">
      <header className="home-section-head">
        <h2 className="section-heading"><Sparkles size={18}/>Best matches for you</h2>
        <button className="link text-sm font-semibold" onClick={() => onNavigate("opportunities")}>All {matches.length} opportunities<ArrowUpRight size={14}/></button>
      </header>
      <div className="opp-grid">
        {top.map(m => <MatchCard key={m.opportunity.id} match={m} saved={saved.includes(m.opportunity.id)} toggleSaved={() => toggleSaved(m.opportunity.id)} onOpen={() => onOpenMatch(m)}/>)}
        {!top.length && <div className="empty">No clear matches yet. Add your own interests on the profile to improve them.</div>}
      </div>
    </section>

    <div className="home-grid">
      <Panel icon={CalendarClock} tone="blue" title="Coming up">
        <ul className="home-list">
          {deadlines.map(({ o, m }) => <li key={o.id}>
            <DateBlock date={o.deadline!}/>
            <div className="min-w-0 flex-1">
              <button className="home-list-title" onClick={() => m && onOpenMatch(m)}>{o.title}</button>
              <span className="home-list-meta" data-soon={daysUntil(o.deadline!) <= 14}>{daysUntil(o.deadline!) === 0 ? "Closes today" : `${daysUntil(o.deadline!)} days left`} · {o.dates.find(d => d.value.includes(o.deadline!))?.label ?? "Deadline"}</span>
            </div>
          </li>)}
          {!deadlines.length && <li className="card-help">No deadlines coming up.</li>}
        </ul>
      </Panel>

      <Panel icon={Lightbulb} tone="amber" title="Is this right?" action={<button className="link text-sm" onClick={() => onNavigate("profile")}>Review all<ArrowUpRight size={14}/></button>}>
        <p className="card-help">The AI inferred these interests from your public pages. They are not facts until you confirm them. Confirmed interests count in the matching.</p>
        <ul className="home-review">
          {toReview.slice(0, 3).map(c => <li key={c.id}>
            <span className="claim-dot" data-type="inferred"/>
            <p>{c.value}</p>
            <button className="btn btn-sm" onClick={() => confirm(c)}><Check size={14}/>Confirm</button>
          </li>)}
          {!toReview.length && <li className="home-done"><CheckCircle2 size={16}/>All inferred interests reviewed.</li>}
        </ul>
      </Panel>

      <LivePreview companyId={company.id} onNavigate={onNavigate}/>

      <Panel icon={ShieldCheck} tone="green" title="Your profile">
        <div className="home-stats">
          <div><strong>{facts}</strong><span>verified facts, each with a quote from the source</span></div>
          <div><strong>{company.pagesFetched}</strong><span>public pages read by the profiling agent</span></div>
          <div><strong>{edits.confirmed.length + Object.keys(edits.edited ?? {}).length}</strong><span>confirmed or corrected by you</span></div>
          <div><strong>{company.missing.length}</strong><span>things we could not find</span></div>
        </div>
        <p className="card-help mt-3">Built {company.createdAt} from public sources. Your changes are kept in this browser only and are never shown to Blue Science Park staff.</p>
      </Panel>
    </div>
  </div>;
}

/** Two newest results from the search agent; uses the same session cache as the Opportunities page. */
function LivePreview({ companyId, onNavigate }: { companyId: string; onNavigate: (view: string) => void }) {
  const { events, error, retry } = useLiveEvents(companyId);
  return <Panel icon={Search} tone="gray" title="Found by the search agent" action={<span className="ai-badge">Live</span>}>
    {error ? <div><p className="card-help">{error}</p><button className="btn btn-sm mt-2" onClick={retry}><RefreshCw size={14}/>Try again</button></div>
    : !events ? <div className="space-y-3" aria-busy="true"><span className="skeleton w-3/4"/><span className="skeleton w-1/2"/><span className="skeleton w-2/3 mt-4"/><span className="skeleton w-1/3"/><p className="card-help">Searching the web…</p></div>
    : !events.length ? <p className="card-help">Nothing new found this time.</p>
    : <ul className="home-list">
        {events.slice(0, 3).map((e, i) => <li key={`${e.title}-${i}`}>
          <div className="min-w-0 flex-1">
            {e.url ? <a className="home-list-title" href={e.url} target="_blank" rel="noopener noreferrer">{e.title}<ExternalLink size={12}/></a> : <span className="home-list-title">{e.title}</span>}
            <span className="home-list-meta check-line" data-ok={e.verification !== "title_only"}>{e.verification === "title_only" ? <CircleAlert size={12}/> : <CheckCircle2 size={12}/>}{e.verification === "title_only" ? "Date not confirmed · title found on the page" : `${e.date ?? "Date not given"} · checked on the page`}</span>
          </div>
        </li>)}
      </ul>}
    {events && events.length > 0 && <button className="link mt-3 text-sm" onClick={() => onNavigate("opportunities")}>See all results<ArrowUpRight size={14}/></button>}
  </Panel>;
}

// =====================================================================
// Staff overview
// =====================================================================

export function StaffHome({ onNavigate, onOpenCompany, onOpenOpportunity }: { onNavigate: (view: string) => void; onOpenCompany: (id: string) => void; onOpenOpportunity: (o: Opportunity) => void }) {
  const facts = companies.reduce((n, c) => n + c.claims.filter(x => x.type === "fact").length, 0);
  const connections = suggestedConnections();
  const deadlines = upcomingDeadlines().slice(0, 4);
  const themes = THEMES.map(t => ({ name: t.name, members: companies.filter(c => themeClaims(c.claims, t).length > 0) }))
    .filter(t => t.members.length > 1).sort((a, b) => b.members.length - a.members.length).slice(0, 4);

  return <div>
    <HomeHero image="/companies/BSP_background.png" eyebrow="Overview · Blue Science Park" title="The ecosystem at a glance"
      text={<>{companies.length} member profiles built from public sources, matched against {opportunities.length} opportunities. Here is what needs attention.</>}>
      <button className="btn primary" onClick={() => onNavigate("members")}>Browse members<ArrowRight size={15}/></button>
      <button className="btn hero-btn" onClick={() => onNavigate("ecosystem")}>Open ecosystem</button>
    </HomeHero>

    <div className="kpi-row home-kpis">
      <Kpi icon={Building2} tone="blue" value={companies.length} label="Members profiled"/>
      <Kpi icon={ShieldCheck} tone="green" value={facts} label="Verified facts with quotes"/>
      <Kpi icon={Sparkles} tone="purple" value={opportunities.filter(o => o.status !== "closed").length} label="Open or upcoming opportunities"/>
      <Kpi icon={Network} tone="amber" value={connections.length} label="Suggested connections"/>
    </div>

    <div className="home-grid">
      <Panel icon={CalendarClock} tone="blue" title="Deadlines – who should know?" wide>
        <ul className="home-list">
          {deadlines.map(o => {
            const members = relevantMembers(o);
            return <li key={o.id}>
              <DateBlock date={o.deadline!}/>
              <div className="min-w-0 flex-1">
                <button className="home-list-title" onClick={() => onOpenOpportunity(o)}>{o.title}</button>
                <span className="home-list-meta" data-soon={daysUntil(o.deadline!) <= 14}>{daysUntil(o.deadline!)} days left · {o.organiser}</span>
              </div>
              <div className="home-chips">{members.length ? members.map(c => <button key={c.id} className="member-chip" title={c.name} onClick={() => onOpenCompany(c.id)}><CompanyLogo src={logoUrl(c.id)} name={c.name} size={24}/></button>) : <span className="card-help">No clear match</span>}</div>
            </li>;
          })}
        </ul>
      </Panel>

      <Panel icon={Network} tone="purple" title="Introductions to consider" action={<button className="link text-sm" onClick={() => onNavigate("ecosystem")}>All<ArrowUpRight size={14}/></button>}>
        <ul className="home-list">
          {connections.slice(0, 3).map(c => <li key={c.a.id + c.b.id}>
            <span className="home-pair"><CompanyLogo src={logoUrl(c.a.id)} name={c.a.name} size={28}/><CompanyLogo src={logoUrl(c.b.id)} name={c.b.name} size={28}/></span>
            <div className="min-w-0 flex-1">
              <span className="home-list-title static">{c.a.name} + {c.b.name}</span>
              <span className="home-list-meta">{c.themes.slice(0, 3).map(t => t.name).join(" · ")}</span>
            </div>
          </li>)}
        </ul>
      </Panel>

      <Panel icon={Sparkles} tone="navy" title="Shared themes">
        <ul className="home-list">
          {themes.map(t => <li key={t.name}>
            <div className="min-w-0 flex-1">
              <span className="home-list-title static">{t.name}</span>
              <span className="theme-bar mt-2"><span style={{ width: `${(t.members.length / companies.length) * 100}%` }}/></span>
            </div>
            <span className="home-list-meta">{t.members.length} of {companies.length}</span>
          </li>)}
        </ul>
      </Panel>

      <Panel icon={ShieldCheck} tone="green" title="Profile quality" wide>
        <div className="home-quality">
          {companies.map(c => {
            const unverified = c.claims.filter(x => x.type === "unverified").length;
            return <button key={c.id} className="home-quality-row" onClick={() => onOpenCompany(c.id)}>
              <CompanyLogo src={logoUrl(c.id)} name={c.name} size={32}/>
              <span className="font-semibold">{c.name}</span>
              <span><strong>{c.claims.filter(x => x.type === "fact").length}</strong> facts</span>
              <span><strong>{c.missing.length}</strong> missing</span>
              <span data-warn={unverified > 0}><strong>{unverified}</strong> unverified</span>
              <span className="text-ink-soft">built {c.createdAt}</span>
            </button>;
          })}
        </div>
        <p className="card-help mt-3">Missing and unverified items are where a conversation with the member would improve the profile most.</p>
      </Panel>
    </div>
  </div>;
}
