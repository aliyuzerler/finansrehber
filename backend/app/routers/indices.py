"""BIST endeksleri: liste, detay, geçmiş, bileşenler."""

from __future__ import annotations

import borsapy
from fastapi import APIRouter, HTTPException, Query

from app.helpers import df_to_records, history_records, json_safe

router = APIRouter(prefix="/api/indices", tags=["indices"])


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

    enriched = []
    for rec in records:
        sym = str(rec.get("symbol", ""))
        try:
            info = borsapy.Index(sym).info
            rec.update(
                last=info.get("last"),
                change=info.get("change"),
                change_percent=info.get("change_percent"),
            )
        except Exception:
            pass
        enriched.append(rec)
    return {"indices": enriched}


@router.get("/{symbol}")
def index_detail(symbol: str) -> dict:
    sym = symbol.strip().upper()
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
    try:
        hist = borsapy.Index(symbol.strip().upper()).history(period=period, interval=interval)
    except Exception as exc:
        raise HTTPException(502, f"Endeks geçmişi alınamadı: {exc}") from exc
    if hist is None or hist.empty:
        return {"candles": [], "period": period, "interval": interval}
    return {"candles": history_records(hist), "period": period, "interval": interval}


@router.get("/{symbol}/components")
def index_components(symbol: str) -> dict:
    try:
        comps = borsapy.Index(symbol.strip().upper()).components
    except Exception as exc:
        raise HTTPException(502, f"Bileşenler alınamadı: {exc}") from exc
    return {"components": json_safe(comps) or []}
