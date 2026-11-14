"""Import every member from Blue Science Park's public member directory into members.json.

    python -m profiler.import_members            # add all members (keeps existing entries)
    python -m profiler.import_members --dry-run  # only show what would be added

Source: https://www.bluesciencepark.se/medlem-sitemap.xml (one page per member).
For each member page the company name (page title) and website (the external link
that is not part of the page template) are read. Seed URLs = website + member page.
Then run:  python -m profiler --all --publish
"""

import argparse
import json
import logging
import re

import requests

from . import config
from .fetcher import fetch_page

SITEMAP = "https://www.bluesciencepark.se/medlem-sitemap.xml"
# Links that appear on every member page (site template), not the member's own website.
TEMPLATE_HOSTS = ("bluesciencepark.se", "mtcos.se", "techconceptlab.com", "swedenict.se")
SOCIAL_HOSTS = ("linkedin.", "facebook.", "instagram.", "youtube.", "twitter.", "x.com", "google.", "mynewsdesk.", "vimeo.")

log = logging.getLogger(__name__)


def member_pages() -> list[str]:
    xml = requests.get(SITEMAP, timeout=config.REQUEST_TIMEOUT, headers={"User-Agent": config.USER_AGENT}).text
    return sorted(set(re.findall(r"https://www\.bluesciencepark\.se/medlem/[^<\s]+/", xml)))


def read_member(url: str) -> dict | None:
    page = fetch_page(url)
    name = re.sub(r"\s*[-–|]\s*Blue Science Park\s*$", "", page.title).strip()
    website = next((l for l in page.links
                    if l.startswith("http") and not any(h in l for h in TEMPLATE_HOSTS + SOCIAL_HOSTS)), None)
    slug = url.rstrip("/").rsplit("/", 1)[-1]
    if not name or not website:
        log.warning("  skip %s (name or website not found)", slug)
        return None
    return {"id": slug, "name": name, "website": website.rstrip("/"), "seed_urls": [website, url]}


def main() -> None:
    parser = argparse.ArgumentParser(prog="profiler.import_members", description=__doc__.splitlines()[0])
    parser.add_argument("--dry-run", action="store_true", help="show what would be added, do not write members.json")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    existing = json.loads(config.MEMBERS_FILE.read_text(encoding="utf-8"))
    known = {m["id"] for m in existing}
    pages = member_pages()
    log.info("%d member pages in the Blue Science Park directory, %d already in members.json", len(pages), len(known))

    added = []
    for url in pages:
        slug = url.rstrip("/").rsplit("/", 1)[-1]
        if slug in known:
            continue
        member = read_member(url)
        if member:
            added.append(member)
            log.info("  + %-28s %s", member["name"], member["website"])

    if args.dry_run:
        log.info("dry run: %d members would be added", len(added))
        return
    config.MEMBERS_FILE.write_text(json.dumps(existing + added, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    log.info("added %d members -> %s (now %d). Next: python -m profiler --all --publish", len(added), config.MEMBERS_FILE.name, len(existing) + len(added))


if __name__ == "__main__":
    main()
