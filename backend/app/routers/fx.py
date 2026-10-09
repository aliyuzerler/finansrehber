"""Döviz, altın, gümüş, emtia: anlık kurlar, geçmiş, banka kurları."""

from __future__ import annotations

import borsapy
from fastapi import APIRouter, HTTPException, Query

from app.helpers import df_to_records, history_records, json_safe

router = APIRouter(prefix="/api/fx", tags=["fx"])

# Öndüzende listelenecek popüler varlıklar
_POPULAR: list[dict] = [
    {"symbol": "USD", "label": "Amerikan Doları", "group": "doviz"},
    {"symbol": "EUR", "label": "Euro", "group": "doviz"},
    {"symbol": "GBP", "label": "İngiliz Sterlini", "group": "doviz"},
    {"symbol": "CHF", "label": "İsviçre Frangı", "group": "doviz"},
    {"symbol": "JPY", "label": "Japon Yeni", "group": "doviz"},
    {"symbol": "gram-altin", "label": "Gram Altın", "group": "altin"},
    {"symbol": "gram-gumus", "label": "Gram Gümüş", "group": "altin"},
    {"symbol": "gram-platin", "label": "Gram Platin", "group": "altin"},
    {"symbol": "XPT-USD", "label": "Platin (ons $)", "group": "emtia"},
    {"symbol": "XPD-USD", "label": "Paladyum (ons $)", "group": "emtia"},
    {"symbol": "brent", "label": "Brent Petrol", "group": "emtia"},
]


@router.get("")
def list_fx() -> dict:
    """Popüler döviz/altın/emtia anlık listesi."""
    items: list[dict] = []
    errors: list[dict] = []
    for meta in _POPULAR:
        try:
            cur = borsapy.FX(meta["symbol"]).current
            cur = json_safe(cur)
            cur.update(label=meta["label"], group=meta["group"])
            items.append(cur)
        except Exception as exc:
            errors.append({"symbol": meta["symbol"], "error": str(exc)[:200]})
    return {"items": items, "errors": errors}


@router.get("/{asset}")
def fx_detail(asset: str) -> dict:
    try:
        cur = json_safe(borsapy.FX(asset.strip().lower()).current)
    except Exception as exc:
        raise HTTPException(404, f"Varlık bulunamadı: {asset} ({exc})") from exc
    return {"info": cur}


@router.get("/{asset}/history")
def fx_history(
    asset: str,
    period: str = Query("1mo", pattern="^(1mo|3mo|6mo|1y|2y|5y|10y|ytd|max)$"),
) -> dict:
    try:
        hist = borsapy.FX(asset.strip().lower()).history(period=period)
    except Exception as exc:
        raise HTTPException(502, f"Geçmiş alınamadı: {exc}") from exc
    if hist is None or hist.empty:
        return {"candles": [], "period": period}
    return {"candles": history_records(hist), "period": period}


@router.get("/{asset}/bank-rates")
def fx_bank_rates(asset: str) -> dict:
    try:
        rates = borsapy.FX(asset.strip().upper()).bank_rates
    except Exception as exc:
        raise HTTPException(502, f"Banka kurları alınamadı: {exc}") from exc
    if rates is None or (hasattr(rates, "empty") and rates.empty):
        return {"rates": []}
    import pandas as pd

    if isinstance(rates, dict):
        return {"rates": [json_safe(rates)]}
    if isinstance(rates, pd.Series):
        rates = rates.to_frame("kur")
    return {"rates": df_to_records(rates, index_name="banka")}
