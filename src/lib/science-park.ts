import opportunityData from "@/data/opportunities.json";

// =====================================================================
// Company profiles: src/data/companies/*.json (schema v1.1, written by the profiler agent)
// Source page texts: src/data/sources/*.json  ({ url: text }) for quote highlighting
// =====================================================================

export type Evidence = { id: string; url: string; title?: string; publisher?: string; publishedAt?: string; retrievedAt: string; verification?: string; evidenceKind?: string };
export type ClaimType = "fact" | "inferred" | "unverified" | "user_confirmed";
type RawClaim = { id: string; value: string; type: ClaimType; confidence?: string; claimEvidence?: string[]; basedOnClaims?: string[]; reasoning?: string; note?: string; quotes?: string[] };
export type Claim = RawClaim & { section: string; evidence: Evidence[] };

type CompanyFile = {
  company: { id: string; name: string; website?: string };
  summary?: { text: string };
  evidence?: Evidence[];
  matchingProfile?: { topics?: { topic: string; weight: number }[] };
  missing?: { field: string; reason: string }[];
  uncertaintiesAndConflicts?: { topic: string; detail: string }[];
  metadata?: { createdAt?: string; createdBy?: string; pagesFetched?: number; verificationWarnings?: string[] };
  [section: string]: unknown;
};

export const SECTIONS: { key: string; label: string }[] = [
  { key: "whatTheyDo", label: "What they do" },
  { key: "technologies", label: "Technologies & expertise" },
  { key: "applicationAreas", label: "Application areas" },
  { key: "markets", label: "Markets & customers" },
  { key: "geography", label: "Geography" },
  { key: "statedPriorities", label: "Stated priorities & projects" },
  { key: "collaborations", label: "Collaborations" },
  { key: "inferredInterests", label: "Inferred interests" },
];

export type Company = {
  id: string; name: string; website: string; summary: string; createdAt: string; createdBy: string; pagesFetched: number;
  claims: Claim[];
  evidence: Evidence[];
  topics: { topic: string; weight: number }[];
  missing: { field: string; reason: string }[];
  uncertainties: { topic: string; detail: string }[];
  verifierLog: string[];
};

function toCompany(file: CompanyFile): Company {
  const evidence = file.evidence ?? [];
  const claims = SECTIONS.flatMap(({ key }) =>
    ((file[key] as RawClaim[] | undefined) ?? []).map(c => ({ ...c, section: key, evidence: evidence.filter(e => c.claimEvidence?.includes(e.id)) })),
  );
  return {
    id: file.company.id,
    name: file.company.name,
    website: file.company.website ?? "",
    summary: file.summary?.text ?? "",
    createdAt: file.metadata?.createdAt ?? "",
    createdBy: file.metadata?.createdBy ?? "",
    pagesFetched: file.metadata?.pagesFetched ?? evidence.length,
    claims,
    evidence,
    topics: file.matchingProfile?.topics ?? [],
    missing: file.missing ?? [],
    uncertainties: file.uncertaintiesAndConflicts ?? [],
    verifierLog: file.metadata?.verificationWarnings ?? [],
  };
}

const companyFiles = import.meta.glob<CompanyFile>("../data/companies/*.json", { eager: true, import: "default" });
export const companies: Company[] = Object.values(companyFiles).map(toCompany).sort((a, b) => a.name.localeCompare(b.name));

const sourceFiles = import.meta.glob<Record<string, string>>("../data/sources/*.json", { eager: true, import: "default" });
const sourceTexts: Record<string, string> = Object.assign({}, ...Object.values(sourceFiles));
export const sourceText = (url: string): string | undefined => sourceTexts[url];

// =====================================================================
// Opportunities: src/data/opportunities.json
// =====================================================================

export type OpportunityType = "Testing" | "Funding" | "Event";
export type Opportunity = {
  id: string; type: OpportunityType; title: string; organiser: string; source: string; url: string; summary: string;
  audience: string; format: string; location: string;
  status: "open" | "closed" | "upcoming" | "by-arrangement" | "recurring";
  dates: { label: string; value: string }[];
  deadline?: string;
  eligibility: string[]; nextStep: string; caveat: string; keywords: string[];
  retrievedAt: string; verification: "page-checked" | "search-snippet";
};
export const opportunities = opportunityData as Opportunity[];
export const TODAY = "2026-11-13";

export function statusLabel(o: Opportunity): string {
  if (o.status === "by-arrangement") return "Available by arrangement";
  if (o.status === "recurring") return "Recurring";
  if (o.status === "closed") return "Closed · watch next round";
  if (o.status === "upcoming") return "Upcoming · date to confirm";
  if (o.deadline) {
    const days = Math.round((Date.parse(o.deadline) - Date.parse(TODAY)) / 86_400_000);
    return days < 0 ? "Open" : days <= 14 ? `Closes in ${days} days` : `Open until ${o.deadline}`;
  }
  return "Open";
}

// =====================================================================
// User refinements (stored in the browser per company)
// =====================================================================

export type Focus = "All" | OpportunityType;
export type Edits = { hidden: string[]; confirmed: string[]; interests: string[]; focus: Focus };
export const emptyEdits: Edits = { hidden: [], confirmed: [], interests: [], focus: "All" };

/** The profile as the user sees it: hidden claims removed, confirmed interests marked. */
export function effectiveClaims(company: Company, edits: Edits): Claim[] {
  return company.claims
    .filter(c => !edits.hidden.includes(c.id))
    .map(c => (edits.confirmed.includes(c.id) ? { ...c, type: "user_confirmed" as const } : c));
}

// =====================================================================
// Matching: deterministic and explainable
// =====================================================================

export type Match = {
  opportunity: Opportunity;
  score: number;
  keywordHits: { keyword: string; claimIds: string[] }[];
  interestHits: string[];
  focusBonus: boolean;
  closedPenalty: boolean;
};

const containsWord = (text: string, keyword: string) => new RegExp(`(^|[^a-z0-9])${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(text);

export function matchOpportunity(claims: Claim[], edits: Edits, opportunity: Opportunity): Match {
  const keywordHits = opportunity.keywords
    .map(keyword => ({ keyword, claimIds: claims.filter(c => c.type !== "unverified" && containsWord(c.value, keyword)).map(c => c.id) }))
    .filter(h => h.claimIds.length > 0);
  const interestHits = edits.interests.filter(i => opportunity.keywords.some(k => containsWord(i, k) || containsWord(k, i)) || containsWord(`${opportunity.title} ${opportunity.summary}`, i));
  const focusBonus = edits.focus !== "All" && edits.focus === opportunity.type;
  const closedPenalty = opportunity.status === "closed";
  const score = Math.max(0, Math.min(100,
    10 + Math.min(4, keywordHits.length) * 15 + Math.min(2, interestHits.length) * 15 + (focusBonus ? 25 : 0) - (closedPenalty ? 20 : 0)));
  return { opportunity, score, keywordHits, interestHits, focusBonus, closedPenalty };
}

/** Plain-language match level instead of a number. */
export function matchLevel(score: number): "Strong match" | "Possible match" | null {
  return score >= 55 ? "Strong match" : score >= 40 ? "Possible match" : null;
}

/** Members an opportunity is relevant to, on their baseline profiles (used in the staff view). */
export function relevantMembers(opportunity: Opportunity): Company[] {
  return companies.filter(c => matchOpportunity(c.claims, emptyEdits, opportunity).score >= 40);
}

export const logoUrl = (companyId: string) => `/logos/${companyId}.png`;

export function rankOpportunities(claims: Claim[], edits: Edits): Match[] {
  return opportunities.map(o => matchOpportunity(claims, edits, o)).sort((a, b) => b.score - a.score || a.opportunity.title.localeCompare(b.opportunity.title));
}

// =====================================================================
// Ecosystem view for Blue Science Park staff
// =====================================================================

export const THEMES: { name: string; keywords: string[] }[] = [
  { name: "Offshore & wind energy", keywords: ["offshore", "wind", "hvdc", "subsea"] },
  { name: "Power grids & cables", keywords: ["grid", "high-voltage", "high voltage", "transmission", "cable", "power"] },
  { name: "Marine & naval", keywords: ["marine", "ship", "vessel", "naval", "maritime", "harbour", "ocean"] },
  { name: "Materials & testing", keywords: ["material", "insulation", "corrosion", "test", "polymer", "fire", "blast", "seal"] },
  { name: "Connectivity 5G/6G", keywords: ["5g", "6g", "network", "wireless", "radio", "telecom", "connectivity"] },
  { name: "AI & automation", keywords: ["ai", "automation", "autonomous", "machine learning", "digital twin", "agentic"] },
  { name: "Security & resilience", keywords: ["security", "cyber", "emc", "hemp", "resilien", "defence", "defense", "explosion"] },
  { name: "Sustainability", keywords: ["sustainab", "net-zero", "emission", "climate", "lca", "epd", "energy efficien", "science based"] },
];

export function themeClaims(claims: Claim[], theme: { keywords: string[] }): Claim[] {
  return claims.filter(c => c.type !== "unverified" && theme.keywords.some(k => containsWord(c.value, k)));
}

export type Connection = { a: Company; b: Company; themes: { name: string; aClaims: Claim[]; bClaims: Claim[] }[] };

export function suggestedConnections(): Connection[] {
  const result: Connection[] = [];
  for (let i = 0; i < companies.length; i++)
    for (let j = i + 1; j < companies.length; j++) {
      const a = companies[i]!, b = companies[j]!;
      const themes = THEMES.map(t => ({ name: t.name, aClaims: themeClaims(a.claims, t), bClaims: themeClaims(b.claims, t) }))
        .filter(t => t.aClaims.length > 0 && t.bClaims.length > 0)
        .sort((x, y) => y.aClaims.length + y.bClaims.length - (x.aClaims.length + x.bClaims.length));
      if (themes.length) result.push({ a, b, themes });
    }
  return result.sort((x, y) => y.themes.length - x.themes.length);
}

// =====================================================================
// Service boundaries for the question box (rule-based, no AI model)
// =====================================================================

export type RequestKind = "override" | "private" | "staff" | "relevant" | "unrelated" | "clarify";

export function classifyRequest(message: string): RequestKind {
  if (/ignore\s+(all\s+)?(previous|your|the|prior)|override|system\s*prompt|developer\s*message|pretend\s+(you|to)|act\s+as|forget\s+(your|all)|new\s+role|jailbreak/i.test(message)) return "override";
  if (/confidential|non.public|private|secret|other\s+compan.*(chat|profile|note|edit)|reveal.*(interaction|conversation)/i.test(message)) return "private";
  if (/eligib|qualif|guarantee|promise|commit|approve|will (you|bsp|blue science park) (fund|pay|sponsor)|legal advice|sign/i.test(message)) return "staff";
  if (/fund|grant|call|testbed|testing|test\b|lab|research|partner|collaborat|innovati|opportunit|event|conference|workshop|network|profile|recommend|deadline|match|science\s*park|vinnova|rise/i.test(message)) return "relevant";
  if (companies.some(c => message.toLowerCase().includes(c.name.toLowerCase()))) return "relevant";
  if (/recipe|poem|weather|football|horoscope|dating|vacation|holiday|joke|pizza|movie|homework|stock tip|bitcoin/i.test(message)) return "unrelated";
  return "clarify";
}

export const BSP_CONTACT = "https://www.bluesciencepark.se/";

export function boundaryReply(kind: Exclude<RequestKind, "relevant">): string {
  switch (kind) {
    case "override": return "I can't change my role or rules. I help member companies find testing environments, funding, events and potential partners within the Blue Science Park ecosystem. Try: “Which testing environments fit us?”";
    case "private": return "I can't share another company's non-public information, edits or conversations. I can show public expertise and suggested connections based on public sources.";
    case "staff": return "That needs a human decision. I can show potential matches and requirements, but formal eligibility, funding decisions and commitments are made by the funder or by Blue Science Park staff. Contact Blue Science Park to take it further.";
    case "unrelated": return "That's outside what this service does. I help with innovation, testing, funding, events and collaboration in the science park ecosystem. Try: “Which funding could fit us?”";
    case "clarify": return "Could you say how this relates to your company? For example: are you looking for a testbed, funding, an event or a partner?";
  }
}

export function intentType(message: string): OpportunityType | "Partner" | null {
  if (/test|lab|validat|pilot|demo/i.test(message)) return "Testing";
  if (/fund|grant|call|financ|money/i.test(message)) return "Funding";
  if (/event|conference|workshop|webinar|meet|network/i.test(message)) return "Event";
  if (/partner|collaborat|connect|member/i.test(message)) return "Partner";
  return null;
}

// =====================================================================
// Quote highlighting in source text
// =====================================================================

const fold = (s: string) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/ /g, " ").toLowerCase();

/** Returns [start, end] of the quote in the text, or null. Folding keeps string length, so indexes map back 1:1. */
export function findQuote(text: string, quote: string): [number, number] | null {
  const q = fold(quote.replace(/\s+/g, " ").trim().replace(/[.,;:]+$/, ""));
  const i = fold(text).indexOf(q);
  return i < 0 ? null : [i, i + q.length];
}
