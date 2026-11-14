"""Step 1: fetch public web pages and turn them into plain text.

Pages are cached on disk so a re-run is reproducible and the verifier
checks quotes against exactly the text the AI model saw.
"""

import hashlib
import json
import logging
import re
import time
from dataclasses import asdict, dataclass
from datetime import date
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from . import config
from .members import Member

log = logging.getLogger(__name__)


@dataclass
class Page:
    url: str
    title: str
    text: str
    links: list[str]
    retrieved_at: str  # YYYY-MM-DD


def _cache_path(url: str):
    return config.CACHE_DIR / f"{hashlib.sha1(url.encode()).hexdigest()}.json"


def fetch_page(url: str, use_cache: bool = True) -> Page:
    path = _cache_path(url)
    if use_cache and path.exists():
        return Page(**json.loads(path.read_text(encoding="utf-8")))

    time.sleep(1)  # be polite to the websites
    response = requests.get(url, timeout=config.REQUEST_TIMEOUT, headers={"User-Agent": config.USER_AGENT})
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    links = [urljoin(url, a["href"]).split("#")[0] for a in soup.find_all("a", href=True)]
    for tag in soup(["script", "style", "noscript", "svg", "nav", "footer", "header", "form"]):
        tag.decompose()
    title = soup.title.get_text(strip=True) if soup.title else url
    text = re.sub(r"\s+", " ", soup.get_text(" ", strip=True))

    page = Page(url=url, title=title, text=text, links=links, retrieved_at=date.today().isoformat())
    config.CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(asdict(page), ensure_ascii=False), encoding="utf-8")
    return page


def _same_site(url: str, website: str) -> bool:
    host = urlparse(url).netloc.removeprefix("www.")
    return host == urlparse(website).netloc.removeprefix("www.")


def collect_pages(member: Member, use_cache: bool = True) -> list[Page]:
    """Fetch the seed URLs, then same-site pages whose URL contains a discovery keyword."""
    pages: list[Page] = []
    seen: set[str] = set()
    queue = list(member.seed_urls)

    while queue and len(pages) < config.MAX_PAGES:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            page = fetch_page(url, use_cache)
        except requests.RequestException as error:
            log.warning("  skip %s (%s)", url, error)
            continue
        if not page.text:
            continue
        pages.append(page)
        log.info("  fetched %s (%d chars)", url, len(page.text))
        for link in page.links:
            if link not in seen and _same_site(link, member.website) and any(k in link.lower() for k in config.DISCOVERY_KEYWORDS):
                queue.append(link)
    return pages
