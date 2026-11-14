import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Bookmark, Building2, CircleHelp, LogOut, Menu, MessageSquareText, Network, Sparkles, Users } from "lucide-react";
import { companies, effectiveClaims, emptyEdits, logoUrl, rankOpportunities, type Claim, type Evidence, type Match, type Opportunity } from "@/lib/science-park";
import { EcosystemView } from "./vsp/ecosystem-view";
import { MembersView } from "./vsp/members-view";
import { MemberOpportunities, OpportunityDetail, StaffOpportunities } from "./vsp/opportunities-view";
import { LiveEvents } from "./vsp/events-list";
import { ProfileView } from "./vsp/profile-view";
import { SourcePanel } from "./vsp/source-panel";
import { CompanyLogo, Drawer, ErrorBoundary } from "./vsp/ui";
import AssistantChat from "./vsp/assistant-chat";
import { useWorkspace } from "./vsp/use-workspace";

// ---- Hardcoded demo accounts. Not real security: the check runs in the browser. ----
type Session = { role: "member"; companyId: string } | { role: "staff" };
const PASSWORD = "bluepark2026";
const ACCOUNTS: Record<string, Session> = {
  staff: { role: "staff" },
  ...Object.fromEntries(companies.map(c => [c.id, { role: "member", companyId: c.id } as Session])),
};
const SESSION_KEY = "vsp-session";

export function ScienceParkApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    try { const raw = localStorage.getItem(SESSION_KEY); setSession(raw ? (JSON.parse(raw) as Session) : null); } catch { setSession(null); }
  }, []);
  const signIn = (s: Session) => { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); setSession(s); };
  const signOut = () => { localStorage.removeItem(SESSION_KEY); setSession(null); };

  if (session === undefined) return null;
  if (!session) return <LoginScreen onLogin={signIn}/>;
  if (!companies.length) return <div className="p-10 text-sm">No company data found in src/data/companies/.</div>;
  return session.role === "staff" ? <StaffApp onLogout={signOut}/> : <MemberApp companyId={session.companyId} onLogout={signOut}/>;
}

function LoginScreen({ onLogin }: { onLogin: (s: Session) => void }) {
  const [user, setUser] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState("");
  return <div className="login">
    <div className="login-side">
      <img src="/Blue-Science-Park-white-horizontal.svg" alt="Blue Science Park" className="h-9 w-auto self-start"/>
      <div>
        <h1 className="login-title">Virtual Science Park</h1>
        <p className="mt-4 max-w-md text-[17px] leading-7 text-white/80">Verified company profiles, matched with testing environments, funding and events – every claim traceable to its source.</p>
      </div>
      <p className="text-xs text-white/50">BUILD Hackathon 2026 · Prototype</p>
    </div>
    <form className="login-form" onSubmit={e => { e.preventDefault(); const s = ACCOUNTS[user.trim().toLowerCase()]; if (s && password === PASSWORD) onLogin(s); else setError("Wrong username or password."); }}>
      <h2 className="page-title">Sign in</h2>
      <label className="field-label" htmlFor="login-user">Username</label>
      <input id="login-user" className="text-input" value={user} onChange={e => setUser(e.target.value)} autoComplete="username"/>
      <label className="field-label" htmlFor="login-password">Password</label>
      <input id="login-password" className="text-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"/>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <button className="btn primary mt-6 w-full justify-center" type="submit">Sign in</button>
      <div className="demo-accounts">
        <p className="font-semibold">Demo accounts (password {PASSWORD})</p>
        <p><code>staff</code> – Blue Science Park staff</p>
        <p>{companies.map((c, i) => <span key={c.id}>{i > 0 && ", "}<code>{c.id}</code></span>)} – member companies</p>
      </div>
    </form>
  </div>;
}

// ---- Shared layout ----
type NavItem = { id: string; label: string; icon: ComponentType<{ size?: number }>; count?: number };

function Shell({ nav, active, onNavigate, who, onLogout, onAsk, children }: {
  nav: NavItem[]; active: string; onNavigate: (id: string) => void; who: { name: string; role: string; logo?: string }; onLogout: () => void; onAsk?: () => void; children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const go = (id: string) => { onNavigate(id); setMenuOpen(false); window.scrollTo(0, 0); };
  return <div className="shell">
    {menuOpen && <div className="sidebar-scrim" onClick={() => setMenuOpen(false)}/>}
    <aside className="sidebar" data-open={menuOpen}>
      <img src="/Blue-Science-Park-white-horizontal.svg" alt="Blue Science Park" className="sidebar-logo"/>
      <p className="nav-label">Virtual Science Park</p>
      <nav aria-label="Main">{nav.map(n => <button key={n.id} className="nav-item" data-active={active === n.id} onClick={() => go(n.id)}><n.icon size={18}/>{n.label}{!!n.count && <span className="nav-count">{n.count}</span>}</button>)}</nav>
      {onAsk && <><p className="nav-label">Get help</p><button className="nav-item" onClick={() => { onAsk(); setMenuOpen(false); }}><MessageSquareText size={18}/>Innovation assistant</button></>}
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={() => setAboutOpen(true)}><CircleHelp size={18}/>About this prototype</button>
        <a className="nav-item" href="https://www.bluesciencepark.se/" target="_blank" rel="noreferrer"><Network size={18}/>bluesciencepark.se</a>
      </div>
    </aside>
    <div className="main">
      <header className="topbar">
        <button className="icon-btn mobile-only" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={20}/></button>
        <div className="who">
          {who.logo ? <CompanyLogo src={who.logo} name={who.name} size={32}/> : <span className="who-badge">BSP</span>}
          <div><div className="who-name">{who.name}</div><div className="who-role">{who.role}</div></div>
        </div>
        <button className="btn ml-auto" onClick={onLogout}><LogOut size={15}/>Sign out</button>
      </header>
      <main className="page">{children}</main>
      <footer className="footer">
        <span>Prototype · Profiles and opportunities are JSON snapshots from public sources, retrieved 2026-11-13</span>
        <span>Simulated: login, browser-only storage · AI: assistant and live search via the backend</span>
      </footer>
    </div>
    <Drawer open={aboutOpen} onClose={() => setAboutOpen(false)} title="About this prototype"><About/></Drawer>
  </div>;
}

// ---- Member: sees only their own company ----
function MemberApp({ companyId, onLogout }: { companyId: string; onLogout: () => void }) {
  const ws = useWorkspace();
  const [view, setView] = useState("profile");
  const [source, setSource] = useState<{ claim: Claim; evidence: Evidence } | null>(null);
  const [detail, setDetail] = useState<Match | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const company = companies.find(c => c.id === companyId) ?? companies[0]!;
  const edits = ws.editsFor(company.id);
  const claims = useMemo(() => effectiveClaims(company, edits), [company, edits]);
  const matches = useMemo(() => rankOpportunities(claims, edits), [claims, edits]);

  const nav: NavItem[] = [
    { id: "profile", label: "Company profile", icon: Building2 },
    { id: "opportunities", label: "Opportunities", icon: Sparkles },
    { id: "saved", label: "Saved", icon: Bookmark, count: ws.saved.length },
  ];
  return <Shell nav={nav} active={view} onNavigate={setView} who={{ name: company.name, role: "Member company", logo: logoUrl(company.id) }} onLogout={onLogout} onAsk={() => setAskOpen(true)}>
    {view === "profile" && <ProfileView company={company} edits={edits} setEdits={e => ws.setEdits(company.id, e)} onOpenSource={(claim, evidence) => setSource({ claim, evidence })}/>}
    {(view === "opportunities" || view === "saved") && <MemberOpportunities key={view} company={company} matches={matches} saved={ws.saved} toggleSaved={ws.toggleSaved} dismissed={ws.dismissed} savedOnly={view === "saved"} onOpen={setDetail}/>}
    {view === "opportunities" && <LiveEvents companyId={company.id} companyName={company.name}/>}
    <Drawer open={!!source} onClose={() => setSource(null)} title="Source evidence" wide>{source && <SourcePanel claim={source.claim} evidence={source.evidence}/>}</Drawer>
    <Drawer open={!!detail} onClose={() => setDetail(null)} title="Opportunity">{detail && <OpportunityDetail opportunity={detail.opportunity} match={detail} company={company} claims={claims}
      saved={ws.saved.includes(detail.opportunity.id)} toggleSaved={() => ws.toggleSaved(detail.opportunity.id)} dismiss={() => { ws.dismiss(detail.opportunity.id); setDetail(null); }}/>}</Drawer>
    <Drawer open={askOpen} onClose={() => setAskOpen(false)} title="Innovation assistant"><ErrorBoundary onReset={() => setAskOpen(false)}><AssistantChat company={company}/></ErrorBoundary></Drawer>
  </Shell>;
}

// ---- Staff: sees all members' public profiles, never their private edits ----
function StaffApp({ onLogout }: { onLogout: () => void }) {
  const [view, setView] = useState("members");
  const [openCompany, setOpenCompany] = useState<string | null>(null);
  const [source, setSource] = useState<{ claim: Claim; evidence: Evidence } | null>(null);
  const [detail, setDetail] = useState<Opportunity | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const company = companies.find(c => c.id === openCompany);
  const openProfile = (id: string) => { setOpenCompany(id); setView("members"); window.scrollTo(0, 0); };

  const nav: NavItem[] = [
    { id: "members", label: "Members", icon: Users },
    { id: "opportunities", label: "Opportunities", icon: Sparkles },
    { id: "ecosystem", label: "Ecosystem", icon: Network },
  ];

  // Staff can ask about any member; the open profile is preselected.
  const askCompany = company ?? companies[0]!;

  return <Shell nav={nav} active={view} onNavigate={id => { setView(id); setOpenCompany(null); }} who={{ name: "Blue Science Park", role: "Staff" }} onLogout={onLogout} onAsk={() => setAskOpen(true)}>
    {view === "members" && (company
      ? <ProfileView key={company.id} company={company} edits={emptyEdits} onBack={() => setOpenCompany(null)} onOpenSource={(claim, evidence) => setSource({ claim, evidence })}/>
      : <MembersView onOpen={openProfile}/>)}
    {view === "opportunities" && <StaffOpportunities onOpen={setDetail}/>}
    {view === "ecosystem" && <EcosystemView onOpenCompany={openProfile}/>}
    <Drawer open={!!source} onClose={() => setSource(null)} title="Source evidence" wide>{source && <SourcePanel claim={source.claim} evidence={source.evidence}/>}</Drawer>
    <Drawer open={!!detail} onClose={() => setDetail(null)} title="Opportunity">{detail && <OpportunityDetail opportunity={detail}/>}</Drawer>
    <Drawer open={askOpen} onClose={() => setAskOpen(false)} title="Innovation assistant"><ErrorBoundary onReset={() => setAskOpen(false)}><AssistantChat company={askCompany} companies={companies}/></ErrorBoundary></Drawer>
  </Shell>;
}

function About() {
  return <div className="space-y-6 text-sm leading-6">
    <section><h3 className="card-title">How it works</h3>
      <ol className="steps">
        <li><strong>Profiles</strong> are JSON files built from members' public web pages. Every fact carries a verbatim quote, the source URL and the retrieval date; inferred interests carry their reasoning.</li>
        <li><strong>Opportunities</strong> are a JSON list of testbeds, funding calls and events from public sources, each with a link and retrieval date.</li>
        <li><strong>Matching</strong> (plain code) ranks opportunities by what the profile mentions and the interests the member adds, and explains why.</li>
        <li><strong>Boundary check</strong> (plain code) classifies each question to the assistant before anything is answered. Out-of-scope questions, override attempts and eligibility decisions never reach the AI.</li>
        <li><strong>Assistant agent</strong> (AI, backend) answers in-scope questions using only the company's profile, separating facts from inferred interests.</li>
        <li><strong>Search agent</strong> (AI, backend) searches the web for upcoming events, testbeds and funding that fit the profile. Results are marked unverified.</li>
      </ol>
    </section>
    <section><h3 className="card-title">Roles and privacy</h3><p>Members see and refine only their own profile. Blue Science Park staff see all public profiles read-only and never see members' edits, saved items or questions.</p></section>
    <section><h3 className="card-title">Keeping profiles current</h3><p>In this prototype the data is a static snapshot. In production the JSON files would be refreshed on a schedule, without overwriting what a member has edited.</p></section>
    <section><h3 className="card-title">Simulated in this prototype</h3><p>Login, browser-only storage of edits, static JSON profiles, and some opportunity details (marked “from search results”).</p></section>
  </div>;
}
