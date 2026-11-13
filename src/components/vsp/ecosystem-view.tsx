import { THEMES, companies, emptyEdits, rankOpportunities, suggestedConnections, themeClaims } from "@/lib/science-park";
import { TypeTag } from "./ui";

/** View for Blue Science Park staff: shared interests across members, possible connections and opportunity reach. */
export function EcosystemView({ onOpenCompany }: { onOpenCompany: (id: string) => void }) {
  const matrix = companies.map(c => ({ company: c, cells: THEMES.map(t => themeClaims(c.claims, t)) }));
  const max = Math.max(1, ...matrix.flatMap(r => r.cells.map(c => c.length)));
  const shared = THEMES.map((t, i) => ({ theme: t.name, members: matrix.filter(r => r.cells[i]!.length > 0).map(r => r.company.name) })).filter(s => s.members.length >= 2);
  const connections = suggestedConnections();
  const reach = rankOpportunities([], emptyEdits).map(({ opportunity }) => ({
    opportunity,
    members: companies.filter(c => (rankOpportunities(c.claims, emptyEdits).find(m => m.opportunity.id === opportunity.id)?.score ?? 0) >= 40).map(c => c.name),
  })).filter(r => r.members.length > 0).sort((a, b) => b.members.length - a.members.length);

  return <div>
    <header className="page-head">
      <div>
        <div className="eyebrow">For Blue Science Park staff</div>
        <h1 className="display">Ecosystem</h1>
        <p className="lede">Shared interests across {companies.length} profiled members, built only from public, verified claims. In production this covers all 40+ members.</p>
      </div>
    </header>

    <section className="panel">
      <h3 className="panel-title">Theme map</h3>
      <p className="panel-help">Number of verified or inferred claims per member that mention each theme.</p>
      <div className="heat-wrap">
        <table className="heat">
          <thead><tr><th/>{THEMES.map(t => <th key={t.name}><span>{t.name}</span></th>)}</tr></thead>
          <tbody>{matrix.map(r => <tr key={r.company.id}>
            <th><button className="link" onClick={() => onOpenCompany(r.company.id)}>{r.company.name}</button></th>
            {r.cells.map((cell, i) => <td key={i} title={cell.map(c => `${c.id}: ${c.value}`).join("\n")} style={{ ["--heat" as string]: cell.length / max }}>{cell.length || ""}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      {shared.length > 0 && <p className="mt-4 text-sm">Shared by several members: {shared.map(s => <span key={s.theme} className="chip static">{s.theme} · {s.members.join(", ")}</span>)}</p>}
    </section>

    <div className="eco-grid">
      <section className="panel">
        <h3 className="panel-title">Suggested connections</h3>
        <p className="panel-help">Based on overlapping public claims. Neither company has expressed an interest in collaborating.</p>
        {connections.map(c => <article key={c.a.id + c.b.id} className="connection">
          <div className="connection-head">{c.a.name} <span className="text-ink-soft">↔</span> {c.b.name}</div>
          {c.themes.slice(0, 3).map(t => <div key={t.name} className="connection-theme">
            <strong>{t.name}</strong>
            <p><span className="ref">{t.aClaims[0]!.id}</span> {c.a.name}: {t.aClaims[0]!.value}</p>
            <p><span className="ref">{t.bClaims[0]!.id}</span> {c.b.name}: {t.bClaims[0]!.value}</p>
          </div>)}
        </article>)}
      </section>

      <section className="panel">
        <h3 className="panel-title">Opportunity reach</h3>
        <p className="panel-help">Which members each opportunity is relevant to (score ≥ 40 on the baseline profile). Useful for joint information sessions.</p>
        <ul className="reach-list">{reach.map(r => <li key={r.opportunity.id}>
          <div className="flex items-center gap-2"><TypeTag type={r.opportunity.type}/><span className="font-medium">{r.opportunity.title}</span></div>
          <div className="text-xs text-ink-soft">{r.members.join(", ")}</div>
        </li>)}</ul>
      </section>
    </div>
  </div>;
}
