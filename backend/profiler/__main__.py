"""Command line entry point.

    python -m profiler nkt ericsson     # profile some companies
    python -m profiler --all            # profile every company in members.json
    python -m profiler --all --dry-run  # only fetch pages, no AI call
    python -m profiler nkt --publish    # also copy the result into the web app
"""

import argparse
import logging
import sys

from .members import load_members
from .pipeline import profile_company, publish


def main() -> int:
    parser = argparse.ArgumentParser(prog="profiler", description="Build verified baseline company profiles from public web pages.")
    parser.add_argument("companies", nargs="*", help="company ids from members.json")
    parser.add_argument("--all", action="store_true", help="profile every company in members.json")
    parser.add_argument("--dry-run", action="store_true", help="fetch pages only, do not call the AI model")
    parser.add_argument("--no-cache", action="store_true", help="re-download pages instead of using the cache")
    parser.add_argument("--publish", action="store_true", help="copy results to src/data/companies/")
    parser.add_argument("--force", action="store_true", help="with --publish: overwrite profiles edited by users")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")
    members = load_members()
    if not args.all:
        unknown = set(args.companies) - {m.id for m in members}
        if unknown or not args.companies:
            parser.error(f"give company ids or --all. Known ids: {', '.join(m.id for m in members)}")
        members = [m for m in members if m.id in args.companies]

    failed = 0
    for member in members:
        try:
            if profile_company(member, use_cache=not args.no_cache, dry_run=args.dry_run) and args.publish:
                publish(member, force=args.force)
        except Exception as error:  # keep going with the next company
            logging.error("  %s failed: %s", member.id, error)
            failed += 1
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
