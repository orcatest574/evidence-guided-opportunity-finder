"""Checks the search agent's suggestions against the real web pages. Plain code, no AI.

For each suggested item the page at its URL is fetched (same fetcher and cache as the
profiling agent) and checked:

- title: most of the significant words of the title appear on the page
- date:  the suggested date appears on the page in a common format, or at least its month and year

Items whose page cannot be fetched or whose title is not on the page are dropped:
they are most likely invented or point to the wrong page.
"""

import asyncio
import re
from datetime import date
from typing import Any

from profiler.fetcher import fetch_page
from profiler.verifier import normalize

MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"]
STOPWORDS = {"the", "and", "for", "with", "event", "annual", "conference", "2026", "2027", "2028"}


def title_found(title: str, text: str) -> bool:
    words = [w for w in re.findall(r"[a-z0-9]+", normalize(title)) if len(w) > 2 and w not in STOPWORDS]
    if not words:
        return False
    hits = sum(1 for w in words if re.search(rf"\b{re.escape(w)}\b", text))
    return hits / len(words) >= 0.6


def date_found(iso: str | None, text: str) -> str:
    """'exact' if the day and month (and year) are on the page, 'month' if month and year are, else 'no'."""
    if not iso:
        return "no"
    try:
        d = date.fromisoformat(iso[:10])
    except ValueError:
        return "no"
    month, short, day, year = MONTHS[d.month - 1], MONTHS[d.month - 1][:3], d.day, str(d.year)
    if iso[:10] in text or f"{day:02d}.{d.month:02d}.{year}" in text or f"{day}/{d.month}/{year}" in text:
        return "exact"
    day_month = rf"\b{day}(st|nd|rd|th)?\b[^a-z0-9]{{0,12}}(\d{{1,2}}[^a-z0-9]{{0,5}})?({month}|{short})\b|\b({month}|{short})\.?\s+{day}\b"
    if re.search(day_month, text) and year in text:
        return "exact"
    if re.search(rf"\b({month}|{short})\b[^a-z0-9]{{0,4}}{year}", text):
        return "month"
    return "no"


def _check(item: dict[str, Any]) -> dict[str, Any] | None:
    url = item.get("url")
    if not isinstance(url, str) or not url.startswith("http"):
        return None
    try:
        page = fetch_page(url)
    except Exception:
        return None  # page unreachable
    text = normalize(f"{page.title} {page.text}")
    if not title_found(str(item.get("title", "")), text):
        return None
    date_check = date_found(item.get("date"), text)
    return {
        **item,
        "verification": "title_and_date" if date_check == "exact" else "title_and_month" if date_check == "month" else "title_only",
        "checked_at": page.retrieved_at,
    }


async def verify_items(items: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    """Returns the items that passed the check, and how many were dropped."""
    checked = await asyncio.gather(*(asyncio.to_thread(_check, i) for i in items if isinstance(i, dict)))
    kept = [c for c in checked if c]
    return kept, len(items) - len(kept)
