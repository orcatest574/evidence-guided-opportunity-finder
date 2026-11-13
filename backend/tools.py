from ddgs import DDGS
from agents import function_tool



@function_tool
def web_search(query: str, max_results: int = 5) -> str:
    """Search the internet for current information.

    Args:
        query: The search query.
        max_results: Number of results to return.
    """
    try:
        results = DDGS().text(query, max_results=max_results)
    except Exception as e:
        return f"Search failed: {e}"

    if not results:
        return "No results found."

    return "\n\n".join(
        f"Title: {r['title']}\nURL: {r['href']}\nSnippet: {r['body']}"
        for r in results
    )