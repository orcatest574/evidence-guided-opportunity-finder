# Profiler agent

Builds a baseline profile for each member company from public web pages and
verifies it before it reaches the app.

## Steps

| Step | Module | What it does | AI? |
|---|---|---|---|
| 1 | `fetcher.py` | Fetches the seed URLs in `members.json` plus same-site pages (about, products, industries …). Caches the text in `cache/`. | No |
| 2 | `extractor.py` | The AI model (Azure OpenAI, `MODEL_NAME` in `.env`) reads the pages and returns a structured draft: claims per section, verbatim quotes, source URLs, inferred interests with reasoning, missing info. Page text is treated as data, never as instructions. | Yes |
| 3 | `verifier.py` | Checks every quote against the fetched page text. Unknown URLs and quotes that are not found are removed. A fact with no verified quote becomes `unverified`. | No |
| 4 | `builder.py` | Writes the profile in the shared v1.1 format to `output/<id>.json`. | No |

`pipeline.py` runs the steps per company, `config.py` holds all settings.

## Setup

```sh
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

Put the AI settings in `.env` in the repo root (git-ignored, never commit it):

```
API_KEY=...
AI_URL=https://<resource>.openai.azure.com/openai/v1
MODEL_NAME=gpt-5-mini
```

## Run

```sh
.venv/bin/python -m profiler --all --dry-run   # fetch only, free
.venv/bin/python -m profiler nkt               # one company -> output/nkt.json
.venv/bin/python -m profiler --all --publish   # all, then copy to src/data/companies/
```

`--publish` does not overwrite a profile whose `metadata.lastEditedByUser` is true (use `--force`).

## Add a company

Add an entry to `members.json` with `id`, `name`, `website` and a few `seed_urls`.
