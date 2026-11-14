"""
api.py - FastAPI backend with two routes:

  POST /assistant  -> user question + company name -> reads profiles/<company>.json
                      -> assistent_agent (assisten.py) -> human friendly answer
  POST /events     -> company name (clicked in UI) -> collector_agent (collector.py,
                      uses web_search tool) -> 5 relevant events

Run:
  pip install fastapi uvicorn
  uvicorn api:app --reload --port 8000
"""

import asyncio
import inspect
import json
import re
from pathlib import Path
from typing import Any
from agents import Runner
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# --- Your agents -------------------------------------------------------------
# Adjust the names here if your files/objects are named differently.
from assistent_agent import assistent_agent
from collector_agent import collector_agent

PROFILES_DIR = Path(__file__).parent / "profiles"

app = FastAPI(title="Company Assistant API")

# Allow the TypeScript UI (dev server) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your UI origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request / response models -----------------------------------------------
class AssistantRequest(BaseModel):
    question: str = Field(..., min_length=1)
    company_name: str = Field(..., min_length=1)


class AssistantResponse(BaseModel):
    company_name: str
    question: str
    answer: str


class EventsRequest(BaseModel):
    company_name: str = Field(..., min_length=1)


class Event(BaseModel):
    title: str
    date: str | None = None
    location: str | None = None
    description: str | None = None
    url: str | None = None


class EventsResponse(BaseModel):
    company_name: str
    events: list[Event]


# --- Helpers -----------------------------------------------------------------
def slugify(name: str) -> str:
    """'Acme Corp' -> 'acme_corp'. Also blocks path traversal like '../x'."""
    slug = re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")
    if not slug:
        raise HTTPException(status_code=400, detail="Invalid company name")
    return slug


def load_profile(company_name: str) -> dict[str, Any]:
    """Read profiles/<company_name>.json (tries the raw name, then the slug)."""
    candidates = [PROFILES_DIR / f"{slugify(company_name)}.json"]
    raw = company_name.strip()
    if re.fullmatch(r"[\w\- ]+", raw):  # safe characters only
        candidates.insert(0, PROFILES_DIR / f"{raw}.json")
        candidates.insert(1, PROFILES_DIR / f"{raw.lower()}.json")

    for path in candidates:
        if path.is_file():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                raise HTTPException(status_code=500, detail=f"Profile file {path.name} is not valid JSON")

    raise HTTPException(status_code=404, detail=f"No profile found for '{company_name}'")

async def run_agent(agent, prompt: str, max_turns: int = 10) -> str:
    result = await Runner.run(agent, input=prompt, max_turns=max_turns)
    return str(result.final_output or "")

def extract_text(result: Any) -> str:
    """Normalise different agent return types to plain text."""
    if result is None:
        return ""
    if isinstance(result, str):
        return result
    for attr in ("output", "final_output", "content", "text", "response"):
        value = getattr(result, attr, None)
        if isinstance(value, str):
            return value
    if isinstance(result, dict):
        for key in ("output", "final_output", "content", "text", "response", "answer"):
            if isinstance(result.get(key), str):
                return result[key]
        return json.dumps(result)
    return str(result)


def parse_events(text: str) -> list[dict[str, Any]]:
    """Pull a JSON array of events out of the agent's text (handles ```json fences)."""
    cleaned = re.sub(r"```(?:json)?", "", text).strip()
    start, end = cleaned.find("["), cleaned.rfind("]")
    if start == -1 or end == -1 or end < start:
        # maybe {"events": [...]}
        try:
            data = json.loads(cleaned)
            if isinstance(data, dict) and isinstance(data.get("events"), list):
                return data["events"]
        except json.JSONDecodeError:
            pass
        raise ValueError("No JSON array found in collector output")
    data = json.loads(cleaned[start : end + 1])
    if not isinstance(data, list):
        raise ValueError("Collector output is not a list")
    return data


# --- Routes ------------------------------------------------------------------
@app.post("/assistant", response_model=AssistantResponse)
async def assistant(req: AssistantRequest) -> AssistantResponse:
    profile = load_profile(req.company_name)

    prompt = (
        "You are a helpful assistant answering questions about a company.\n"
        "Use ONLY the company profile below as your source of truth. If the answer "
        "is not in the profile, say so honestly. Answer in clear, friendly, "
        "conversational language, not raw JSON.\n\n"
        f"Company: {req.company_name}\n"
        f"Company profile (JSON):\n{json.dumps(profile, ensure_ascii=False, indent=2)}\n\n"
        f"User question: {req.question}"
    )

    try:
        answer = await run_agent(assistent_agent, prompt)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Assistant agent failed: {exc}")

    return AssistantResponse(
        company_name=req.company_name,
        question=req.question,
        answer=answer.strip(),
    )


@app.post("/events", response_model=EventsResponse)
async def events(req: EventsRequest) -> EventsResponse:
    prompt = (
    f"Find the 5 most relevant events for the company '{req.company_name}' "
    "(conferences, trade shows, product launches, webinars, announcements).\n\n"
    "Rules:\n"
    "- Use web_search at most 3 times, then stop searching.\n"
    "- Even if results are imperfect, you MUST finish by answering with what you found.\n"
    "- Final answer: ONLY a JSON array of exactly 5 objects, no markdown, no extra text:\n"
    '[{"title": "...", "date": "...", "location": "...", "description": "...", "url": "..."}]'
)
    #print  username
    print(f"Fetching events for company: {req.company_name}")

    try:
        raw = await run_agent(collector_agent, prompt)
        items = parse_events(raw)
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=f"Could not parse collector output: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Collector agent failed: {exc}")

    events_list = [Event(**{k: v for k, v in item.items() if k in Event.model_fields}) for item in items[:5]]
    return EventsResponse(company_name=req.company_name, events=events_list)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}