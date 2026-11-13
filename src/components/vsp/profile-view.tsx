import { useState } from "react";
import { Check, ExternalLink, EyeOff, Plus, RotateCcw, ShieldCheck, X } from "lucide-react";
import { SECTIONS, effectiveClaims, type Claim, type Company, type Edits, type Evidence, type Focus } from "@/lib/science-park";
import { ClaimBadge, Segmented } from "./ui";

/** Removes the AI model's internal claim references such as "(c9)" or "(c2, c7)". */
const stripIds = (text: string) => text.replace(/\s*\((?:c\d+(?:,\s*)?)+\)/g, "");

export const FOCUS_OPTIONS: { value: Focus; label: string }[] = [
  { value: "All", label: "No priority" },
  { value: "Testing", label: "Testing" },
  { value: "Funding", label: "Funding" },
  { value: "Event", label: "Events" },
];

type Props = { company: Company; edits: Edits; setEdits: (e: Edits) => void; onReset: () => void; onOpenSource: (claim: Claim, evidence: Evidence) => void };

export function ProfileView({ company, edits, setEdits, onReset, onOpenSource }: Props) {
  const claims = effectiveClaims(company, edits);
  const hidden = company.claims.filter(c => edits.hidden.includes(c.id));
  const count = (t: string) => claims.filter(c => c.type === t).length;
  const removedQuotes = company.verifierLog.filter(w => w.includes("quote not found")).length;
  const edited = edits.hidden.length + edits.confirmed.length + edits.interests.length > 0 || edits.focus !== "All";

  return <div className="profile-grid">
    <div className="min-w-0">
      <section className="profile-hero">
        <div className="eyebrow">Baseline profile · built {company.createdAt} from {company.pagesFetched} public pages</div>
        <h1 className="display">{company.name}</h1>
        {company.website && <a className="link text-sm" href={company.website} target="_blank" rel="noreferrer">{company.website.replace("https://", "")}<ExternalLink size={13}/></a>}
        <p className="lede">{company.summary}</p>
        <dl className="trust-strip">
          <div><dt>Verified facts</dt><dd>{count("fact")}</dd></div>
          <div><dt>Inferred</dt><dd>{count("inferred") + count("user_confirmed")}</dd></div>
          <div><dt>Unverified</dt><dd>{count("unverified")}</dd></div>
          <div><dt>Quotes rejected by verifier</dt><dd>{removedQuotes}</dd></div>
        </dl>
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-soft"><ShieldCheck size={14}/>Every fact links to its source. Click a source to see the quote highlighted on the page.</p>
      </section>

      {SECTIONS.map(({ key, label }) => {
        const list = claims.filter(c => c.section === key);
        const missing = company.missing.filter(m => m.field.toLowerCase().includes(key.toLowerCase().slice(0, 5)));
        if (!list.length && !missing.length) return null;
        return <section key={key} className="claim-section">
          <h2 className="section-title">{label}{key === "inferredInterests" && <span className="section-note">Our reasoning – confirm or remove</span>}</h2>
          {!list.length && missing.map(m => <p key={m.field} className="missing-inline">Not found in public sources: {stripIds(m.reason)}</p>)}
          {list.map(c => <ClaimRow key={c.id} claim={c} onOpenSource={onOpenSource}
            onConfirm={c.type === "inferred" ? () => setEdits({ ...edits, confirmed: [...edits.confirmed, c.id] }) : undefined}
            onUnconfirm={c.type === "user_confirmed" ? () => setEdits({ ...edits, confirmed: edits.confirmed.filter(x => x !== c.id) }) : undefined}
            onHide={() => setEdits({ ...edits, hidden: [...edits.hidden, c.id], confirmed: edits.confirmed.filter(x => x !== c.id) })}/>)}
        </section>;
      })}

      {hidden.length > 0 && <section className="claim-section">
        <h2 className="section-title">Removed by you</h2>
        {hidden.map(c => <div key={c.id} className="hidden-row"><span className="line-through">{c.value}</span>
          <button className="link text-xs" onClick={() => setEdits({ ...edits, hidden: edits.hidden.filter(x => x !== c.id) })}><RotateCcw size={12}/>Undo</button></div>)}
      </section>}
    </div>

    <aside className="refine-panel">
      <div className="panel">
        <h3 className="panel-title">Refine this profile</h3>
        <p className="panel-help">Your changes re-rank opportunities immediately.</p>
        <label className="field-label">Current priority</label>
        <Segmented label="Current priority" value={edits.focus} options={FOCUS_OPTIONS} onChange={focus => setEdits({ ...edits, focus })}/>
        <label className="field-label" htmlFor="interest-input">Add an interest or application area</label>
        <InterestInput onAdd={i => setEdits({ ...edits, interests: [...new Set([...edits.interests, i])] })}/>
        {edits.interests.length > 0 && <div className="chip-row">{edits.interests.map(i => <span key={i} className="chip">{i}<button aria-label={`Remove ${i}`} onClick={() => setEdits({ ...edits, interests: edits.interests.filter(x => x !== i) })}><X size={12}/></button></span>)}</div>}
        {edited && <button className="link mt-4 text-xs" onClick={onReset}><RotateCcw size={12}/>Reset to baseline</button>}
        <p className="mt-4 text-[11px] text-ink-soft">Saved in this browser only (prototype).</p>
      </div>

      {(company.missing.length > 0 || company.uncertainties.length > 0) && <div className="panel">
        <h3 className="panel-title">Missing or uncertain</h3>
        <ul className="note-list">
          {company.missing.map(m => <li key={m.field}><strong>{m.field.replace(/[-_]/g, " ")}</strong> – {stripIds(m.reason)}</li>)}
          {company.uncertainties.map(u => <li key={u.topic}><strong>{u.topic}</strong> – {stripIds(u.detail)}</li>)}
        </ul>
      </div>}

      <div className="panel">
        <h3 className="panel-title">How this profile was built</h3>
        <ol className="pipeline-steps">
          <li><strong>Fetch</strong> {company.pagesFetched} public pages</li>
          <li><strong>Extract</strong> claims with an AI model ({company.createdBy.replace("profiler-agent ", "").replace(/[()]/g, "")})</li>
          <li><strong>Verify</strong> every quote against the page text (plain code)</li>
          <li><strong>Review</strong> by you</li>
        </ol>
        {company.verifierLog.length > 0 && <details className="mt-3">
          <summary className="link text-xs">Verifier log ({company.verifierLog.length})</summary>
          <ul className="verifier-log">{company.verifierLog.map(w => <li key={w}>{w}</li>)}</ul>
        </details>}
      </div>
    </aside>
  </div>;
}

function ClaimRow({ claim, onOpenSource, onConfirm, onUnconfirm, onHide }: { claim: Claim; onOpenSource: (c: Claim, e: Evidence) => void; onConfirm?: (() => void) | undefined; onUnconfirm?: (() => void) | undefined; onHide: () => void }) {
  const inferred = claim.type === "inferred" || claim.type === "user_confirmed";
  return <article className="claim" id={`claim-${claim.id}`} data-type={claim.type}>
    <div className="claim-head"><ClaimBadge type={claim.type}/>{claim.confidence && <span className="claim-meta">{claim.confidence} confidence</span>}<span className="claim-meta ml-auto">{claim.id}</span></div>
    <p className="claim-text">{claim.value}</p>
    {inferred && claim.reasoning && <p className="claim-reason">Why: {stripIds(claim.reasoning)}{claim.basedOnClaims?.length ? <> Based on {claim.basedOnClaims.map(id => <a key={id} className="ref" href={`#claim-${id}`}>{id}</a>)}</> : null}</p>}
    {claim.note && <p className="claim-reason">{claim.note}</p>}
    <div className="claim-foot">
      {!inferred && claim.evidence.map(e => <button key={e.id} className="source-chip" onClick={() => onOpenSource(claim, e)}>{(e.title ?? e.publisher ?? "source").split(/ [|–-] /)[0]}<span className="text-ink-soft"> · {e.publisher}</span></button>)}
      <span className="ml-auto flex gap-1">
        {onConfirm && <button className="action-btn" onClick={onConfirm}><Check size={13}/>Confirm</button>}
        {onUnconfirm && <button className="action-btn" onClick={onUnconfirm}><RotateCcw size={13}/>Unconfirm</button>}
        <button className="action-btn subtle" onClick={onHide}><EyeOff size={13}/>{inferred ? "Not relevant" : "Incorrect"}</button>
      </span>
    </div>
  </article>;
}

function InterestInput({ onAdd }: { onAdd: (i: string) => void }) {
  const [value, setValue] = useState("");
  return <form className="flex gap-2" onSubmit={e => { e.preventDefault(); const v = value.trim().toLowerCase(); if (v) { onAdd(v); setValue(""); } }}>
    <input id="interest-input" className="text-input" placeholder="e.g. marine testing, hydrogen" value={value} maxLength={60} onChange={e => setValue(e.target.value)}/>
    <button className="btn" type="submit" aria-label="Add interest"><Plus size={15}/></button>
  </form>;
}
