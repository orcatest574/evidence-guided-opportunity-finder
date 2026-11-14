"""Step 3: check the AI model's output against the fetched pages. Plain code, no AI.

- A cited URL must be one of the fetched pages, otherwise it is removed.
- A quote must be found in the text of a cited page, otherwise it is removed.
- A "fact" with no verified quote is downgraded to "unverified".
"""

import re
import unicodedata
from dataclasses import dataclass, field

from .extractor import ExtractedClaim, Extraction
from .fetcher import Page


@dataclass
class VerifiedClaim:
    claim: ExtractedClaim
    type: str                 # fact | inferred | unverified
    source_urls: list[str]
    quotes: list[str]         # only quotes found on a cited page


@dataclass
class VerificationResult:
    claims: list[VerifiedClaim]
    warnings: list[str] = field(default_factory=list)


_QUOTE_CHARS = str.maketrans({"’": "'", "‘": "'", "“": '"', "”": '"', "–": "-", "—": "-", " ": " "})


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).translate(_QUOTE_CHARS).lower()
    return re.sub(r"\s+", " ", text).strip(" .,;:")


def verify(extraction: Extraction, pages: list[Page]) -> VerificationResult:
    page_text = {p.url: normalize(p.text) for p in pages}
    result = VerificationResult(claims=[])

    for claim in extraction.claims:
        label = f"{claim.local_id} ({claim.section})"
        urls = [u for u in claim.source_urls if u in page_text]
        for bad in set(claim.source_urls) - set(urls):
            result.warnings.append(f"{label}: cited URL was not fetched, removed: {bad}")

        quotes = []
        for quote in claim.quotes:
            if any(normalize(quote) in page_text[u] for u in urls):
                quotes.append(quote)
            else:
                result.warnings.append(f"{label}: quote not found on cited pages, removed: \"{quote[:80]}\"")

        claim_type = claim.type
        if claim.type == "fact" and not quotes:
            claim_type = "unverified"
            result.warnings.append(f"{label}: fact has no verified quote, downgraded to unverified")

        result.claims.append(VerifiedClaim(claim=claim, type=claim_type, source_urls=urls, quotes=quotes))
    return result
