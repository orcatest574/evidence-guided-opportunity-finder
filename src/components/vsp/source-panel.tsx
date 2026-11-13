import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { findQuote, sourceText, type Claim, type Evidence } from "@/lib/science-park";
import { ClaimBadge } from "./ui";

const CONTEXT = 700; // characters shown around the quote

/** Shows the fetched page text with the claim's quote highlighted – proof that the fact is on the page. */
export function SourcePanel({ claim, evidence }: { claim: Claim; evidence: Evidence }) {
  const text = sourceText(evidence.url);
  const quote = claim.quotes?.find(q => text && findQuote(text, q)) ?? claim.quotes?.[0];
  const range = text && quote ? findQuote(text, quote) : null;
  const [full, setFull] = useState(false);
  const mark = useRef<HTMLElement>(null);
  useEffect(() => { mark.current?.scrollIntoView({ block: "center" }); }, [full, claim.id]);

  let body = null;
  if (text && range) {
    const start = full ? 0 : Math.max(0, range[0] - CONTEXT);
    const end = full ? text.length : Math.min(text.length, range[1] + CONTEXT);
    body = <p className="source-text">{start > 0 && "… "}{text.slice(start, range[0])}<mark ref={mark}>{text.slice(range[0], range[1])}</mark>{text.slice(range[1], end)}{end < text.length && " …"}</p>;
  } else if (text) {
    body = <p className="source-text">{text.slice(0, full ? undefined : 1500)}{!full && text.length > 1500 && " …"}</p>;
  }

  return <div className="space-y-5">
    <div>
      <ClaimBadge type={claim.type}/>
      <p className="mt-3 text-[15px] leading-6 font-medium">{claim.value}</p>
      <p className="mt-1 text-xs text-ink-soft">Claim {claim.id}</p>
    </div>
    <div className="source-card">
      <div className="text-sm font-semibold">{evidence.title ?? evidence.url}</div>
      <a className="link text-xs break-all" href={evidence.url} target="_blank" rel="noreferrer">{evidence.url}<ExternalLink size={12}/></a>
      <div className="mt-1 text-xs text-ink-soft">{evidence.publisher} · retrieved {evidence.retrievedAt}{evidence.publishedAt && ` · published ${evidence.publishedAt}`}</div>
    </div>
    {range ? <p className="verifier-note ok">The verifier found this quote word-for-word on the page, retrieved {evidence.retrievedAt}.</p>
      : quote ? <p className="verifier-note warn">The quote could not be located in the stored page text. Open the source to check.</p>
      : <p className="verifier-note">This claim has no quote of its own. {claim.type === "inferred" || claim.type === "user_confirmed" ? "It is reasoned from other claims." : ""}</p>}
    {body ? <div>
      <div className="flex items-center justify-between"><span className="eyebrow">Page text as fetched</span><button className="link text-xs" onClick={() => setFull(!full)}>{full ? "Show excerpt" : "Show full page"}</button></div>
      {body}
    </div> : <p className="text-xs text-ink-soft">The page text is not stored for this source.</p>}
  </div>;
}
