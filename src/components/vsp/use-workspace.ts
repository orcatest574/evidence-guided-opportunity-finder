import { useEffect, useState } from "react";
import { emptyEdits, type Edits } from "@/lib/science-park";

// Everything the user changes is stored in this browser only (simulated persistence).
const KEY = "vsp-workspace-v2";

type Workspace = { edits: Record<string, Edits>; saved: string[]; dismissed: string[] };
const empty: Workspace = { edits: {}, saved: [], dismissed: [] };

export function useWorkspace() {
  const [ws, setWs] = useState<Workspace>(empty);
  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); if (raw) setWs({ ...empty, ...(JSON.parse(raw) as Workspace) }); } catch { /* ignore */ }
  }, []);
  function update(next: Workspace) {
    setWs(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }
  return {
    editsFor: (companyId: string): Edits => ({ ...emptyEdits, ...ws.edits[companyId] }),
    setEdits: (companyId: string, edits: Edits) => update({ ...ws, edits: { ...ws.edits, [companyId]: edits } }),
    resetEdits: (companyId: string) => { const { [companyId]: _, ...rest } = ws.edits; update({ ...ws, edits: rest }); },
    saved: ws.saved,
    toggleSaved: (id: string) => update({ ...ws, saved: ws.saved.includes(id) ? ws.saved.filter(x => x !== id) : [...ws.saved, id] }),
    dismissed: ws.dismissed,
    dismiss: (id: string) => update({ ...ws, dismissed: [...ws.dismissed, id] }),
    restoreDismissed: () => update({ ...ws, dismissed: [] }),
  };
}
