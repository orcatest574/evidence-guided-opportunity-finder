import { postJson } from "./client";

export interface AssistantResponse { company_name: string; question: string; answer: string }

/** Asks the AI assistant agent. `companyId` is the profile id, e.g. "nkt". */
export async function askAssistant(question: string, companyId: string): Promise<string> {
  const data = await postJson<AssistantResponse>("/assistant", { question, company_name: companyId });
  if (typeof data?.answer !== "string") throw new Error("Invalid assistant response");
  return data.answer;
}
