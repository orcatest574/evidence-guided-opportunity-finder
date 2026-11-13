import opportunityData from "@/data/opportunities.json";

// ---- Company data: one JSON file per company in src/data/companies/ (schema v1.1) ----
export type Evidence = { id: string; url: string; title?: string; publisher?: string; publishedAt?: string; retrievedAt: string; verification?: string; supports?: string; quotes?: string[]; freshnessWarning?: string };
type RawClaim = { id: string; value: string; type: string; confidence?: string; claimEvidence?: string[]; basedOnClaims?: string[]; reasoning?: string; note?: string; correctionNote?: string; quotes?: string[] };
export type Claim = RawClaim & { evidence: Evidence[] };
type CompanyFile = {
  company: { id: string; name: string; website?: string };
  summary?: { text: string };
  evidence?: Evidence[];
  matchingProfile?: { topics?: { topic: string }[] };
  missing?: { field: string; reason: string }[];
  uncertaintiesAndConflicts?: { topic: string; detail: string }[];
  metadata?: { createdAt?: string };
  [section: string]: unknown;
};

export const sectionLabels: Record<string, string> = {
  whatTheyDo: "What they do",
  technologies: "Technologies & expertise",
  applicationAreas: "Application areas",
  markets: "Markets & customers",
  geography: "Geography",
  statedPriorities: "Stated priorities & projects",
  collaborations: "Collaborations",
  inferredInterests: "Inferred interests (not confirmed priorities)",
};

export type Company = {
  id: string; name: string; initials: string; website: string; summary: string; lastUpdated: string;
  sections: { key: string; label: string; claims: Claim[] }[];
  sources: Evidence[];
  notes: string[];
  topics: string[];   // inferred until the user refines them
  priority: string;
};

// ---- Opportunity data: src/data/opportunities.json ----
export type Opportunity = { id: string; type: string; title: string; description: string; source: string; url: string; topics: string[]; date: string; location: string; nextStep: string; caveat: string };
export const opportunities = opportunityData as Opportunity[];

function toCompany(file: CompanyFile): Company {
  const evidence = file.evidence ?? [];
  const sections = Object.keys(sectionLabels)
    .filter(key => Array.isArray(file[key]) && (file[key] as RawClaim[]).length > 0)
    .map(key => ({ key, label: sectionLabels[key]!, claims: (file[key] as RawClaim[]).map(c => ({ ...c, evidence: evidence.filter(e => c.claimEvidence?.includes(e.id)) })) }));
  return {
    id: file.company.id,
    name: file.company.name,
    initials: file.company.name.slice(0, 1).toUpperCase(),
    website: file.company.website ?? "",
    summary: file.summary?.text ?? "",
    lastUpdated: file.metadata?.createdAt ?? "",
    sections,
    sources: evidence,
    notes: [...(file.missing ?? []).map(m => `Missing – ${m.field}: ${m.reason}`), ...(file.uncertaintiesAndConflicts ?? []).map(u => `Uncertain – ${u.topic}: ${u.detail}`)],
    topics: (file.matchingProfile?.topics ?? []).map(t => t.topic),
    priority: "Exploration",
  };
}

const files = import.meta.glob<CompanyFile>("../data/companies/*.json", { eager: true, import: "default" });
export const companies: Company[] = Object.values(files).map(toCompany).sort((a, b) => a.name.localeCompare(b.name));
export const allTopics = [...new Set([...opportunities.flatMap(o => o.topics), ...companies.flatMap(c => c.topics)])];

// ---- Matching ----
export function matchScore(company: Company, opportunity: Opportunity) {
  const shared = opportunity.topics.filter(topic => company.topics.includes(topic)).length;
  return Math.min(98, 35 + shared * 14 + (company.priority === opportunity.type ? 20 : 0));
}
export function rankedOpportunities(company: Company) {
  return [...opportunities].sort((a, b) => matchScore(company, b) - matchScore(company, a));
}

// ---- Service boundaries ----
export function classifyRequest(message: string): "override" | "private" | "relevant" | "unrelated" | "clarify" {
  if (/ignore\s+(all\s+)?(previous|your|the|prior)|override|system\s*prompt|developer\s*message|pretend\s+(you|to)|act\s+as|forget\s+(your|all)|new\s+role/i.test(message)) return "override";
  if (/confidential|non.public|private|other\s+compan.*(chat|profile)|reveal.*(interaction|conversation)/i.test(message)) return "private";
  if (/fund|grant|testbed|testing|test\b|research|partner|collaborat|innovati|opportunit|company|profile|science\s*park|vinnova|rise|technology|marine|network|event|market|material|corrosion|eligib|recommend|deadline/i.test(message)) return "relevant";
  if (companies.some(c => message.toLowerCase().includes(c.name.toLowerCase()))) return "relevant";
  if (/recipe|poem|weather|football|horoscope|dating|vacation|joke|pizza|movie/i.test(message)) return "unrelated";
  return "clarify";
}
export function boundaryReply(kind: ReturnType<typeof classifyRequest>) {
  if (kind === "override") return "I can’t change my role or override the service’s boundaries. I support innovation, business development and collaboration within Blue Science Park. Would you like to explore a testing opportunity or funding programme?";
  if (kind === "private") return "I can’t disclose another company’s non-public profile or conversations. I can help you explore public expertise and potential collaboration topics instead.";
  if (kind === "unrelated") return "My remit is innovation, business development and collaboration in the science park ecosystem. I can help you find testing environments, funding, relevant events or potential partners.";
  return "How does your request relate to your company’s technology, business development or collaboration needs?";
}
