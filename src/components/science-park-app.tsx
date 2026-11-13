import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Bookmark, Building2, CalendarDays, Check, CheckCheck, ChevronRight, CircleHelp, ExternalLink, FlaskConical, Globe2, LayoutDashboard, Leaf, LogOut, Menu, MessageSquare, Network, Search, Send, ShieldCheck, Sparkles, ThumbsDown, Users, Waves, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allTopics, boundaryReply, classifyRequest, companies, matchScore, opportunities, rankedOpportunities, type Company, type Opportunity } from "@/lib/science-park";
import waterfront from "@/assets/karlskrona-waterfront.jpg";

// Hardcoded demo login. Not real security: the check runs in the browser.
const DEMO_USER = "demo";
const DEMO_PASSWORD = "bluepark2026";
const AUTH_KEY = "vsp-auth";
const WORKSPACE_KEY = "vsp-workspace";

type Refinement = { summary: string; topics: string[]; priority: string };
type Workspace = { profiles: Record<string, Refinement>; saved: string[]; dismissed: string[] };
type View = "dashboard" | "opportunities" | "saved" | "profile" | "members";
const emptyWorkspace: Workspace = { profiles: {}, saved: [], dismissed: [] };

function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

export function ScienceParkApp() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  useEffect(() => { setLoggedIn(load(AUTH_KEY, false)); }, []);
  if (loggedIn === null) return null;
  if (!loggedIn) return <LoginScreen onLogin={() => { localStorage.setItem(AUTH_KEY, "true"); setLoggedIn(true); }}/>;
  if (!companies.length) return <div className="p-10 text-sm">No company data found. Add JSON files to <code>src/data/companies/</code>.</div>;
  return <Dashboard onLogout={() => { localStorage.removeItem(AUTH_KEY); setLoggedIn(false); }}/>;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [user, setUser] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState("");
  return <div className="flex min-h-screen items-center justify-center bg-background px-4">
    <form className="auth-form w-full max-w-sm rounded-md border border-border bg-card p-6" onSubmit={e => { e.preventDefault(); if (user === DEMO_USER && password === DEMO_PASSWORD) onLogin(); else setError("Wrong username or password."); }}>
      <div className="brand !p-0 mb-4"><div className="brand-mark"><Waves size={25}/></div><div>BLUE<br/>SCIENCE PARK<small>KARLSKRONA</small></div></div>
      <h1 className="text-lg font-semibold">Virtual Science Park</h1>
      <label className="text-xs" htmlFor="login-user">Username</label><input id="login-user" className="field-input" value={user} onChange={e => setUser(e.target.value)} autoComplete="username"/>
      <label className="text-xs" htmlFor="login-password">Password</label><input id="login-password" className="field-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password"/>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <Button type="submit">Sign in</Button>
      <p className="text-[10px] text-muted-foreground">Hackathon demo login · simulated authentication</p>
    </form>
  </div>;
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [view, setView] = useState<View>("dashboard");
  const [companyId, setCompanyId] = useState(companies[0]!.id);
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [filter, setFilter] = useState("All opportunities");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Opportunity | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => { setWorkspace(load(WORKSPACE_KEY, emptyWorkspace)); }, []);

  const base = companies.find(c => c.id === companyId) ?? companies[0]!;
  const refined = workspace.profiles[companyId];
  const company: Company = refined ? { ...base, ...refined } : base;

  function persist(next: Workspace) { setWorkspace(next); localStorage.setItem(WORKSPACE_KEY, JSON.stringify(next)); }
  function navigate(next: View) { setView(next); setMenuOpen(false); setQuery(""); }
  function toggleSave(id: string) { persist({ ...workspace, saved: workspace.saved.includes(id) ? workspace.saved.filter(x => x !== id) : [...workspace.saved, id] }); }
  const types = ["All opportunities", ...new Set(opportunities.map(o => o.type))];
  const results = rankedOpportunities(company).filter(o => !workspace.dismissed.includes(o.id) && (view !== "saved" || workspace.saved.includes(o.id)) && (filter === "All opportunities" || o.type === filter) && `${o.title} ${o.description} ${o.source} ${o.topics.join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const partner = companies.filter(c => c.id !== companyId).sort((a, b) => b.topics.filter(t => company.topics.includes(t)).length - a.topics.filter(t => company.topics.includes(t)).length)[0];
  const nav = [{ view: "dashboard" as View, label: "Overview", icon: LayoutDashboard }, { view: "opportunities" as View, label: "Opportunities", icon: Sparkles }, { view: "saved" as View, label: "Saved opportunities", icon: Bookmark }, { view: "members" as View, label: "Member network", icon: Users }, { view: "profile" as View, label: "Company profile", icon: Building2 }];
  const typeIcon = (type: string) => type === "Funding" ? <Leaf size={11}/> : <FlaskConical size={11}/>;

  return <div className="app-shell">
    {menuOpen && <div className="fixed inset-0 z-30 bg-overlay" onClick={() => setMenuOpen(false)}/>}
    <aside className="sidebar" data-open={menuOpen}>
      <div className="brand"><div className="brand-mark"><Waves size={25}/></div><div>BLUE<br/>SCIENCE PARK<small>KARLSKRONA</small></div></div>
      <p className="nav-label">Your workspace</p>
      <nav aria-label="Workspace">{nav.map(item => <Button key={item.view} variant="ghost" className="nav-item" data-active={view === item.view} onClick={() => navigate(item.view)}><item.icon size={17}/>{item.label}{item.view === "saved" && workspace.saved.length > 0 && <span className="nav-count">{workspace.saved.length}</span>}</Button>)}</nav>
      <p className="nav-label">Connect & explore</p>
      <Button variant="ghost" className="nav-item" onClick={() => setChatOpen(true)}><MessageSquare/>Innovation assistant<ArrowUpRight className="ml-auto"/></Button>
      <div className="sidebar-bottom"><Button variant="ghost" className="nav-item" onClick={() => setHelpOpen(true)}><CircleHelp/>About this prototype</Button><div className="park-note"><div className="flex items-center gap-2 font-semibold text-foreground"><Globe2 size={13}/>Rooted in Karlskrona.</div>Connected to what’s next.<a className="mt-3 flex items-center gap-1 text-primary" href="https://www.bluesciencepark.se/" target="_blank" rel="noreferrer">Visit Blue Science Park<ArrowUpRight size={12}/></a></div></div>
    </aside>
    <div className="min-w-0">
      <header className="topbar"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu/></Button><span className="topbar-title">Virtual Science Park <span className="mx-3 text-border">/</span><span className="text-muted-foreground">Your workspace</span></span></div><div className="flex items-center gap-4"><label className="search-box"><Search size={15}/><input aria-label="Search opportunities" placeholder="Search opportunities…" value={query} onChange={e => { setQuery(e.target.value); if (view !== "saved") setView("opportunities"); }}/></label><Button variant="ghost" size="icon" title="Sign out" aria-label="Sign out" onClick={onLogout}><LogOut/></Button><div className="avatar" title="Demo workspace">ME</div></div></header>
      <main className="page">
        <div className="page-heading"><div><div className="eyebrow">Your innovation ecosystem</div><h1>{view === "profile" ? "Company profile" : view === "members" ? "Member network" : view === "saved" ? "Saved opportunities" : view === "opportunities" ? "Explore opportunities" : "A new perspective. New possibilities."}</h1><p>{view === "dashboard" ? `Knowledge, connections and opportunities. Curated for ${company.name}.` : view === "profile" ? "A source-backed starting point. Refined by you." : view === "members" ? "Discover shared expertise and potential connections." : "Find your next step in innovation."}</p></div><Select value={companyId} onValueChange={id => { setCompanyId(id); setNotice(""); }}><SelectTrigger className="company-select" aria-label="Select company"><Building2 size={15}/><SelectValue/></SelectTrigger><SelectContent>{companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        {notice && <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 text-xs"><span>{notice}</span><Button size="icon" variant="ghost" aria-label="Dismiss notification" onClick={() => setNotice("")}><X/></Button></div>}
        {view === "profile" ? <ProfileView key={companyId + (refined ? "edited" : "baseline")} company={company} refined={!!refined} onSave={r => { persist({ ...workspace, profiles: { ...workspace.profiles, [companyId]: r } }); setNotice("Profile saved in this browser."); }}/>
        : view === "members" ? <div className="grid gap-5 md:grid-cols-3">{companies.map(c => <article key={c.id} className="opportunity"><div className="company-monogram">{c.initials}</div><h3>{c.name}</h3><p>{c.summary}</p><div className="tag-list">{c.topics.map(t => <span className="topic-tag" key={t}>{t}</span>)}</div><Button variant="link" className="px-0" onClick={() => { setCompanyId(c.id); setView("profile"); }}>Explore profile<ArrowRight/></Button></article>)}</div>
        : <>
          {view === "dashboard" && <><section className="welcome"><img src={waterfront} width={1600} height={608} alt="Illustrative AI-generated view of Karlskrona's waterfront"/><div className="welcome-content"><span className="eyebrow">Blue Science Park · Karlskrona</span><h2>Local roots.<br/>Limitless connections.</h2><p>Your next breakthrough could be a conversation,<br className="hidden sm:block"/> a collaboration, or an opportunity away.</p><Button variant="hero" onClick={() => setView("members")}>Explore your ecosystem<ArrowUpRight size={12}/></Button></div></section><section className="stats"><div className="stat"><div className="stat-icon"><Sparkles size={18}/></div><div><strong>{opportunities.length}</strong><span>Opportunities to explore</span></div></div><div className="stat"><div className="stat-icon"><Bookmark size={18}/></div><div><strong>{workspace.saved.length.toString().padStart(2, "0")}</strong><span>Saved for later</span></div></div><div className="stat"><div className="stat-icon"><Network size={18}/></div><div><strong>{companies.length.toString().padStart(2, "0")}</strong><span>Company profiles</span></div></div></section></>}
          <div className="dashboard-grid"><section><div className="section-heading"><h2>{view === "saved" ? "Your shortlist" : "Selected for you"}</h2><span className="text-[9px] text-muted-foreground flex items-center gap-1"><CheckCheck size={12}/>Profile updated {company.lastUpdated}</span></div><p className="section-subtitle">{view === "saved" ? "Keep promising connections close." : company.topics.length ? `Matched to your interests in ${company.topics.slice(0, 2).join(" and ").toLowerCase()}.` : "Refine your profile interests to improve matching."}</p><div className="filter-bar">{types.map(f => <Button variant="ghost" key={f} className="filter-button" data-active={filter === f} onClick={() => setFilter(f)}>{f}</Button>)}<span className="ml-auto self-center text-[9px] text-muted-foreground">{results.length} results</span></div>
          {results.length ? results.map(o => <article className="opportunity" key={o.id}><div className="opportunity-top"><span className="type-badge" data-type={o.type}>{typeIcon(o.type)} {o.type}</span><div className="flex items-center gap-2"><span className="match"><Sparkles size={11}/>{matchScore(company, o)} match score</span><Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" aria-label={workspace.saved.includes(o.id) ? `Unsave ${o.title}` : `Save ${o.title}`} onClick={() => toggleSave(o.id)}><Bookmark className={workspace.saved.includes(o.id) ? "fill-primary text-primary" : ""}/></Button></div></div><h3>{o.title}</h3><p>{o.description}</p><div className="opportunity-meta"><span><Globe2 size={11}/>{o.source}</span><span><CalendarDays size={11}/>{o.date}</span><span><Building2 size={11}/>{o.location}</span></div><div className="opportunity-footer"><div className="reason"><Sparkles size={11} className="mt-0.5 shrink-0"/><span>{o.topics.filter(t => company.topics.includes(t)).length ? `Relevant to ${o.topics.filter(t => company.topics.includes(t)).slice(0, 2).join(" & ").toLowerCase()}` : "A broader opportunity to explore"}</span></div><Button variant="link" className="details-button" onClick={() => setDetail(o)}>View opportunity<ArrowUpRight/></Button></div></article>)
          : <div className="empty-state"><Bookmark className="mx-auto mb-4"/><h3 className="text-sm font-semibold">{view === "saved" ? "Your shortlist is waiting" : opportunities.length ? "No opportunities found" : "No opportunity data loaded"}</h3><p className="mt-2 text-xs">{view === "saved" ? "Save an opportunity that catches your interest." : opportunities.length ? "Try another search or category." : "Add opportunities to src/data/opportunities.json."}</p></div>}</section>
          <aside className="dashboard-aside"><section className="side-section"><div className="section-heading"><h2 className="!text-sm">Your company, in focus</h2><Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Review company profile" onClick={() => setView("profile")}><ArrowUpRight/></Button></div><div className="company-header"><div className="company-monogram">{company.initials}</div><div><h3>{company.name}</h3><p>Updated {company.lastUpdated}</p></div></div><p className="section-subtitle">{company.summary}</p><div className="tag-list">{company.topics.map(t => <span className="topic-tag" key={t}>{t}</span>)}</div><p className="text-[9px] text-muted-foreground">{refined ? "User-refined interests" : "Inferred interests · not confirmed priorities"}</p><div className="verified-line"><ShieldCheck size={12}/>Public evidence linked</div><Button variant="outline" className="mt-4 w-full h-8 text-[10px]" onClick={() => setView("profile")}>Review & refine profile<ArrowRight/></Button></section>
          <section className="side-section"><div className="assistant-teaser"><Sparkles className="text-primary" size={21}/><h3>A little guidance goes a long way.</h3><p>What’s the next opportunity for {company.name}?</p><Button variant="default" className="mt-4 w-full h-8 text-[10px]" onClick={() => setChatOpen(true)}>Ask your innovation assistant<ArrowRight/></Button></div></section>
          {partner && <section><div className="section-heading"><h2 className="!text-sm">Better, together</h2><Network size={16} className="text-muted-foreground"/></div><p className="section-subtitle">A potential connection in your ecosystem.</p><div className="partner-row"><div className="company-monogram">{partner.initials}</div><div><strong className="text-xs">{partner.name}</strong></div><Button variant="ghost" size="icon" className="ml-auto" aria-label={`Explore ${partner.name}`} onClick={() => { setCompanyId(partner.id); setView("profile"); }}><ChevronRight/></Button></div><p className="mt-3 text-[9px] text-muted-foreground leading-5">{company.topics.filter(t => partner.topics.includes(t)).length ? `Shared public topics: ${company.topics.filter(t => partner.topics.includes(t)).join(", ")}.` : "No shared topics found yet."} Suggested connection only; no collaboration interest confirmed.</p></section>}</aside></div></>}
        <footer className="demo-note"><span className="flex items-center gap-1.5"><ShieldCheck size={12}/>Hackathon prototype · Curated public snapshots · Simulated login, data saved in this browser</span><span>Match scores are heuristic, not probabilities · Waterfront image is AI-generated</span></footer>
      </main>
    </div>
    <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetail(null); }}><DialogContent className="detail-dialog">{detail && <><DialogHeader><span className="type-badge w-fit" data-type={detail.type}>{detail.type} · {detail.source}</span><DialogTitle className="!leading-7 pt-2">{detail.title}</DialogTitle><DialogDescription>{detail.description}</DialogDescription></DialogHeader><div className="detail-section"><h4>Why it may matter to {company.name}</h4>{detail.topics.filter(t => company.topics.includes(t)).join(", ") || "Broader innovation potential"}. This is an inferred match, not a stated company priority.</div><div className="detail-section"><h4>A possible next step</h4>{detail.nextStep}</div><div className="detail-section"><h4>Requirements & uncertainties</h4>{detail.caveat}</div><div className="detail-section"><h4>Source & dates</h4><p>{detail.date}</p><a className="text-primary flex items-center gap-2 mt-2" href={detail.url} target="_blank" rel="noreferrer">Read the official {detail.source} source<ExternalLink size={13}/></a></div><div className="flex flex-wrap gap-2 pt-2"><Button onClick={() => toggleSave(detail.id)}><Bookmark/>{workspace.saved.includes(detail.id) ? "Remove from saved" : "Save opportunity"}</Button><Button variant="outline" onClick={() => { setChatOpen(true); setDetail(null); }}>Ask about this<Sparkles/></Button><Button variant="ghost" onClick={() => { persist({ ...workspace, dismissed: [...workspace.dismissed, detail.id] }); setDetail(null); }}><ThumbsDown/>Not relevant</Button></div></>}</DialogContent></Dialog>
    <AssistantDialog open={chatOpen} setOpen={setChatOpen} company={company}/>
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}><DialogContent className="detail-dialog"><DialogHeader><DialogTitle>About Virtual Science Park</DialogTitle><DialogDescription>Blue Science Park · Hackathon 2026 prototype</DialogDescription></DialogHeader><div className="detail-section"><h4>Data</h4>Company profiles are loaded from JSON files with source evidence and retrieval dates. Facts link to public evidence; interests are inferred until refined by the user.</div><div className="detail-section"><h4>Simulated parts</h4>Login is a hardcoded demo account. Profile edits and saved opportunities are stored only in this browser. The assistant is rule-based and simulated.</div><Button asChild variant="outline"><a href="https://www.bluesciencepark.se/" target="_blank" rel="noreferrer">Contact Blue Science Park<ExternalLink/></a></Button></DialogContent></Dialog>
  </div>;
}

function ProfileView({ company, refined, onSave }: { company: Company; refined: boolean; onSave: (r: Refinement) => void }) {
  const [draft, setDraft] = useState<Refinement>({ summary: company.summary, topics: company.topics, priority: company.priority });
  return <div className="profile-layout"><section>
    <div className="company-header"><div className="company-monogram">{company.initials}</div><div><h3>{company.name}</h3><p>Updated {company.lastUpdated}</p></div></div>
    {company.sections.map(s => <div key={s.key}><h2 className="mt-7 text-base font-bold">{s.label}</h2>{s.claims.map(c => <div key={c.id} className="fact">
      <span className="verified-line !mt-0 !mb-2"><ShieldCheck size={13}/>{c.type === "fact" ? "Public fact" : c.type === "user_confirmed" ? "Confirmed by user" : "Inferred – not a confirmed priority"}{c.confidence && ` · ${c.confidence} confidence`}</span>
      <p>{c.value}</p>
      {c.reasoning && <p className="text-[11px] text-muted-foreground">Reasoning: {c.reasoning}{c.basedOnClaims?.length ? ` (based on ${c.basedOnClaims.join(", ")})` : ""}</p>}
      {c.evidence.map(e => <div key={e.id}>{e.quotes?.map(q => <p key={q} className="text-[11px] italic text-muted-foreground">“{q}”</p>)}<a href={e.url} target="_blank" rel="noreferrer">{e.title ?? new URL(e.url).hostname}<ExternalLink size={12}/></a><span className="text-[10px] text-muted-foreground">{e.publishedAt && `Published ${e.publishedAt} · `}Retrieved {e.retrievedAt}{e.verification === "unverified_url" && " · link not verified"}</span></div>)}
      {(c.note || c.correctionNote) && <p className="text-[11px] text-muted-foreground">Note: {c.note ?? c.correctionNote}</p>}
    </div>)}</div>)}
    {company.notes.length > 0 && <><h2 className="mt-7 text-base font-bold">Missing or uncertain</h2><ul className="mt-2 list-disc pl-5 text-xs leading-6 text-muted-foreground">{company.notes.map(n => <li key={n}>{n}</li>)}</ul></>}
    {company.sources.length > 0 && <><h2 className="mt-7 text-base font-bold">Sources ({company.sources.length})</h2><ul className="mt-2 list-disc pl-5 text-xs leading-6">{company.sources.map(e => <li key={e.id}><a className="text-primary" href={e.url} target="_blank" rel="noreferrer">{e.title ?? e.url}</a><span className="text-muted-foreground">{e.publisher && ` · ${e.publisher}`}{e.publishedAt && ` · published ${e.publishedAt}`} · retrieved {e.retrievedAt}{e.verification === "unverified_url" && " · not verified"}{e.freshnessWarning && ` · ${e.freshnessWarning}`}</span></li>)}</ul></>}
  </section>
  <form onSubmit={e => { e.preventDefault(); onSave(draft); }}><h2 className="text-base font-bold">Your interests & priorities</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">{refined ? "User-refined profile" : "Baseline interests and priorities are inferred, not confirmed."}</p>
    <label className="field-label" htmlFor="company-summary">Company summary</label><textarea id="company-summary" className="field-input" rows={4} maxLength={600} value={draft.summary} onChange={e => setDraft({ ...draft, summary: e.target.value })}/>
    <span className="field-label">Application areas & interests</span>{allTopics.length ? <div className="profile-toggles">{allTopics.map(t => <Button type="button" variant={draft.topics.includes(t) ? "secondary" : "outline"} aria-pressed={draft.topics.includes(t)} key={t} onClick={() => setDraft({ ...draft, topics: draft.topics.includes(t) ? draft.topics.filter(x => x !== t) : [...draft.topics, t] })}>{draft.topics.includes(t) && <Check/>}{t}</Button>)}</div> : <p className="text-xs text-muted-foreground">Topics appear when opportunities are loaded.</p>}
    <label className="field-label">Current priority</label><Select value={draft.priority} onValueChange={priority => setDraft({ ...draft, priority })}><SelectTrigger aria-label="Current priority"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Testing">Testing</SelectItem><SelectItem value="Funding">Funding</SelectItem><SelectItem value="Exploration">Exploration</SelectItem></SelectContent></Select>
    <Button type="submit" className="mt-6 w-full"><Check/>Save profile</Button>
  </form></div>;
}

function AssistantDialog({ open, setOpen, company }: { open: boolean; setOpen: (v: boolean) => void; company: Company }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [question, setQuestion] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { setMessages([]); setQuestion(""); }, [company.id]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  function send(text: string) {
    if (!text.trim()) return;
    const kind = classifyRequest(text);
    const top = rankedOpportunities(company)[0];
    const reply = kind !== "relevant" ? boundaryReply(kind) : top ? `${top.title} may fit ${company.name}'s ${company.priority.toLowerCase()} preference and inferred topics. ${top.nextStep}\n\n${top.caveat}\n\nSource: ${top.url}` : `No opportunities are loaded yet, so I can't recommend anything for ${company.name}.`;
    setMessages([...messages, { role: "user", text: text.trim() }, { role: "assistant", text: reply }]); setQuestion("");
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="chat-dialog"><DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>Innovation assistant</DialogTitle><DialogDescription>{company.name} · Simulated assistant</DialogDescription></DialogHeader><div className="chat-messages">{messages.length === 0 && <div className="py-6"><div className="text-primary mb-4"><Sparkles size={30}/></div><h3 className="text-lg font-semibold">What’s next for {company.name}?</h3><p className="mt-3 text-xs leading-6 text-muted-foreground">Explore innovation, testing, funding and potential collaborations.</p><div className="mt-5 flex flex-col items-start gap-2">{["Find relevant testing opportunities", "Which funding programmes could fit?", "Explain my top recommendation"].map(q => <Button key={q} variant="outline" size="sm" onClick={() => send(q)}>{q}<ArrowUpRight/></Button>)}</div></div>}{messages.map((m, i) => <div className="chat-message" data-role={m.role} key={i}>{m.text.split(/(https:\/\/[^\s]+)/g).map((part, j) => /^https:\/\//.test(part) ? <a href={part.replace(/[.,)]$/, "")} key={j} target="_blank" rel="noreferrer">{part}</a> : part)}</div>)}<div ref={bottom}/></div><form className="chat-form" onSubmit={e => { e.preventDefault(); send(question); }}><input className="field-input" aria-label="Ask the innovation assistant" placeholder="Ask about your next opportunity…" maxLength={3000} value={question} onChange={e => setQuestion(e.target.value)}/><Button type="submit" size="icon" disabled={!question.trim()} aria-label="Send question"><Send/></Button></form><p className="text-[9px] leading-4 text-muted-foreground">Suggested next steps, not formal advice or confirmed eligibility. Human decisions belong with Blue Science Park staff.</p></DialogContent></Dialog>;
}
