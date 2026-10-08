"""Ana sayfa piyasa özeti: endeksler, döviz, altın, emtia, kripto."""

from __future__ import annotations

import time

from fastapi import APIRouter

from app.helpers import clean_dict

router = APIRouter(prefix="/api/market", tags=["market"])

# (tür, sembol, görünen ad)
_SUMMARY_ASSETS: list[tuple[str, str, str]] = [
    ("index", "XU100", "BIST 100"),
    ("index", "XU030", "BIST 30"),
    ("fx", "USD", "Dolar"),
    ("fx", "EUR", "Euro"),
    ("fx", "gram-altin", "Gram Altın"),
    ("fx", "gram-gumus", "Gram Gümüş"),
    ("fx", "brent", "Brent Petrol"),
    ("crypto", "BTCTRY", "Bitcoin/TRY"),
]

_cache: dict | None = None
_cache_ts: float = 0.0
_CACHE_TTL = 60  # saniye


def _fetch_asset(kind: str, symbol: str) -> dict:
    import borsapy

    if kind == "index":
        info = borsapy.Index(symbol).info
    elif kind == "fx":
        info = borsapy.FX(symbol).current
    else:
        info = borsapy.Crypto(symbol).current
    info = clean_dict(info)
    return info


@router.get("/summary")
def market_summary() -> dict:
    global _cache, _cache_ts

    now = time.time()
    if _cache is not None and now - _cache_ts < _CACHE_TTL:
        return {"assets": _cache, "cached": True}

    assets: list[dict] = []
    errors: list[dict] = []
    for kind, symbol, label in _SUMMARY_ASSETS:
        try:
            info = _fetch_asset(kind, symbol)
            info["label"] = label
            info["kind"] = kind
            assets.append(info)
        except Exception as exc:  # tek başarısız varlık tüm sayfayı düşürmesin
            errors.append({"symbol": symbol, "error": str(exc)[:200]})

    _cache = assets
    _cache_ts = now
    return {"assets": assets, "errors": errors, "cached": False}
