# Virtual Science Park

Hackathon prototype for Blue Science Park (BUILD Hackathon 2026): verified company profiles,
matched with testing environments, funding and events – every claim traceable to its source.

## Run

```sh
git clone git@github.com:orcatest574/evidence-guided-opportunity-finder.git
cd evidence-guided-opportunity-finder
npm install --legacy-peer-deps
npm run dev
```

Demo login (hardcoded, simulated): `demo` / `bluepark2026`

## Views

| View | What it shows |
|---|---|
| **Profile** | Baseline profile per company. Each claim is *Verified* (quote found on the source page), *Inferred* (our reasoning) or *Unverified*. Click a source to see the quote highlighted in the fetched page text. Users confirm or remove claims, set a priority and add interests. |
| **Opportunities** | Testing, funding and events from public sources, ranked per company. Every score is explained. Changing the priority re-ranks the list live. |
| **Ecosystem** | For Blue Science Park staff: theme map across members, suggested connections with the claims behind them, and which members each opportunity is relevant to. |
| **Ask** | Rule-based question box that classifies each question (in scope, out of scope, override attempt, private data, needs a human, unclear) before answering. |

## Agents

| Agent | Where | AI? |
|---|---|---|
| Profiler – fetches public pages and extracts claims with quotes | `backend/profiler/` (see `backend/README.md`) | Yes (Azure OpenAI) |
| Verifier – checks every quote against the page text | `backend/profiler/verifier.py` | No |
| Matcher – ranks and explains opportunities | `src/lib/science-park.ts` | No |
| Boundary check – classifies questions | `src/lib/science-park.ts` | No |

## Data

No database. All data is JSON:

- `src/data/companies/*.json` – profiles written by the profiler (`--publish`).
- `src/data/sources/*.json` – fetched page text, used to highlight quotes.
- `src/data/opportunities.json` – curated opportunities with source, retrieval date and verification level.

Profile edits and saved opportunities are stored in the browser (localStorage).

## Simulated parts

- Login is a hardcoded demo account checked in the browser.
- Edits are stored only in the browser.
- The question box is rule-based (no AI model).
- Opportunities are curated snapshots from 2026-11-13; some details come from search results and are marked as such.

## Tests

```sh
npm test
```

Covers profile evidence, quote highlighting, two or more sources, different rankings per company, the effect of refinements and all service-boundary cases.
