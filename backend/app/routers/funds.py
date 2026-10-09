"""TEFAS yatırım fonları: tarama, detay, getiriler, portföy dağılımı."""

from __future__ import annotations

import time

import borsapy
from fastapi import APIRouter, HTTPException, Query

from app.helpers import cached_fetch, df_to_records, history_records, json_safe

router = APIRouter(prefix="/api/funds", tags=["funds"])

_list_cache: dict[str, tuple[float, dict]] = {}
_TTL_LIST = 300  # sn — fon verileri günde bir güncellenir


@router.get("")
def list_funds(
    fund_type: str = Query("YAT", pattern="^(YAT|EMK)$", description="YAT=yatırım, EMK=emeklilik"),
    founder: str | None = Query(None, description="Kurucu adında arama"),
    limit: int = Query(100, ge=1, le=800),
) -> dict:
    cache_key = f"{fund_type}|{founder or ''}|{limit}"
    payload = cached_fetch(
        _list_cache,
        cache_key,
        _TTL_LIST,
        lambda: _fetch_fund_list(fund_type, founder, limit),
    )
    return {**payload, "cached": False}


def _fetch_fund_list(fund_type: str, founder: str | None, limit: int) -> dict:
    try:
        df = borsapy.screen_funds(fund_type=fund_type, founder=founder, limit=limit)
    except Exception as exc:
        raise HTTPException(502, f"Fon listesi alınamadı: {exc}") from exc
    if df is None or df.empty:
        return {"funds": [], "count": 0}
    records = df_to_records(df)
    return {"count": len(records), "funds": records}


@router.get("/search")
def search_funds(query: str = Query(..., min_length=2), limit: int = Query(20, ge=1, le=100)) -> dict:
    try:
        results = json_safe(borsapy.search_funds(query, limit=limit))
    except Exception as exc:
        raise HTTPException(502, f"Fon arama başarısız: {exc}") from exc
    return {"results": results or []}


@router.get("/{code}")
def fund_detail(code: str) -> dict:
    c = code.strip().upper()
    try:
        f = borsapy.Fund(c)
        info = json_safe(f.info)
        alloc = f.allocation
    except Exception as exc:
        raise HTTPException(404, f"Fon bulunamadı: {c} ({exc})") from exc
    allocation: list[dict] = []
    if alloc is not None and (not hasattr(alloc, "empty") or not alloc.empty):
        import pandas as pd

        if isinstance(alloc, dict):
            alloc = pd.DataFrame(alloc)
        allocation = df_to_records(alloc)
    return {"info": info, "allocation": allocation}


@router.get("/{code}/history")
def fund_history(
    code: str,
    period: str = Query("1mo", pattern="^(1mo|3mo|6mo|1y|2y|5y|ytd|max)$"),
) -> dict:
    try:
        hist = borsapy.Fund(code.strip().upper()).history(period=period)
    except Exception as exc:
        raise HTTPException(502, f"Fon geçmişi alınamadı: {exc}") from exc
    if hist is None or hist.empty:
        return {"candles": [], "period": period}
    return {"candles": history_records(hist), "period": period}
