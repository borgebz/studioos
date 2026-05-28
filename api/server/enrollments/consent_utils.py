"""Helpers for capturing consent audit metadata from an HTTP request."""

from __future__ import annotations

import re

# Current policy versions. Bump these when the displayed text changes so the
# consent record reflects exactly which version the user accepted.
CURRENT_POLICY_VERSIONS = {
    "rgpd": "2026-05-28",
    "internal_regulation": "2026-05-28",
}


def get_client_ip(request) -> str | None:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def get_locale(request) -> str:
    """Best-effort locale derived from Accept-Language."""
    accept = request.META.get("HTTP_ACCEPT_LANGUAGE", "")
    if not accept:
        return ""
    primary = accept.split(",", 1)[0].strip()
    return primary.split(";", 1)[0].strip()


_OS_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("iOS", re.compile(r"iP(?:hone|ad|od)")),
    ("Android", re.compile(r"Android")),
    ("Windows", re.compile(r"Windows NT")),
    ("macOS", re.compile(r"Mac OS X|Macintosh")),
    ("Linux", re.compile(r"Linux")),
)

_BROWSER_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    # Order matters: Edge/Opera/Chrome share substrings with each other.
    ("Edge", re.compile(r"Edg(?:e|A|iOS)?/(\d+(?:\.\d+)?)")),
    ("Opera", re.compile(r"OPR/(\d+(?:\.\d+)?)")),
    ("Firefox", re.compile(r"Firefox/(\d+(?:\.\d+)?)")),
    ("Chrome", re.compile(r"Chrome/(\d+(?:\.\d+)?)")),
    ("Safari", re.compile(r"Version/(\d+(?:\.\d+)?).*Safari")),
)


def parse_user_agent(user_agent: str) -> dict:
    """
    Parse a UA string into {device_type, os, browser, browser_version}.

    Deliberately lightweight — accurate enough for an audit record without
    pulling in a heavy UA-parsing dependency. Returns empty strings for
    fields it can't identify.
    """
    if not user_agent:
        return {"device_type": "", "os": "", "browser": "", "browser_version": ""}

    os_name = ""
    for name, pattern in _OS_PATTERNS:
        if pattern.search(user_agent):
            os_name = name
            break

    browser = ""
    browser_version = ""
    for name, pattern in _BROWSER_PATTERNS:
        match = pattern.search(user_agent)
        if match:
            browser = name
            browser_version = match.group(1) if match.groups() else ""
            break

    if re.search(r"bot|crawler|spider", user_agent, re.IGNORECASE):
        device_type = "bot"
    elif re.search(r"iPad|Tablet", user_agent):
        device_type = "tablet"
    elif re.search(r"Mobi|iPhone|Android.*Mobile", user_agent):
        device_type = "mobile"
    elif os_name in {"Windows", "macOS", "Linux"}:
        device_type = "desktop"
    else:
        device_type = ""

    return {
        "device_type": device_type,
        "os": os_name,
        "browser": browser,
        "browser_version": browser_version,
    }


def policy_version_for(consent_type: str) -> str:
    """Lookup the current policy version for a consent type."""
    return CURRENT_POLICY_VERSIONS.get(consent_type, "")
