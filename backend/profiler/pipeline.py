"""Runs the steps for one company: fetch -> extract -> verify -> build -> save."""

import json
import logging
import shutil

from . import config
from .builder import build_profile
from .extractor import extract_profile
from .fetcher import collect_pages
from .members import Member
from .verifier import verify

log = logging.getLogger(__name__)


def profile_company(member: Member, use_cache: bool = True, dry_run: bool = False):
    log.info("== %s ==", member.name)
    pages = collect_pages(member, use_cache)
    if not pages:
        log.error("  no pages could be fetched, skipping")
        return None
    if dry_run:
        log.info("  dry run: %d pages fetched, AI model not called", len(pages))
        return None

    extraction = extract_profile(member, pages)
    verified = verify(extraction, pages)
    profile = build_profile(member, pages, extraction, verified)

    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out = config.OUTPUT_DIR / f"{member.id}.json"
    out.write_text(json.dumps(profile, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    v = profile["metadata"]["verification"]
    log.info("  saved %s  (%d claims: %d verified facts, %d unverified, %d warnings)",
             out.relative_to(config.REPO_ROOT), v["claims"], v["verifiedFacts"], v["unverified"], len(verified.warnings))
    return out


def publish(member: Member, force: bool = False) -> bool:
    """Copy a generated profile into the web app, unless a user has edited the app's copy."""
    source = config.OUTPUT_DIR / f"{member.id}.json"
    target = config.APP_DATA_DIR / f"{member.id}.json"
    if not source.exists():
        log.error("  %s: nothing to publish, run the profiler first", member.id)
        return False
    if target.exists() and not force:
        existing = json.loads(target.read_text(encoding="utf-8"))
        if existing.get("metadata", {}).get("lastEditedByUser"):
            log.warning("  %s: app profile was edited by a user, not overwritten (use --force)", member.id)
            return False
    shutil.copyfile(source, target)
    log.info("  published %s", target.relative_to(config.REPO_ROOT))
    return True
