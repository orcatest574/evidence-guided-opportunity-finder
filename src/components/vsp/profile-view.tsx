import { useState } from "react";
import { ArrowLeft, Check, ExternalLink, EyeOff, Plus, RotateCcw, ShieldCheck, X } from "lucide-react";
import waterfront from "@/assets/karlskrona-waterfront.jpg";
import { SECTIONS, effectiveClaims, logoUrl, type Claim, type Company, type Edits, type Evidence } from "@/lib/science-park";
import { ClaimBadge, CompanyLogo } from "./ui";

/** Removes the AI model's internal claim references such as "(c9)" or "(c2, c7)". */
const stripIds = (text: string) => text.replace(/\s*\((?:c\d+(?:,\s*)?)+\)/g, "");

type Props = {
  company: Company;
  edits: Edits;
  /** Members can refine their own profile. Staff see the public baseline read-only. */
  setEdits?: ((e: Edits) => void) | undefined;
  onBack?: (() => void) | undefined;
  onOpenSource: (claim: Claim, evidence: Evidence) => void;
};

export function ProfileView({ company, edits, setEdits, onBack, onOpenSource }: Props) {
  const claims = effectiveClaims(company, edits);
  const count = (...types: string[]) => claims.filter(c => types.includes(c.type)).length;
  const tabs = [
    ...SECTIONS.filter(s => claims.some(c => c.section === s.key) || company.missing.some(m => matchesSection(m.field, s.key)) || (s.key === "inferredInterests" && setEdits)),
    { key: "about", label: "About this profile" },
  ];
  const [tab, setTab] = useState(tabs[0]!.key);
  const hidden = company.claims.filter(c => edits.hidden.includes(c.id) && c.section === tab);

  return <div>
    {onBack && <button className="back-link" onClick={onBack}><ArrowLeft size={15}/>All members</button>}

    <section className="profile-hero">
      <img className="profile-hero-img" src={company.background ?? waterfront} alt="" width={1600} height={608}/>
      <div className="profile-hero-overlay"/>
      <div className="profile-hero-content">
        <CompanyLogo src={logoUrl(company.id)} name={company.name} size={72}/>
        <div className="min-w-0">
          <span className="hero-eyebrow">Blue Science Park member</span>
          <h1 className="hero-title">{company.name}</h1>
          {company.website && <a className="hero-link" href={company.website} target="_blank" rel="noreferrer">{company.website.replace("https://", "")}<ExternalLink size={13}/></a>}
        </div>
      </div>
    </section>

    <section className="profile-summary card">
      <p className="summary-text">{company.summary}</p>
      <div className="stat-pills">
        <span className="stat-pill" data-type="fact"><strong>{count("fact")}</strong> verified facts</span>
        <span className="stat-pill" data-type="inferred"><strong>{count("inferred", "user_confirmed")}</strong> inferred interests</span>
        {count("unverified") > 0 && <span className="stat-pill" data-type="unverified"><strong>{count("unverified")}</strong> unverified</span>}
        <span className="stat-meta"><ShieldCheck size={14}/>Built {company.createdAt} from {company.pagesFetched} public pages · click a source to see the quote</span>
      </div>
    </section>

    <nav className="section-tabs" aria-label="Profile sections">
      {tabs.map(t => {
        const n = claims.filter(c => c.section === t.key).length;
        return <button key={t.key} data-active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}{t.key !== "about" && <span className="tab-count">{n}</span>}</button>;
      })}
    </nav>

    <div className="tab-panel">
      {tab === "about" ? <AboutProfile company={company}/> : <>
        {tab === "inferredInterests" && <p className="tab-intro">These interests are our reasoning from the verified facts – not confirmed company priorities.{setEdits && " Confirm the ones that are right, remove the rest, or add your own."}</p>}
        {company.missing.filter(m => matchesSection(m.field, tab)).map(m => <p key={m.field} className="missing-inline">Not found in public sources: {stripIds(m.reason)}</p>)}
        <div className="claim-grid">
          {claims.filter(c => c.section === tab).map(c => <ClaimCard key={c.id} claim={c} onOpenSource={onOpenSource}
            onConfirm={setEdits && c.type === "inferred" ? () => setEdits({ ...edits, confirmed: [...edits.confirmed, c.id] }) : undefined}
            onUnconfirm={setEdits && c.type === "user_confirmed" ? () => setEdits({ ...edits, confirmed: edits.confirmed.filter(x => x !== c.id) }) : undefined}
            onHide={setEdits ? () => setEdits({ ...edits, hidden: [...edits.hidden, c.id], confirmed: edits.confirmed.filter(x => x !== c.id) }) : undefined}/>)}
        </div>
        {tab === "inferredInterests" && setEdits && <OwnInterests edits={edits} setEdits={setEdits}/>}
        {setEdits && hidden.length > 0 && <div className="hidden-list">
          <span className="text-xs font-semibold">Removed by you</span>
          {hidden.map(c => <div key={c.id} className="hidden-row"><span className="line-through">{c.value}</span>
            <button className="link text-xs" onClick={() => setEdits({ ...edits, hidden: edits.hidden.filter(x => x !== c.id) })}><RotateCcw size={12}/>Undo</button></div>)}
        </div>}
      </>}
    </div>
  </div>;
}

function matchesSection(field: string, sectionKey: string) {
  return field.toLowerCase().replace(/[^a-z]/g, "").startsWith(sectionKey.toLowerCase().slice(0, 5));
}

function ClaimCard({ claim, onOpenSource, onConfirm, onUnconfirm, onHide }: { claim: Claim; onOpenSource: (c: Claim, e: Evidence) => void; onConfirm?: (() => void) | undefined; onUnconfirm?: (() => void) | undefined; onHide?: (() => void) | undefined }) {
  const inferred = claim.type === "inferred" || claim.type === "user_confirmed";
  return <article className="claim" data-type={claim.type}>
    <div className="claim-head"><ClaimBadge type={claim.type}/>{claim.confidence && <span className="claim-meta">{claim.confidence} confidence</span>}</div>
    <p className="claim-text">{claim.value}</p>
    {inferred && claim.reasoning && <p className="claim-reason">Why: {stripIds(claim.reasoning)}</p>}
    {claim.note && <p className="claim-reason">{claim.note}</p>}
    <div className="claim-foot">
      {!inferred && claim.evidence.map(e => <button key={e.id} className="source-chip" onClick={() => onOpenSource(claim, e)}>{(e.title ?? e.publisher ?? "Source").split(/ [|–-] /)[0]}<span className="text-ink-soft"> · {e.publisher}</span></button>)}
      <span className="ml-auto flex gap-1">
        {onConfirm && <button className="action-btn" onClick={onConfirm}><Check size={13}/>Confirm</button>}
        {onUnconfirm && <button className="action-btn" onClick={onUnconfirm}><RotateCcw size={13}/>Undo confirm</button>}
        {onHide && <button className="action-btn subtle" onClick={onHide}><EyeOff size={13}/>{inferred ? "Not relevant" : "Incorrect"}</button>}
      </span>
    </div>
  </article>;
}

function OwnInterests({ edits, setEdits }: { edits: Edits; setEdits: (e: Edits) => void }) {
  const [value, setValue] = useState("");
  return <div className="own-interests card">
    <h3 className="card-title">Your own interests and priorities</h3>
    <p className="card-help">For example “marine testing” or “hydrogen”. They are used when matching opportunities.</p>
    <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); const v = value.trim().toLowerCase(); if (v) { setEdits({ ...edits, interests: [...new Set([...edits.interests, v])] }); setValue(""); } }}>
      <input className="text-input" aria-label="Add an interest" placeholder="Add an interest…" value={value} maxLength={60} onChange={e => setValue(e.target.value)}/>
      <button className="btn primary" type="submit"><Plus size={15}/>Add</button>
    </form>
    {edits.interests.length > 0 && <div className="chip-row">{edits.interests.map(i => <span key={i} className="chip">{i}<button aria-label={`Remove ${i}`} onClick={() => setEdits({ ...edits, interests: edits.interests.filter(x => x !== i) })}><X size={12}/></button></span>)}</div>}
  </div>;
}

function AboutProfile({ company }: { company: Company }) {
  return <div className="about-grid">
    <div className="card">
      <h3 className="card-title">How this profile was built</h3>
      <ol className="steps">
        <li><strong>Sources:</strong> {company.pagesFetched} public web pages about {company.name}.</li>
        <li><strong>Facts</strong> carry a verbatim quote that was checked against the page text. Quotes that could not be found were removed.</li>
        <li><strong>Inferred interests</strong> are reasoned from the facts and are not confirmed priorities.</li>
        <li><strong>Review</strong> by the company, who can confirm, remove or add.</li>
      </ol>
      <p className="card-help mt-3">Snapshot from {company.createdAt}.</p>
    </div>
    <div className="card">
      <h3 className="card-title">Missing or uncertain</h3>
      {company.missing.length + company.uncertainties.length === 0 ? <p className="card-help">Nothing flagged.</p> :
        <ul className="bullets">
          {company.missing.map(m => <li key={m.field}><strong>{m.field.replace(/[-_]/g, " ")}</strong> – {stripIds(m.reason)}</li>)}
          {company.uncertainties.map(u => <li key={u.topic}><strong>{u.topic}</strong> – {stripIds(u.detail)}</li>)}
        </ul>}
    </div>
    <div className="card about-wide">
      <h3 className="card-title">Verifier log</h3>
      <p className="card-help">What the verifier removed or downgraded before the profile was published.</p>
      {company.verifierLog.length ? <ul className="log">{company.verifierLog.map(w => <li key={w}>{w}</li>)}</ul> : <p className="card-help mt-2">Every quote was found on its source page.</p>}
      <h3 className="card-title mt-5">Sources ({company.evidence.length})</h3>
      <ul className="log">{company.evidence.map(e => <li key={e.id}><a className="link" href={e.url} target="_blank" rel="noreferrer">{e.title ?? e.url}</a> · retrieved {e.retrievedAt}</li>)}</ul>
    </div>
  </div>;
}
