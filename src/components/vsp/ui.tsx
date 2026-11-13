import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import type { ClaimType, OpportunityType } from "@/lib/science-park";

export const CLAIM_LABEL: Record<ClaimType, string> = {
  fact: "Verified",
  unverified: "Unverified",
  inferred: "Inferred",
  user_confirmed: "Confirmed by you",
};

const CLAIM_HINT: Record<ClaimType, string> = {
  fact: "Stated on the source page – the quote was found there by the verifier",
  unverified: "Claimed as a fact, but the quote could not be found on the source page",
  inferred: "Our reasoning from the facts – not a confirmed company priority",
  user_confirmed: "An inferred interest you have confirmed",
};

export function ClaimBadge({ type }: { type: ClaimType }) {
  return <span className="claim-badge" data-type={type} title={CLAIM_HINT[type]}>{CLAIM_LABEL[type]}</span>;
}

export function TypeTag({ type }: { type: OpportunityType }) {
  return <span className="type-tag" data-type={type}>{type === "Event" ? "Event" : type === "Testing" ? "Testing" : "Funding"}</span>;
}

export function Drawer({ open, onClose, title, wide, children }: { open: boolean; onClose: () => void; title: string; wide?: boolean; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="drawer-root">
    <div className="drawer-scrim" onClick={onClose}/>
    <aside className="drawer" data-wide={wide} role="dialog" aria-modal="true" aria-label={title}>
      <header className="drawer-head"><span className="eyebrow">{title}</span><button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18}/></button></header>
      <div className="drawer-body">{children}</div>
    </aside>
  </div>;
}

export function CompanyLogo({ src, name, size = 48 }: { src: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  return <span className="company-logo" style={{ width: size, height: size }}>
    {failed ? <span className="company-logo-fallback">{name.slice(0, 1)}</span> : <img src={src} alt={`${name} logo`} onError={() => setFailed(true)}/>}
  </span>;
}
