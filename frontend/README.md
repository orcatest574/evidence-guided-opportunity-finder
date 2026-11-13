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

Demo accounts: `staff` (Blue Science Park staff) and `nkt`, `ericsson`, `roxtec` (member companies).

| View | Who | What it shows |
|---|---|---|
| **Company profile** | Member (own company), staff (read-only) | Hero with logo, summary, and tabs per section. Each claim is *Verified*, *Inferred* or *Unverified*; click a source to see the quote highlighted in the page text. Members confirm or remove claims and add their own interests. |
| **Opportunities** | Member | Testbeds, funding and events from public sources, most relevant first, with “Strong/Possible match” and the reason. |
| **Opportunities** | Staff | All opportunities with the members each one is relevant to. |
| **Members** | Staff | Every profiled member as a card with logo; click to open the profile. |
| **Ecosystem** | Staff | Shared themes across members and suggested connections with the claims behind them. |
| **Innovation assistant** | Member | Rule-based question box that classifies each question (in scope, out of scope, override attempt, private data, needs a human, unclear) before answering. |

## How it works

| Part | Where | AI? |
|---|---|---|
| Company profiles – facts with verbatim quotes, inferred interests, gaps | `src/data/companies/*.json` | No (static data) |
| Opportunities – testbeds, funding, events with links and dates | `src/data/opportunities.json` | No (static data) |
| Matching – ranks and explains opportunities per company | `src/lib/science-park.ts` | No |
| Boundary check – classifies questions to the assistant | `src/lib/science-park.ts` | No |

## Data

No database. All data is JSON:

- `src/data/companies/*.json` – one profile per company (schema v1.1). Add a file and the company appears.
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
