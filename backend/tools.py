import re

from ddgs import DDGS
from agents import function_tool

AD_MARKERS = ("bing.com/aclick", "duckduckgo.com/y.js", "/aclk?")


def _search(query: str, n: int) -> list[dict]:
    try:
        results = DDGS().text(query, max_results=n + 5) or []
    except Exception:
        return []
    # Drop sponsored results: their links are ad redirects, not real sources.
    return [r for r in results if not any(ad in r.get("href", "") for ad in AD_MARKERS)][:n]


def _simplify(query: str) -> str:
    """Long queries with quotes often return nothing. Keep the first 8 plain words."""
    words = re.sub(r"[\"'()]", " ", query).split()
    return " ".join(words[:8])


@function_tool
def web_search(query: str, max_results: int = 5) -> str:
    """Search the internet for current information.

    Use short queries of 3-8 words without quotes, for example "offshore wind conference 2027".
    Make one query per topic instead of combining many topics.

    Args:
        query: The search query.
        max_results: Number of results to return.
    """
    results = _search(query, max_results)
    if not results and _simplify(query) != query:
        results = _search(_simplify(query), max_results)
    if not results:
        return "No results found. Try a shorter, simpler query."

    return "\n\n".join(
        f"Title: {r['title']}\nURL: {r['href']}\nSnippet: {r['body']}"
        for r in results
    )
