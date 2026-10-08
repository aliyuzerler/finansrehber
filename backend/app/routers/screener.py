"""Hisse tarama: temel kriterler (İş Yatırım) + teknik koşullar (TradingView)."""

from __future__ import annotations

from typing import Any

import borsapy
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.helpers import df_to_records

router = APIRouter(prefix="/api/screener", tags=["screener"])


@router.get("/criteria")
def criteria() -> dict:
    try:
        items = borsapy.screener_criteria()
    except Exception as exc:
        raise HTTPException(502, f"Kriterler alınamadı: {exc}") from exc
    sectors: list[str] = []
    try:
        sectors = borsapy.sectors() or []
    except Exception:
        pass
    return {"criteria": items, "sectors": sectors, "templates": borsapy.Screener.TEMPLATES}


@router.get("/stocks")
def screen_stocks(
    template: str | None = None,
    sector: str | None = None,
    index: str | None = None,
    recommendation: str | None = None,
    market_cap_min: float | None = None,
    market_cap_max: float | None = None,
    pe_min: float | None = None,
    pe_max: float | None = None,
    pb_max: float | None = None,
    dividend_yield_min: float | None = None,
    upside_potential_min: float | None = None,
    net_margin_min: float | None = None,
    roe_min: float | None = None,
) -> dict:
    kwargs: dict[str, Any] = {}
    for key, value in locals().items():
        if key == "kwargs" or value is None:
            continue
        kwargs[key] = value
    try:
        df = borsapy.screen_stocks(**kwargs)
    except Exception as exc:
        raise HTTPException(502, f"Tarama başarısız: {exc}") from exc
    if df is None or df.empty:
        return {"results": [], "count": 0, "columns": []}
    records = df_to_records(df)
    return {"count": len(records), "columns": list(df.columns), "results": records}


class ScanRequest(BaseModel):
    universe: str = "XU030"
    condition: str = "rsi < 30"
    interval: str = "1d"
    limit: int = 100


@router.post("/scan")
def technical_scan(req: ScanRequest) -> dict:
    interval = req.interval
    if interval not in ("1m", "5m", "15m", "30m", "1h", "4h", "1d", "1W", "1M"):
        raise HTTPException(422, "Geçersiz interval")
    try:
        df = borsapy.scan(req.universe.upper(), req.condition, interval=interval, limit=req.limit)
    except Exception as exc:
        raise HTTPException(502, f"Teknik tarama başarısız: {exc}") from exc
    if df is None or df.empty:
        return {"results": [], "count": 0}
    records = df_to_records(df)
    return {"count": len(records), "results": records}
