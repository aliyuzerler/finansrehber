"""Makro göstergeler, VIOP sözleşmeleri ve ekonomik takvim."""

from __future__ import annotations

import borsapy
from fastapi import APIRouter, HTTPException, Query

from app.helpers import df_to_records, json_safe

router = APIRouter(prefix="/api", tags=["macro"])


@router.get("/macro")
def macro_overview() -> dict:
    result: dict = {}
    errors: list[dict] = []

    try:
        result["policy_rate"] = borsapy.policy_rate()
    except Exception as exc:
        errors.append({"item": "policy_rate", "error": str(exc)[:150]})

    try:
        inf = borsapy.Inflation()
        result["inflation_tufe"] = json_safe(inf.latest("TUFE"))
    except Exception as exc:
        try:
            result["inflation_tufe"] = json_safe(inf.latest())
        except Exception as exc2:
            errors.append({"item": "inflation", "error": str(exc2)[:150]})

    try:
        result["bonds"] = df_to_records(borsapy.bonds())
    except Exception as exc:
        errors.append({"item": "bonds", "error": str(exc)[:150]})

    try:
        from borsapy import TCMB

        result["tcmb"] = {
            "policy_rate": borsapy.TCMB().policy_rate,
            "overnight": borsapy.TCMB().overnight,
        }
    except Exception:
        pass

    result["errors"] = errors
    return result


@router.get("/calendar")
def economic_calendar(
    period: str = Query("1w", pattern="^(1d|1w|2w|1mo)$"),
    importance: str | None = Query(None, pattern="^(low|mid|high)$"),
) -> dict:
    try:
        cal = borsapy.economic_calendar(period=period, importance=importance)
    except Exception as exc:
        raise HTTPException(502, f"Takvim alınamadı: {exc}") from exc
    if cal is None or cal.empty:
        return {"events": [], "count": 0}
    records = df_to_records(cal)
    return {"count": len(records), "events": records}


@router.get("/viop")
def viop_list() -> dict:
    try:
        v = borsapy.VIOP()
        futures = v.futures
        options = v.options
    except Exception as exc:
        raise HTTPException(502, f"VIOP verisi alınamadı: {exc}") from exc
    return {
        "futures": df_to_records(futures) if futures is not None else [],
        "options_count": 0 if options is None else len(options),
    }
