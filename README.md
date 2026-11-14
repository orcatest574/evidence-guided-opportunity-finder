# Virtual Science Park

Hackathon prototype for Blue Science Park (BUILD Hackathon 2026): verified company profiles,
matched with testing environments, funding and events – every claim traceable to its source.

## Run

Two terminals. The AI settings (`API_KEY`, `AI_URL`, `MODEL_NAME`) go in `.env` in the repo root – never commit it.

```sh
# 1) Backend – AI agents (FastAPI, port 8000)
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn api:app --port 8000

# 2) Frontend
npm install --legacy-peer-deps
npm run dev
```

The app works without the backend; only the assistant and the live search need it.

Demo accounts: `staff` (Blue Science Park staff) and `nkt`, `ericsson`, `roxtec` (member companies).

| View | Who | What it shows |
|---|---|---|
| **Company profile** | Member (own company), staff (read-only) | Hero with logo, summary, and tabs per section. Each claim is *Verified*, *Inferred* or *Unverified*; click a source to see the quote highlighted in the page text. Members confirm or remove claims and add their own interests. |
| **Opportunities** | Member | Curated testbeds, funding and events, most relevant first, with “Strong/Possible match” and the reason – plus live results from the AI search agent, marked unverified. |
| **Opportunities** | Staff | All opportunities with the members each one is relevant to. |
| **Members** | Staff | Every profiled member as a card with logo; click to open the profile. |
| **Ecosystem** | Staff | Shared themes across members and suggested connections with the claims behind them. |
| **Innovation assistant** | Member, staff | Each question is first classified by fixed rules (in scope, out of scope, override attempt, private data, needs a human). Only in-scope questions go to the AI assistant agent. |

## How it works

| Part | Where | AI? |
|---|---|---|
| Company profiles – facts with verbatim quotes, inferred interests, gaps | `src/data/companies/*.json` (read by frontend and backend) | No (static data) |
| Opportunities – testbeds, funding, events with links and dates | `src/data/opportunities.json` | No (static data) |
| Matching – ranks and explains opportunities per company | `src/lib/science-park.ts` | No |
| Boundary check – classifies every question before the AI sees it | `src/lib/science-park.ts`, `src/components/vsp/assistant-chat.tsx` | No |
| Profiling agent – fetches a member's public pages, extracts facts with verbatim quotes and inferred interests, verifies every quote against the page text | `backend/profiler/` (run `python -m profiler`) | Yes (extraction), no (verification) |
| Assistant agent – answers in-scope questions from the profile | `backend/api.py` `POST /assistant`, `backend/assistent_agent.py` | Yes |
| Search agent – finds upcoming events, testbeds and funding on the web | `backend/api.py` `POST /events`, `backend/collector_agent.py`, `backend/tools.py` | Yes |

## Profiling agent

Builds the baseline profiles in `src/data/companies/` from public web pages.

```sh
cd backend
.venv/bin/python -m profiler --all --dry-run   # fetch pages only, no AI cost
.venv/bin/python -m profiler roxtec            # one company -> backend/output/roxtec.json
.venv/bin/python -m profiler --all --publish   # all members -> src/data/companies/ and src/data/sources/
```

Steps: fetch seed URLs from `backend/members.json` plus same-site pages → AI extraction (facts with verbatim quotes, inferred interests, gaps) → plain-code verifier (removes quotes not found on the page, downgrades unsupported facts to “unverified”) → v1.1 JSON.
`--publish` keeps hand-added fields such as `logo` and `background`, and does not overwrite a profile with `metadata.lastEditedByUser: true` unless `--force` is given.
To add a member: add `id`, `name`, `website` and a few `seed_urls` to `backend/members.json`.

## Data

No database. All data is JSON:

- `src/data/companies/*.json` – one profile per company (schema v1.1). Add a file and the company appears.
- `src/data/sources/*.json` – fetched page text, used to highlight quotes.
- `src/data/opportunities.json` – curated opportunities with source, retrieval date and verification level.

Profile edits and saved opportunities are stored in the browser (localStorage).

## Simulated parts

- Login is a hardcoded demo account checked in the browser.
- Edits are stored only in the browser.
- Live search results are AI-generated and marked unverified; they are cached per company and day.
- Opportunities are curated snapshots from 2026-11-13; some details come from search results and are marked as such.

## Tests

```sh
npm test
```

Covers profile evidence, quote highlighting, two or more sources, different rankings per company, the effect of refinements and all service-boundary cases.
