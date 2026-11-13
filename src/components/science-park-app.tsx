import { useEffect, useMemo, useState } from "react";
import { CircleHelp, LogOut, MessageSquareText } from "lucide-react";
import { companies, effectiveClaims, rankOpportunities, type Claim, type Evidence, type Match } from "@/lib/science-park";
import { AskPanel } from "./vsp/ask-panel";
import { EcosystemView } from "./vsp/ecosystem-view";
import { OpportunitiesView, OpportunityDetail } from "./vsp/opportunities-view";
import { ProfileView } from "./vsp/profile-view";
import { SourcePanel } from "./vsp/source-panel";
import { Drawer } from "./vsp/ui";
import { useWorkspace } from "./vsp/use-workspace";

// Hardcoded demo login. Not real security: the check runs in the browser.
const DEMO_USER = "demo";
const DEMO_PASSWORD = "bluepark2026";
const AUTH_KEY = "vsp-auth";

type View = "profile" | "opportunities" | "ecosystem";

export function ScienceParkApp() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  useEffect(() => { try { setLoggedIn(localStorage.getItem(AUTH_KEY) === "true"); } catch { setLoggedIn(false); } }, []);
  if (loggedIn === null) return null;
  if (!loggedIn) return <LoginScreen onLogin={() => { localStorage.setItem(AUTH_KEY, "true"); setLoggedIn(true); }}/>;
  if (!companies.length) return <div className="p-10 text-sm">No company data found in src/data/companies/.</div>;
  return <Workspace onLogout={() => { localStorage.removeItem(AUTH_KEY); setLoggedIn(false); }}/>;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [user, setUser] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState("");
  return <div className="login">
    <div className="login-side">
      <img src="/Blue-Science-Park-white-horizontal.svg" alt="Blue Science Park" className="h-9 w-auto self-start"/>
      <div>
        <h1 className="display text-white">Virtual Science Park</h1>
        <p className="mt-4 max-w-md text-[17px] leading-7 text-white/75">Verified company profiles, matched with testing environments, funding and events – every claim traceable to its source.</p>
      </div>
      <p className="text-xs text-white/50">BUILD Hackathon 2026 · Prototype</p>
    </div>
    <form className="login-form" onSubmit={e => { e.preventDefault(); if (user === DEMO_USER && password === DEMO_PASSWORD) onLogin(); else setError("Wrong username or password."); }}>
      <h2 className="display-sm">Sign in</h2>
      <label className="field-label" htmlFor="login-user">Username</label>
      <input id="login-user" className="text-input" value={user} onChange={e => setUser(e.target.value)} autoComplete="username"/>
      <label className="field-label" htmlFor="login-password">Password</label>
      <input id="login-password" className="text-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"/>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <button className="btn primary mt-6 w-full justify-center" type="submit">Sign in</button>
      <p className="mt-4 text-xs text-ink-soft">Simulated login for the demo.</p>
    </form>
  </div>;
}

function Workspace({ onLogout }: { onLogout: () => void }) {
  const ws = useWorkspace();
  const [view, setView] = useState<View>("profile");
  const [companyId, setCompanyId] = useState(companies[0]!.id);
  const [source, setSource] = useState<{ claim: Claim; evidence: Evidence } | null>(null);
  const [detail, setDetail] = useState<Match | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const company = companies.find(c => c.id === companyId) ?? companies[0]!;
  const edits = ws.editsFor(company.id);
  const claims = useMemo(() => effectiveClaims(company, edits), [company, edits]);
  const matches = useMemo(() => rankOpportunities(claims, edits), [claims, edits]);
  const setEdits = (e: typeof edits) => ws.setEdits(company.id, e);

  const tabs: { id: View; label: string }[] = [{ id: "profile", label: "Profile" }, { id: "opportunities", label: "Opportunities" }, { id: "ecosystem", label: "Ecosystem" }];

  return <div className="app">
    <header className="topbar">
      <div className="topbar-inner">
        <img src="/Blue-Science-Park-white-horizontal.svg" alt="Blue Science Park" className="h-7 w-auto"/>
        <nav className="tabs" aria-label="Main">{tabs.map(t => <button key={t.id} data-active={view === t.id} onClick={() => setView(t.id)}>{t.label}</button>)}</nav>
        <div className="topbar-right">
          {view !== "ecosystem" && <label className="company-pick"><span className="sr-only">Company</span>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)}>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>}
          <button className="topbar-btn" onClick={() => setAskOpen(true)}><MessageSquareText size={16}/><span className="hidden sm:inline">Ask</span></button>
          <button className="topbar-icon" aria-label="About this prototype" onClick={() => setAboutOpen(true)}><CircleHelp size={18}/></button>
          <button className="topbar-icon" aria-label="Sign out" onClick={onLogout}><LogOut size={18}/></button>
        </div>
      </div>
    </header>

    <main className="page">
      {view === "profile" && <ProfileView company={company} edits={edits} setEdits={setEdits} onReset={() => ws.resetEdits(company.id)} onOpenSource={(claim, evidence) => setSource({ claim, evidence })}/>}
      {view === "opportunities" && <OpportunitiesView company={company} claims={claims} edits={edits} setEdits={setEdits} matches={matches}
        saved={ws.saved} toggleSaved={ws.toggleSaved} dismissed={ws.dismissed} restoreDismissed={ws.restoreDismissed} onOpen={setDetail}/>}
      {view === "ecosystem" && <EcosystemView onOpenCompany={id => { setCompanyId(id); setView("profile"); }}/>}
    </main>

    <footer className="footer">
      <span>Prototype · Profiles generated by the profiler agent from public pages and verified against them · Opportunities curated from public sources on 2026-11-13</span>
      <span>Simulated: login, browser-only storage, rule-based question box</span>
    </footer>

    <Drawer open={!!source} onClose={() => setSource(null)} title="Source evidence" wide>{source && <SourcePanel claim={source.claim} evidence={source.evidence}/>}</Drawer>
    <Drawer open={!!detail} onClose={() => setDetail(null)} title="Opportunity">{detail && <OpportunityDetail match={detail} company={company} claims={claims}
      saved={ws.saved.includes(detail.opportunity.id)} toggleSaved={() => ws.toggleSaved(detail.opportunity.id)} dismiss={() => { ws.dismiss(detail.opportunity.id); setDetail(null); }}/>}</Drawer>
    <Drawer open={askOpen} onClose={() => setAskOpen(false)} title={`Ask · ${company.name}`}><AskPanel company={company} matches={matches}/></Drawer>
    <Drawer open={aboutOpen} onClose={() => setAboutOpen(false)} title="About this prototype"><About/></Drawer>
  </div>;
}

function About() {
  return <div className="space-y-6 text-sm leading-6">
    <section><h3 className="panel-title">Agents and roles</h3>
      <ol className="pipeline-steps">
        <li><strong>Profiler</strong> fetches a member's public pages and lets an AI model extract facts with verbatim quotes, inferred interests and missing information.</li>
        <li><strong>Verifier</strong> (plain code) searches every quote in the fetched page text. Quotes that are not found are removed; facts without a verified quote become “Unverified”.</li>
        <li><strong>Matcher</strong> (plain code) ranks opportunities by profile keyword matches, the user's interests and priority, and explains every point of the score.</li>
        <li><strong>Boundary check</strong> (plain code) classifies each question before anything is answered.</li>
      </ol>
    </section>
    <section><h3 className="panel-title">Keeping profiles current</h3><p>The profiler re-runs on a schedule (weekly in production). It never overwrites a profile a user has edited; changes become proposals instead.</p></section>
    <section><h3 className="panel-title">Boundaries</h3><p>Web pages are treated as data, never as instructions. The service does not disclose other companies' non-public information, separates potential matches from eligibility, and refers decisions to Blue Science Park staff.</p></section>
    <section><h3 className="panel-title">Simulated in this prototype</h3><p>Login, browser-only storage of edits, the rule-based question box, and part of the opportunity details (marked “from search results”).</p></section>
  </div>;
}
