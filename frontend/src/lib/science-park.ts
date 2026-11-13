import opportunityData from "@/data/opportunities.json";

// ---- Company data: one JSON file per company in src/data/companies/ ----
export type Evidence = { url: string; quote?: string; retrieved: string };
export type Claim = { value: string; status: string; evidence: Evidence[]; note?: string | null };
type CompanyFile = {
  company_id: string;
  name: string;
  profile: Record<string, Claim[] | string | undefined> & { last_updated?: string };
  source_register?: { name: string; url: string; source_type?: string }[];
  data_quality_notes?: string[];
};

export const sectionLabels: Record<string, string> = {
  what_they_do: "What they do",
  technologies: "Technologies & expertise",
  application_areas: "Application areas",
  markets_customers: "Markets & customers",
  geography: "Geography",
  stated_priorities: "Stated priorities & projects",
};

export type Company = {
  id: string; name: string; initials: string; summary: string; lastUpdated: string;
  sections: { key: string; label: string; claims: Claim[] }[];
  sources: { name: string; url: string }[];
  notes: string[];
  topics: string[];   // inferred until the user refines them
  priority: string;
};

// ---- Opportunity data: src/data/opportunities.json ----
export type Opportunity = { id: string; type: string; title: string; description: string; source: string; url: string; topics: string[]; date: string; location: string; nextStep: string; caveat: string };
export const opportunities = opportunityData as Opportunity[];
export const allTopics = [...new Set(opportunities.flatMap(o => o.topics))];

function toCompany(file: CompanyFile): Company {
  const sections = Object.entries(file.profile)
    .filter((e): e is [string, Claim[]] => Array.isArray(e[1]))
    .map(([key, claims]) => ({ key, label: sectionLabels[key] ?? key.replace(/_/g, " "), claims }));
  const text = sections.flatMap(s => s.claims.map(c => c.value)).join(" ").toLowerCase();
  return {
    id: file.company_id,
    name: file.name,
    initials: file.name.slice(0, 1).toUpperCase(),
    summary: sections.find(s => s.key === "what_they_do")?.claims[0]?.value ?? "",
    lastUpdated: typeof file.profile.last_updated === "string" ? file.profile.last_updated : "",
    sections,
    sources: file.source_register ?? [],
    notes: file.data_quality_notes ?? [],
    topics: allTopics.filter(t => text.includes(t.toLowerCase())),
    priority: "Exploration",
  };
}

const files = import.meta.glob<CompanyFile>("../data/companies/*.json", { eager: true, import: "default" });
export const companies: Company[] = Object.values(files).map(toCompany).sort((a, b) => a.name.localeCompare(b.name));

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
