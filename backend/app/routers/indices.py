"""BIST endeksleri: liste, detay, geçmiş, bileşenler."""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor

import borsapy
from fastapi import APIRouter, HTTPException, Query

from app.helpers import df_to_records, history_records, json_safe
from app.validators import is_symbol

router = APIRouter(prefix="/api/indices", tags=["indices"])

_detailed_cache: tuple[float, list[dict]] | None = None
_CACHE_TTL = 120  # saniye


def _index_quote(sym: str) -> dict:
    try:
        info = borsapy.Index(sym).info
        return {
            "last": info.get("last"),
            "change": info.get("change"),
            "change_percent": info.get("change_percent"),
        }
    except Exception:
        return {}


@router.get("")
def list_indices(detailed: bool = Query(False, description="Güncel fiyat/değişim ekle")) -> dict:
    try:
        # detailed=True {symbol, name, count} kayıtları verir; detailed=False sadece sembol stringi
        idx_list = borsapy.indices(detailed=True)
    except Exception as exc:
        raise HTTPException(502, f"Endeks listesi alınamadı: {exc}") from exc

    import pandas as pd

    if isinstance(idx_list, pd.DataFrame):
        records = df_to_records(idx_list)
    else:
        records = [json_safe(x) if not isinstance(x, str) else {"symbol": x, "name": x} for x in idx_list]

    if not detailed:
        return {"indices": records}

    global _detailed_cache
    now = time.time()
    if _detailed_cache is not None and now - _detailed_cache[0] < _CACHE_TTL:
        return {"indices": _detailed_cache[1], "cached": True}

    quotes = list(
        ThreadPoolExecutor(max_workers=4).map(
            _index_quote, [str(r.get("symbol", "")) for r in records]
        )
    )
    enriched = [{**rec, **q} for rec, q in zip(records, quotes)]
    # rate limit yüzünden çok boş döndüyse önbelleğe alma
    if sum(1 for q in quotes if not q) <= len(quotes) // 4:
        _detailed_cache = (now, enriched)
    return {"indices": enriched}


@router.get("/{symbol}")
def index_detail(symbol: str) -> dict:
    sym = symbol.strip().upper()
    if not is_symbol(sym):
        raise HTTPException(422, f"Gecersiz endeks: {sym[:20]}")
    try:
        idx = borsapy.Index(sym)
        info = json_safe(idx.info)
    except Exception as exc:
        raise HTTPException(404, f"Endeks bulunamadı: {sym} ({exc})") from exc
    return {"info": info}


@router.get("/{symbol}/history")
def index_history(
    symbol: str,
    period: str = Query("1mo", pattern="^(1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|ytd|max)$"),
    interval: str = Query("1d", pattern="^(1d|1wk|1mo)$"),
) -> dict:
    sym = symbol.strip().upper()
    if not is_symbol(sym):
        raise HTTPException(422, f"Gecersiz endeks: {sym[:20]}")
    try:
        hist = borsapy.Index(sym).history(period=period, interval=interval)
    except Exception as exc:
        raise HTTPException(502, f"Endeks geçmişi alınamadı: {exc}") from exc
    if hist is None or hist.empty:
        return {"candles": [], "period": period, "interval": interval}
    return {"candles": history_records(hist), "period": period, "interval": interval}


@router.get("/{symbol}/components")
def index_components(symbol: str) -> dict:
    sym = symbol.strip().upper()
    if not is_symbol(sym):
        raise HTTPException(422, f"Gecersiz endeks: {sym[:20]}")
    try:
        comps = borsapy.Index(sym).components
    except Exception as exc:
        raise HTTPException(502, f"Bileşenler alınamadı: {exc}") from exc
    return {"components": json_safe(comps) or []}
