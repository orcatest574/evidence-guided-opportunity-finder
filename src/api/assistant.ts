export interface AssistantResponse {
  company_name: string;
  question: string;
  answer: string;
}

const DEFAULT_BASE = "http://127.0.0.1:8000";
const BASE = (import.meta.env.VITE_API_URL as string) || (import.meta.env.NEXT_PUBLIC_API_URL as string) || DEFAULT_BASE;

export async function askAssistant(question: string, companyName: string): Promise<string> {
  const url = `${BASE.replace(/\/$/, "")}/assistant`;
  const body = JSON.stringify({ question, company_name: companyName });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  let data: any;
  try {
    data = await res.json();
  } catch (e) {
    if (!res.ok) throw new Error("Something went wrong");
  }

  if (!res.ok) {
    const detail = data?.detail ?? data?.message ?? "Something went wrong";
    throw new Error(detail);
  }

  // Validate shape minimally
  if (!data || typeof data.answer !== "string") throw new Error("Invalid assistant response");

  return data.answer;
}
