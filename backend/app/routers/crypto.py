"""Kripto (BtcTurk): çift listesi, anlık fiyat, geçmiş."""

from __future__ import annotations

import borsapy
from fastapi import APIRouter, HTTPException, Query

from app.helpers import df_to_records, history_records, json_safe

router = APIRouter(prefix="/api/crypto", tags=["crypto"])


@router.get("/pairs")
def list_pairs(quote: str = Query("TRY", pattern="^(TRY|USDT)$")) -> dict:
    try:
        pairs = borsapy.crypto_pairs(quote=quote.upper())
    except Exception as exc:
        raise HTTPException(502, f"Çift listesi alınamadı: {exc}") from exc
    return {"pairs": pairs, "quote": quote.upper()}


@router.get("")
def crypto_overview(limit: int = Query(20, ge=1, le=100)) -> dict:
    """TRY bazlı önde gelen çiftlerin anlık özeti."""
    pairs = borsapy.crypto_pairs(quote="TRY")
    # BtcTurk sıralaması popülerlik; ilk `limit` kadarını çek
    selected = pairs[:limit]
    items: list[dict] = []
    errors: list[dict] = []
    for pair in selected:
        try:
            cur = json_safe(borsapy.Crypto(pair).current)
            items.append(cur)
        except Exception as exc:
            errors.append({"pair": pair, "error": str(exc)[:200]})
    return {"items": items, "errors": errors}


@router.get("/{pair}")
def crypto_detail(pair: str) -> dict:
    p = pair.strip().upper()
    try:
        cur = json_safe(borsapy.Crypto(p).current)
    except Exception as exc:
        raise HTTPException(404, f"Çift bulunamadı: {p} ({exc})") from exc
    return {"info": cur}


@router.get("/{pair}/history")
def crypto_history(
    pair: str,
    period: str = Query("1mo", pattern="^(1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|ytd|max)$"),
    interval: str = Query("1d", pattern="^(1m|5m|15m|30m|1h|1d|1wk|1mo)$"),
) -> dict:
    try:
        hist = borsapy.Crypto(pair.strip().upper()).history(period=period, interval=interval)
    except Exception as exc:
        raise HTTPException(502, f"Geçmiş alınamadı: {exc}") from exc
    if hist is None or hist.empty:
        return {"candles": [], "period": period, "interval": interval}
    return {"candles": history_records(hist), "period": period, "interval": interval}
