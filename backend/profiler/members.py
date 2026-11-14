"""Loads the list of member companies to profile (backend/members.json)."""

import json
from dataclasses import dataclass

from . import config


@dataclass(frozen=True)
class Member:
    id: str
    name: str
    website: str
    seed_urls: list[str]


def load_members() -> list[Member]:
    raw = json.loads(config.MEMBERS_FILE.read_text(encoding="utf-8"))
    return [Member(id=m["id"], name=m["name"], website=m["website"], seed_urls=m["seed_urls"]) for m in raw]
