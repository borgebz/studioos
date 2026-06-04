"""
Demo asset catalog + runtime helpers for `seed_demo_data`.

The seed downloads images/files from the public web on first run and attaches
them to model rows. Idempotent: subsequent runs see the file is already
populated on the model and skip the download.

Image pools come from Unsplash (royalty-free photos) and avatars from
DiceBear (generated). When
a download fails (offline, expired signed URL, throttled), the helper returns
``None`` and the caller leaves the field empty — the seed keeps going.

This file is underscored so Django's management-command auto-discovery skips
it; it is imported as a sibling module by ``seed_demo_data``.
"""

from __future__ import annotations

import hashlib
import io
import logging
import random
import urllib.request
from pathlib import Path

from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────────────
#  URL pools
# ────────────────────────────────────────────────────────────────────────────


def _unsplash(photo_id: str, w: int = 1200) -> str:
    """Build a stable Unsplash hotlink URL from a photo id."""
    return (
        f"https://images.unsplash.com/photo-{photo_id}"
        f"?w={w}&auto=format&fit=crop&q=80"
    )


# Theatre / stage / performance photos for events.
EVENT_THEATRE = [
    _unsplash(p)
    for p in [
        "1664302637848-6ae0d5821944",
        "1514306191717-452ec28c7814",
        "1503095396549-807759245b35",
        "1562329265-95a6d7a83440",
        "1684923604860-64e661f2ff72",
        "1615414015111-8d98cb65677e",
        "1579539760267-b2e78d9d735e",
        "1615414047026-802692414b79",
        "1664303124313-126bf7456982",
        "1613210434051-4b00d62d03fb",
        "1576724196706-3f23f51ea351",
        "1610890690846-5149750c8634",
    ]
]

# Ballet performance / classical recital.
EVENT_BALLET = [
    _unsplash(p)
    for p in [
        "1664302558859-3e7865d4343b",
        "1495791185843-c73f2269f669",
        "1619445704651-098bc122b05d",
        "1511715282680-fbf93a50e721",
        "1661409510873-9450911e5af7",
        "1508807526345-15e9b5f4eaff",
        "1550026593-cb89847b168d",
        "1675806528444-75a88ed9c014",
        "1661409434535-36643d8fab29",
        "1516737488405-7b6d6868fad3",
        "1602781723875-7e7edaa1e5ca",
        "1568481996616-dc7f8ff0bab9",
    ]
]

# Contemporary / modern dance.
EVENT_CONTEMPORARY = [
    _unsplash(p)
    for p in [
        "1710064057043-d301e344e348",
        "1547153760-18fc86324498",
        "1529229504105-4ea795dcbf59",
        "1681492529719-a1d3d8cc498a",
        "1542887800-faca0261c9e1",
        "1541904845547-0eaf866de232",
        "1689885430776-bbefae37f993",
        "1621976360623-004223992275",
        "1531318701087-32c11653dd77",
        "1611879531844-24b7ddf40b26",
    ]
]

# Hip-hop / urban dance workshop photos.
EVENT_HIP_HOP = [
    _unsplash(p)
    for p in [
        "1682089706055-d5ef14dc14e4",
        "1504609813442-a8924e83f76e",
        "1508700929628-666bc8bd84ea",
        "1502519144081-acca18599776",
        "1546427660-eb346c344ba5",
        "1710107448106-1782a3867d47",
    ]
]

# Jazz / cabaret style.
EVENT_JAZZ = [
    _unsplash(p)
    for p in [
        "1746417461105-51b89a61907f",
        "1550026593-f369f98df0af",
        "1602303917904-39912f325b69",
        "1682089714425-3034f9d26736",
        "1713771541849-7909c4a9431a",
        "1579736170791-e7ce1a38e203",
        "1676426019486-da5eb4164162",
    ]
]

# Dance studio interior photos — used as Studio descriptions decoration if
# Studio model ever gets a photo field. Today: unused, kept for reuse.
STUDIO_INTERIOR = [
    _unsplash(p)
    for p in [
        "1714618978413-8fbe08073db3",
        "1524594152303-9fd13543fe6e",
        "1649591833478-15cd1060e137",
        "1779617926288-fde3f7fb7b5d",
        "1683219367985-b59ec6e32e5b",
        "1761234201591-e3185fff2348",
        "1537365587684-f490102e1225",
        "1603425013520-e0b30e6e37dc",
        "1586211070543-61ae1ad4a665",
        "1520732789276-a0ebed2eeabd",
        "1663040064464-ad2e3abd043d",
        "1567667867244-2eed283cb70a",
    ]
]


# Marketplace and inventory pools. Third-party listing photos were removed so
# the seed only downloads royalty-free Unsplash images; empty pools fall
# through to the matching UNSPLASH_* fallback at each call site.
VINTED_TUTUS_KIDS: list[str] = []
VINTED_BALLET_SHOES: list[str] = []
VINTED_COLLANTS: list[str] = []
VINTED_LEOTARDS: list[str] = []
VINTED_HIP_HOP_SHOES: list[str] = []
VINTED_JAZZ_SHOES: list[str] = []


UNSPLASH_TUTUS = [
    _unsplash(p, w=800)
    for p in [
        "1620739867819-9f520532444a",
        "1683133894928-5ed3c7787630",
        "1675806541088-042a291c8cc9",
        "1594211185595-f42d6b758ab9",
        "1681456365855-a5e929013e06",
        "1689884459610-8bf217ec72b3",
        "1675806532870-010fb1d1d119",
    ]
]
UNSPLASH_SHOES = [
    _unsplash(p, w=800)
    for p in [
        "1555656220-46e30749d330",
        "1592554536753-6d811a6ff52f",
        "1528224564567-1611757a2909",
        "1593793516936-7a6b517c1075",
        "1555489400-df7b0ded356d",
        "1555489400-d802b08e0982",
        "1592554556478-773c301ab33d",
    ]
]
UNSPLASH_DANCEWEAR = [
    _unsplash(p, w=800)
    for p in [
        "1661725669990-10aa30c5271b",
        "1586211070543-61ae1ad4a665",
        "1590803246097-7be47831ab35",
        "1590803296627-e9ed27c410a0",
        "1724419128140-921e46556d9e",
        "1590803290452-59f035e34e1e",
        "1590803409762-8c16fe7cbe66",
        "1626697166932-8150c73436f5",
    ]
]


def avatar_url(seed: str, *, size: int = 256) -> str:
    """Deterministic avatar by seed (DiceBear)."""
    return (
        "https://api.dicebear.com/9.x/avataaars/png"
        f"?seed={seed}&size={size}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf"
    )


# ────────────────────────────────────────────────────────────────────────────
#  Download helpers
# ────────────────────────────────────────────────────────────────────────────


# Some CDNs refuse requests without an Accept / User-Agent header.
_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "image/avif,image/webp,image/png,image/*;q=0.8,*/*;q=0.5",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
}


def download_bytes(url: str, *, timeout: int = 10) -> bytes | None:
    """Fetch ``url`` and return raw bytes, or ``None`` on any failure."""
    try:
        req = urllib.request.Request(url, headers=_BROWSER_HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310
            return resp.read()
    except Exception as exc:  # noqa: BLE001
        logger.warning("download failed for %s: %s", url, exc)
        return None


def download_image(url: str, *, filename_hint: str = "image") -> ContentFile | None:
    """
    Download ``url`` and return a Django ``ContentFile`` ready to assign to an
    ``ImageField``. The filename keeps the original extension when possible so
    Django's ImageField content-type sniffing succeeds.
    """
    data = download_bytes(url)
    if not data:
        return None
    ext = Path(url.split("?", 1)[0]).suffix.lower() or ".jpg"
    if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        ext = ".jpg"
    safe_hint = filename_hint.replace(" ", "_").lower()[:40]
    digest = hashlib.sha1(url.encode()).hexdigest()[:8]
    return ContentFile(data, name=f"{safe_hint}-{digest}{ext}")


def first_working_image(
    urls: list[str], *, filename_hint: str = "image"
) -> ContentFile | None:
    """Try each URL in order, return the first successful download."""
    for url in urls:
        f = download_image(url, filename_hint=filename_hint)
        if f is not None:
            return f
    return None


# ────────────────────────────────────────────────────────────────────────────
#  PDF generation (for EnrollmentFile, EventFile demos)
# ────────────────────────────────────────────────────────────────────────────


def make_pdf(title: str, lines: list[str]) -> ContentFile:
    """
    Render a simple one-page PDF with ``title`` + ``lines`` using Pillow's
    built-in image-to-PDF writer. No reportlab dependency required.
    """
    from PIL import Image, ImageDraw, ImageFont

    width, height = 1240, 1754  # ~A4 at 150dpi
    img = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(img)
    try:
        title_font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48
        )
        body_font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26
        )
    except OSError:
        title_font = ImageFont.load_default()
        body_font = ImageFont.load_default()

    # Header band
    draw.rectangle([0, 0, width, 140], fill="#1a1f3b")
    draw.text((60, 50), "EnsArtes • Demo Document", fill="white", font=body_font)

    # Title
    draw.text((60, 200), title, fill="#1a1f3b", font=title_font)

    # Divider
    draw.line([(60, 290), (width - 60, 290)], fill="#1a1f3b", width=3)

    # Body lines
    y = 350
    for line in lines:
        draw.text((60, y), line, fill="#222", font=body_font)
        y += 56

    # Stamp box
    draw.rectangle(
        [width - 380, height - 260, width - 60, height - 60],
        outline="#1a1f3b",
        width=3,
    )
    draw.text(
        (width - 360, height - 240),
        "Demo seed data",
        fill="#1a1f3b",
        font=body_font,
    )
    draw.text(
        (width - 360, height - 200),
        "Not a real document",
        fill="#1a1f3b",
        font=body_font,
    )

    buf = io.BytesIO()
    img.save(buf, format="PDF", resolution=150.0)
    digest = hashlib.sha1(f"{title}{lines}".encode()).hexdigest()[:8]
    return ContentFile(buf.getvalue(), name=f"demo-{digest}.pdf")


# ────────────────────────────────────────────────────────────────────────────
#  Convenience: pick image from a pool deterministically (so re-runs are stable)
# ────────────────────────────────────────────────────────────────────────────


def pick(pool: list[str], seed: str) -> str:
    """Pick one URL from ``pool`` deterministically based on ``seed``."""
    if not pool:
        raise ValueError("pool is empty")
    idx = int(hashlib.sha1(seed.encode()).hexdigest(), 16) % len(pool)
    return pool[idx]


def sample(pool: list[str], seed: str, n: int) -> list[str]:
    """Pick ``n`` distinct URLs deterministically based on ``seed``."""
    if not pool:
        return []
    rnd = random.Random(seed)
    return rnd.sample(pool, min(n, len(pool)))
