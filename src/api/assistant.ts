import { postJson } from "./client";

export interface AssistantResponse { company_name: string; question: string; answer: string }

export type HistoryMessage = { role: "user" | "assistant"; text: string };

/** Asks the AI assistant agent. `companyId` is the profile id, e.g. "nkt". `history` lets it answer follow-up questions. */
export async function askAssistant(question: string, companyId: string, history: HistoryMessage[] = []): Promise<string> {
  const data = await postJson<AssistantResponse>("/assistant", { question, company_name: companyId, history: history.slice(-6) });
  if (typeof data?.answer !== "string") throw new Error("Invalid assistant response");
  return data.answer;
}
