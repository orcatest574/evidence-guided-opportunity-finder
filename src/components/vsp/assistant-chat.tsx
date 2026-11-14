import { useEffect, useRef, useState } from "react";
import { Send, RefreshCw } from "lucide-react";
import { askAssistant } from "@/api/assistant";

type Msg = { id: number; role: "user" | "assistant" | "error"; text: string };

export function AssistantChat({ companyName }: { companyName: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const idRef = useRef(1);

  // reset conversation when companyName changes
  useEffect(() => {
    setMessages([]);
    setInput("");
    setLastQuestion(null);
    setLoading(false);
  }, [companyName]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  function pushMessage(m: Omit<Msg, "id">) {
    const msg = { ...m, id: idRef.current++ };
    setMessages((s) => [...s, msg]);
    return msg.id;
  }

  async function sendQuestion(text: string) {
    const q = text.trim();
    if (!q) return;
    // push user
    pushMessage({ role: "user", text: q });
    setLastQuestion(q);
    setInput("");
    // push typing placeholder
    const typingId = pushMessage({ role: "assistant", text: "Thinking..." });
    setLoading(true);

    try {
      const answer = await askAssistant(q, companyName);
      // replace typing with answer
      setMessages((prev) => prev.map(m => m.id === typingId ? { ...m, text: answer, role: "assistant" } : m));
    } catch (err: any) {
      const detail = err?.message ?? "Something went wrong";
      const is404 = /not found|no profile|404/i.test(detail);
      const text = is404 ? `No profile found for ${companyName}` : detail;
      setMessages((prev) => prev.map(m => m.id === typingId ? { ...m, text, role: "error" } : m));
    } finally {
      setLoading(false);
    }
  }

  function resendLast() {
    if (!lastQuestion) return;
    sendQuestion(lastQuestion);
  }

  return (
    <div className="ask">
      <p className="panel-help">Ask about testing, funding, events or partners for <strong>{companyName}</strong>.</p>
      <div className="ask-log" style={{ maxHeight: "40vh", overflow: "auto" }}>
        {messages.map((m) => (
          <div key={m.id} className={`ask-msg ${m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "error"}`} data-role={m.role}>
            {m.role === "error" ? (
              <>
                <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
                <div className="mt-2 flex gap-2">
                  <button className="btn" onClick={resendLast} aria-label="Try again"><RefreshCw size={14}/> Try again</button>
                </div>
              </>
            ) : (
              <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="flex gap-2 mt-3" onSubmit={(e) => { e.preventDefault(); if (!loading) sendQuestion(input); }}>
        <input
          className="text-input"
          aria-label="Your question"
          placeholder="Ask a question…"
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!loading) sendQuestion(input); } }}
        />
        <button className="btn primary" type="submit" disabled={loading} aria-label="Send"><Send size={15}/></button>
      </form>
    </div>
  );
}

export default AssistantChat;
