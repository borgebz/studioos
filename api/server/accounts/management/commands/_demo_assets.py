"""
Demo asset catalog + runtime helpers for `seed_demo_data`.

The seed downloads images/files from the public web on first run and attaches
them to model rows. Idempotent: subsequent runs see the file is already
populated on the model and skip the download.

URL pools were curated by scraping public listings on Vinted (real second-hand
dancewear/inventory) and Unsplash (royalty-free event / portrait photos). When
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


# Vinted product CDN photos — real second-hand dancewear listings. URLs include
# a signed token (``?s=…``) with a server-side TTL; expect occasional 403s and
# fall back to the corresponding Unsplash pool when that happens.
VINTED_TUTUS_KIDS = [
    "https://images1.vinted.net/t/05_00bf8_19fyPDAhMYFBUGxohqk9rjjd/310x430/1763818670.webp?s=bcb8f02f65b8132f5476c72963da5738e69bf543",
    "https://images1.vinted.net/t/06_01ef7_qX9o641xA8VbR83Hf84uHZqY/310x430/1779909050.webp?s=65374ea6386630311288db09f253a56734c2eb3c",
    "https://images1.vinted.net/t/06_00321_rBqEir7U6iC4DviNWh57qwBk/310x430/1779908099.webp?s=2b480fdb5c4b29ad8bc9c4a1aa0521e3f69e7ff2",
    "https://images1.vinted.net/t/05_010fc_AbKVDtqPPFegndYTfTeQHfob/310x430/1779897004.webp?s=42adaeff13c4868d5840240f291d37e5dcbfd7da",
    "https://images1.vinted.net/t/05_02170_tDDAhSFMrvC3jyRQqCCWXmWM/310x430/1779871145.webp?s=f3ac0e924a920f53f5a0eaa220fcb9f80bf8a5f8",
    "https://images1.vinted.net/t/06_01285_XWwwZoqvDCJzKLLY8SP1J99n/310x430/1779871315.webp?s=44b4ecb23c19bca4f9c1418fc3d97becf9254a17",
    "https://images1.vinted.net/t/05_00996_9UqaRF8pA2vK2R7fDn4p3PLe/310x430/1779862799.webp?s=a61664e9e620e9151505fe5b787c2ebaa2d2221e",
    "https://images1.vinted.net/t/06_0013c_jjpKnJMUrk23jWeniAAtHMxN/310x430/1779862799.webp?s=8147f589483d47a667654000efa42dadb232515b",
    "https://images1.vinted.net/t/05_01255_vqLC1HuidECbcfsbPh55woWS/310x430/1779860881.webp?s=9934bb1e093ad14501f75538be678811ae43fde0",
    "https://images1.vinted.net/t/05_010b0_Zwt3EicNTiDH5Ldc3ZofW7PL/310x430/1779862876.webp?s=72044fd60b09a36c7fea80d1a2852471084ff50e",
]

VINTED_BALLET_SHOES = [
    "https://images1.vinted.net/t/04_01286_N1cwjD6jcSVNmptBcgFzzZC5/310x430/1778153125.webp?s=e3ffdff5290673ab9a0ab0a0d4eaa7c9b54f2701",
    "https://images1.vinted.net/t/04_01a8c_BAPuNvPddyXocTz4WcQBJCU4/310x430/1779919259.webp?s=a089ef49f0a27d54f71e1954e8f61894e7a46675",
    "https://images1.vinted.net/t/06_01eec_t25J5DmB78tZeZm8VTdQm6q1/310x430/1775502460.webp?s=ddc76015dfc39030462680c0b54efaa4e11c43c2",
    "https://images1.vinted.net/t/06_0146d_vYGCDSm6mZQ1goH9KuWKZSjT/310x430/1779365498.webp?s=2e1f45bb00f21c73f5049a802589b791c90d1902",
    "https://images1.vinted.net/t/05_01afa_aTegZZaBNg587Yn9HAMtEYht/310x430/1777675969.webp?s=2684c5e28f557ae484241a2942230d5e5f47087a",
    "https://images1.vinted.net/t/05_00e9e_BWQc2LzHWAzoiE983fhEwDjx/310x430/1779792111.webp?s=18e7c822ad5841168b1386c5746013791bf5ac28",
    "https://images1.vinted.net/t/06_024be_BNuZhm6KaLSEYZ6FKKES4kZ4/310x430/1776176313.webp?s=8de80efd4978b178cdc2d9da4d231932e571fc55",
    "https://images1.vinted.net/t/05_01ec8_DjF8uwBRNDmByULhRQKtbC9j/310x430/1776176313.webp?s=4c3f9f41fe872dda9dec879ad099f02bd4bb12b0",
    "https://images1.vinted.net/t/01_012de_r4j2mGjk9nPjawk15gWY7pVj/310x430/1776176313.webp?s=d91bf76533bac1b1b488ba65c096182053eadd26",
    "https://images1.vinted.net/t/01_02273_AwttxxSAG2G53t3pRphkiMRP/310x430/1774997138.webp?s=0adb05341488ae956d2a9010622f499551c06f5e",
]

VINTED_COLLANTS = [
    "https://images1.vinted.net/t/05_00552_NhUk5dPdTLVR9mVGf8BvcJtc/310x430/1778538764.webp?s=81727c2050ca21cdc060e3e6d83db807ffab6cc2",
    "https://images1.vinted.net/t/04_023c6_MinGmg3YkCKXVUUJschZAKxJ/310x430/1776203768.webp?s=3674f310f5ecf42b11d56a53af8702e52bfd9e28",
    "https://images1.vinted.net/t/03_01459_xGcRxkdeK8Njjkd9it75gjxz/310x430/1779368223.webp?s=9e38647fa02dffe2b1bce565b1e41078c894cb8c",
    "https://images1.vinted.net/t/05_00831_Pr4N9LhveTaYk6Wb5YrMzKev/310x430/1779721181.webp?s=b261e818f0b74d41d6a069fe747b1dbf58629b37",
    "https://images1.vinted.net/t/01_02270_vJz5DW5fpRVB3LVQMuCxiwVZ/310x430/1759842623.webp?s=155d60bd28e7d21201302f065540633867bb4b30",
    "https://images1.vinted.net/t/06_0110c_ZdF49Nourw1WnVVvsCCMeqra/310x430/1778923283.webp?s=c1b726c2fc8a6999f9555295131707e7e800ef87",
    "https://images1.vinted.net/t/04_014f6_isV2S1S9U5rLvti5yhwaRBHM/310x430/1755204166.webp?s=f7a131037ab2d20c193e25c373cf6e9264f63449",
    "https://images1.vinted.net/t/03_0088d_36Td5SSSD9oYCdQ5ocJjkWhU/310x430/1755204166.webp?s=17cec307553e2bc19a60df7b554fce1d4373afb3",
]

VINTED_LEOTARDS = [
    "https://images1.vinted.net/t/01_025ae_Y5BePzLLpTQ7xeLtcFJAnoQk/310x430/1778610665.webp?s=3ebd676b4889b50cff850c2c1e93bbe8609b5309",
    "https://images1.vinted.net/t/06_00caa_FWu5utRBhuxdR6Jc2iE1gQ8r/310x430/1767787249.webp?s=41ddfbe5afd688e871ea990cfff0c2f92868e9c9",
    "https://images1.vinted.net/t/06_0131b_9ppN1D8mh3eqXxqEvCYoL5Lo/310x430/1774286332.webp?s=961f98d35dbc48aad239f2e1ee8ad7b67b2a6faf",
    "https://images1.vinted.net/t/01_00618_QodcoXqkgrbrSkoYSAM6b7tC/310x430/1767882288.webp?s=8b09db5cb19f421d25623add336f4751fa7240cd",
    "https://images1.vinted.net/t/05_01127_ioMJCirxmkwRA9ud34cPY5cu/310x430/1779643418.webp?s=a44e26e5e4669749411894556cdfa42574d6f9b4",
    "https://images1.vinted.net/t/05_0037a_cKaybYUB1RzrRwJkrsQmHW94/310x430/1776172416.webp?s=6ec8226a52bacedf6ff3b072bc7978304d5a7fcb",
    "https://images1.vinted.net/t/05_01080_PS962Hh7kCncoEHE4qdv7KyW/310x430/1779919413.webp?s=6fc3981967d85362f3b2e2d9d731a4a2a7e62dcc",
    "https://images1.vinted.net/t/06_00d36_rFXhHSUwyUCjTvoWPQhaQJr1/310x430/1779919413.webp?s=0c231720076b6d206ed8a473bd6b6146af6bb856",
]

VINTED_HIP_HOP_SHOES = [
    "https://images1.vinted.net/t/02_02355_LiaTut47NiMPaBtFSgLy3K9s/310x430/1779429282.webp?s=39a6ca092e200567c5980a5b4aab34dc4edc8f18",
    "https://images1.vinted.net/t/05_0142f_82hNx9JiesgUNXm3u5u9Jkv9/310x430/1779796721.webp?s=cd0b097433e95fb3acfdce77c6872f6a24cacc74",
    "https://images1.vinted.net/t/01_00abb_yoh9CunPuDhYqGTCs2yJWJru/310x430/1777989298.webp?s=0abbdab0441e04faf947c8280d30b8fc788abb3e",
    "https://images1.vinted.net/t/04_012a9_uPKdhgiihsvrtPqJUpv3vnnw/310x430/1779729999.webp?s=f39d4e009cc7305479aa5a876d8ae09b9c96e42d",
    "https://images1.vinted.net/t/05_01741_V19gv13GpPikJysbRt7bRDK6/310x430/1764534395.webp?s=40358a79e86af284feec82de13b2bdab2bba5e4b",
    "https://images1.vinted.net/t/06_00f85_9TUNPmtaioVfS78VyuvcD7YE/310x430/1779966508.webp?s=de73970d57ab3e6e07ddf3e875c0e0afa831ecd4",
]

VINTED_JAZZ_SHOES = [
    "https://images1.vinted.net/t/05_00a9c_hwQKsaQx3YvXPCZgePoXsQA1/310x430/1772996034.webp?s=eeb67f767b520b5259e9d30efaf0e964fe10e9e1",
    "https://images1.vinted.net/t/06_007d6_4YPCJaciQDqwLFAThVBMJXGE/310x430/1778132755.webp?s=0bdf08d8a978dec882cb9f27534c1d3960c82e8c",
    "https://images1.vinted.net/t/06_018a4_NHwPhuYbwfzYVdvgoQgXL7s3/310x430/1764016115.webp?s=d590e0c0a366a045fd90bbeab05f2a7395ebbbf5",
    "https://images1.vinted.net/t/05_01470_EpdhFCj6ymA2b3sGFpGKbvwN/310x430/1778485501.webp?s=f4ecdbad4c295c41593f5f6a2e6cc53b1f560c1a",
    "https://images1.vinted.net/t/05_025d0_6ihomtPK6PjfySys4zZS5FYX/310x430/1776155189.webp?s=8907fc6e2cdbd500f7fc0acda515b4eb6d40f64c",
    "https://images1.vinted.net/t/03_019d4_ZbPSGtwCK1wxWoD3DmpavqEn/310x430/1751903678.webp?s=18973e69448da5546a0179c589c5ce89aceac7c0",
]

# Unsplash product fallbacks (won't expire).
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


# Vinted CDN refuses requests without an Accept / User-Agent header.
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
