"""Settings for the profiler agent. Change values here, not in the other modules."""

import os
from pathlib import Path

from dotenv import load_dotenv

# ---- Paths ----
BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent
MEMBERS_FILE = BACKEND_DIR / "members.json"      # which companies to profile
CACHE_DIR = BACKEND_DIR / "cache"                # fetched pages (not committed)
OUTPUT_DIR = BACKEND_DIR / "output"              # generated profiles
APP_DATA_DIR = REPO_ROOT / "src" / "data" / "companies"  # where the web app reads profiles
APP_SOURCES_DIR = REPO_ROOT / "src" / "data" / "sources"  # page texts for quote highlighting

# ---- AI model (Azure OpenAI), read from the .env file in the repo root ----
# .env must contain API_KEY, AI_URL and MODEL_NAME. It is git-ignored: never commit it.
load_dotenv(REPO_ROOT / ".env")
API_KEY = os.environ.get("API_KEY", "")
AI_URL = os.environ.get("AI_URL", "")
MODEL = os.environ.get("MODEL_NAME", "gpt-5-mini")
REASONING_EFFORT = "medium"   # minimal | low | medium | high
MAX_COMPLETION_TOKENS = 32000

# ---- Fetching ----
MAX_PAGES = 8                  # pages per company (seeds + discovered)
MAX_CHARS_PER_PAGE = 20_000    # text sent to the AI model per page
REQUEST_TIMEOUT = 20           # seconds
USER_AGENT = "VirtualScienceParkProfiler/0.1 (hackathon prototype)"
# Same-site links containing one of these words are fetched after the seed URLs.
DISCOVERY_KEYWORDS = (
    "about", "om-oss", "product", "solution", "service", "industr",
    "sustainab", "research", "innovation", "karlskrona",
)

# ---- Profile sections (keys used in the v1.1 JSON) ----
SECTIONS = {
    "whatTheyDo": "wtd",
    "technologies": "tech",
    "applicationAreas": "app",
    "markets": "mkt",
    "geography": "geo",
    "statedPriorities": "prio",
    "collaborations": "collab",
    "inferredInterests": "inf",
}
