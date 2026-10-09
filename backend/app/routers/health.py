"""Veri kaynağı sağlık kontrolü: her kaynağı hafif bir temsilî çağrıyla yoklar."""

from __future__ import annotations

import time

from fastapi import APIRouter

router = APIRouter(prefix="/api/health", tags=["health"])

_cache: tuple[float, dict] | None = None
_CACHE_TTL = 60  # saniye — yoklamalar pahalı olabildiğiından sık sık probe edilmez


def _probe_tradingview() -> None:
    import borsapy

    info = borsapy.Index("XU100").info
    if not info.get("last"):
        raise RuntimeError("XU100 fiyatı boş döndü")


def _probe_yahoo() -> None:
    import yfinance as yf

    hist = yf.Ticker("AAPL").history(period="1d")
    if hist is None or hist.empty:
        raise RuntimeError("AAPL geçmişi boş döndü")


def _probe_doviz() -> None:
    import borsapy

    if not borsapy.FX("USD").current.get("last"):
        raise RuntimeError("USD kuru boş döndü")


def _probe_btcturk() -> None:
    import borsapy

    if not borsapy.Crypto("BTCTRY").current.get("last"):
        raise RuntimeError("BTCTRY fiyatı boş döndü")


def _probe_tefas() -> None:
    import borsapy

    df = borsapy.screen_funds(limit=1)
    if df is None or df.empty:
        raise RuntimeError("Fon listesi boş döndü")


def _probe_isyatirim() -> None:
    import borsapy

    if not borsapy.screener_criteria():
        raise RuntimeError("Tarama kriterleri boş döndü")


def _probe_kap() -> None:
    import borsapy

    df = borsapy.companies()
    if df is None or df.empty:
        raise RuntimeError("Şirket listesi boş döndü")


def _probe_tcmb() -> None:
    import borsapy

    if borsapy.policy_rate() is None:
        raise RuntimeError("Politika faizi boş döndü")


_SOURCES: list[tuple[str, str, str, callable]] = [
    ("tradingview", "TradingView", "Fiyat · grafik · hisseler · endeksler · teknik tarama", _probe_tradingview),
    ("yahoo", "Yahoo Finance", "ABD borsası ve endeksleri", _probe_yahoo),
    ("doviz", "Döviz/Altın (canlidoviz)", "Döviz · altın · gümüş · platin · emtia", _probe_doviz),
    ("btcturk", "BtcTurk", "Kripto çiftleri", _probe_btcturk),
    ("tefas", "TEFAS", "Yatırım fonları", _probe_tefas),
    ("isyatirim", "İş Yatırım", "Finansallar · temettü · analist · tarama · VIOP", _probe_isyatirim),
    ("kap", "KAP", "Haberler · şirket listesi", _probe_kap),
    ("tcmb", "TCMB", "Faiz · enflasyon · makro", _probe_tcmb),
]


@router.get("/sources")
def health_sources() -> dict:
    global _cache
    now = time.time()
    if _cache is not None and now - _cache[0] < _CACHE_TTL:
        return {**_cache[1], "cached": True}

    sources: list[dict] = []
    for name, label, feeds, probe in _SOURCES:
        start = time.perf_counter()
        error: str | None = None
        try:
            probe()
        except Exception as exc:
            error = str(exc)[:150] or type(exc).__name__
        ms = int((time.perf_counter() - start) * 1000)
        sources.append(
            {
                "name": name,
                "label": label,
                "feeds": feeds,
                "status": "fail" if error else "ok",
                "ms": ms,
                **({"error": error} if error else {}),
            }
        )

    result = {
        "checked_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "all_ok": all(s["status"] == "ok" for s in sources),
        "sources": sources,
    }
    _cache = (now, result)
    return {**result, "cached": False}
