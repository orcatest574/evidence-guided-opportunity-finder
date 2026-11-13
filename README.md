# Virtual Science Park

Hackathon prototype for Blue Science Park (BUILD Hackathon 2026).

## Run

```sh
<<<<<<< HEAD
git clone <this-repository-url>
cd <repository-name>
npm i --legacy-peer-deps
=======
npm install
>>>>>>> 570775dea3288a1767065b18550376052a184887
npm run dev
```

Demo login (hardcoded, simulated): `demo` / `bluepark2026`

## Data

No database. All data comes from JSON files:

- `src/data/companies/*.json` – one file per company. Add a file and it appears in the app.
- `src/data/opportunities.json` – list of opportunities (testing, funding, events …).

Profile edits and saved opportunities are stored in the browser (localStorage).

## Simulated parts

- Login is a hardcoded demo account checked in the browser.
- The innovation assistant is rule-based (no LLM).
