"""Portföy analizi: holdings -> değer, kâr/zarar, risk metrikleri, korelasyon."""

from __future__ import annotations

import datetime as dt

import borsapy
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.helpers import df_to_records, json_safe

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


class Holding(BaseModel):
    symbol: str
    shares: float = Field(gt=0)
    cost: float | None = None
    purchase_date: str | None = None


class AnalyzeRequest(BaseModel):
    holdings: list[Holding] = Field(min_length=1, max_length=50)
    benchmark: str = "XU100"
    period: str = "1y"


@router.post("/analyze")
def analyze(req: AnalyzeRequest) -> dict:
    period = req.period if req.period in ("3mo", "6mo", "1y", "2y", "5y") else "1y"

    p = borsapy.Portfolio(benchmark=req.benchmark.upper())
    default_date = (dt.date.today() - dt.timedelta(days=365)).isoformat()
    try:
        for h in req.holdings:
            p.add(
                h.symbol.strip().upper(),
                h.shares,
                cost=h.cost,
                purchase_date=h.purchase_date or default_date,
            )
    except Exception as exc:
        raise HTTPException(422, f"Pozisyon eklenemedi: {exc}") from exc

    try:
        holdings_df = p.holdings
        holdings_rows = df_to_records(holdings_df) if holdings_df is not None else []
        result = {
            "value": json_safe(p.value),
            "pnl": json_safe(p.pnl),
            "weights": json_safe(p.weights),
            "performance": json_safe(dict(p.performance)) if p.performance else {},
            "holdings": holdings_rows,
        }
        # NaN değerleri None'a indir (risk metrikleri verisiz geliyorsa)
        risk = p.risk_metrics(period=period) or {}
        result["risk"] = json_safe(risk)

        corr = p.correlation_matrix(period=period)
        result["correlation"] = json_safe(corr.to_dict()) if corr is not None else {}

        hist = p.history(period=period)
        if hist is not None and not hist.empty:
            hist = hist.copy()
            hist.columns = ["value" if i == 0 else f"series_{i}" for i in range(len(hist.columns))]
            rows = json_safe(hist.reset_index().to_dict("records"))
            result["history"] = rows
        else:
            result["history"] = []
    except Exception as exc:
        raise HTTPException(502, f"Analiz başarısız: {exc}") from exc

    return result
