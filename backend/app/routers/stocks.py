"""BIST hisseleri: liste, detay, geçmiş, finansallar, haberler."""

from __future__ import annotations

import borsapy
from fastapi import APIRouter, HTTPException, Query

from app.helpers import cached_fetch, df_to_records, history_records, json_safe
from app.validators import is_symbol

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

_list_cache: dict | None = None
_detail_cache: dict[str, tuple[float, dict]] = {}
_hist_cache: dict[str, tuple[float, dict]] = {}
_TTL_DETAIL = 60  # sn — borsapy Ticker.info'yu önbelleklemediği için biz tutuyoruz
_TTL_HIST = 300  # sn — ~15 dk gecikmeli veri için yeterli


def _company_names() -> dict[str, str]:
    """XUTUM bileşenlerinden sembol -> ad eşlemesi (borsapy 24 sa cache'ler)."""
    try:
        comps = borsapy.Index("XUTUM").components
        return {c["symbol"]: c.get("name", "") for c in comps}
    except Exception:
        return {}


@router.get("")
def list_stocks(refresh: bool = Query(False, description="Önbelleği atla")) -> dict:
    """Tüm BIST hisseleri: son fiyat, değişim %, hacim, piyasa değeri (TradingView scan)."""
    global _list_cache
    if _list_cache is not None and not refresh:
        return {"count": len(_list_cache), "stocks": _list_cache, "cached": True}

    df = borsapy.scan("XUTUM", "close > 0", limit=1000)
    if df.empty:
        raise HTTPException(502, "Hisse listesi alınamadı (TradingView scan boş döndü)")

    names = _company_names()
    records = df_to_records(df)
    stocks = []
    for rec in records:
        sym = str(rec.get("symbol", "")).upper()
        stocks.append(
            {
                "symbol": sym,
                "name": rec.get("name") or names.get(sym, ""),
                "company_name": names.get(sym, ""),
                "close": rec.get("close"),
                "change": rec.get("change"),
                "volume": rec.get("volume"),
                "market_cap": rec.get("market_cap"),
            }
        )
    stocks.sort(key=lambda s: s["symbol"])
    _list_cache = stocks
    return {"count": len(stocks), "stocks": stocks, "cached": False}


def _ticker(symbol: str) -> borsapy.Ticker:
    sym = symbol.strip().upper().removesuffix(".IS")
    if not is_symbol(sym):
        raise HTTPException(422, f"Gecersiz sembol formati: {sym[:20]}")
    try:
        return borsapy.Ticker(sym)
    except Exception as exc:
        raise HTTPException(404, f"Sembol bulunamadı: {sym} ({exc})") from exc


@router.get("/{symbol}")
def stock_detail(symbol: str) -> dict:
    sym = symbol.strip().upper().removesuffix(".IS")
    try:
        info = cached_fetch(
            _detail_cache,
            sym,
            _TTL_DETAIL,
            lambda: json_safe(_ticker(sym).info),
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(502, f"Veri alınamadı: {exc}") from exc
    return {"info": info, "cached": False}


@router.get("/{symbol}/history")
def stock_history(
    symbol: str,
    period: str = Query("1mo", pattern="^(1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|ytd|max)$"),
    interval: str = Query("1d", pattern="^(1m|5m|15m|30m|1h|1d|1wk|1mo)$"),
) -> dict:
    cache_key = f"{symbol.upper()}|{period}|{interval}"

    def _fetch() -> dict:
        try:
            hist = _ticker(symbol).history(period=period, interval=interval)
        except Exception as exc:
            raise HTTPException(502, f"Geçmiş alınamadı: {exc}") from exc
        if hist is None or hist.empty:
            return {"candles": [], "period": period, "interval": interval}
        return {
            "candles": history_records(hist),
            "period": period,
            "interval": interval,
        }

    return cached_fetch(_hist_cache, cache_key, _TTL_HIST, _fetch)


@router.get("/{symbol}/financials")
def stock_financials(
    symbol: str,
    statement: str = Query("income", pattern="^(income|balance|cashflow)$"),
    quarterly: bool = False,
) -> dict:
    t = _ticker(symbol)
    try:
        if statement == "balance":
            df = t.get_balance_sheet(quarterly=quarterly)
        elif statement == "cashflow":
            df = t.get_cashflow(quarterly=quarterly)
        else:
            df = t.get_income_stmt(quarterly=quarterly)
    except Exception as exc:
        raise HTTPException(502, f"Finansal veri alınamadı: {exc}") from exc
    if df is None or df.empty:
        return {"rows": [], "statement": statement, "quarterly": quarterly}
    return {"rows": df_to_records(df, index_name="kalem"), "statement": statement, "quarterly": quarterly}


@router.get("/{symbol}/news")
def stock_news(symbol: str) -> dict:
    t = _ticker(symbol)
    try:
        news = t.news
    except Exception as exc:
        raise HTTPException(502, f"Haberler alınamadı: {exc}") from exc
    if news is None:
        return {"news": []}
    import pandas as pd

    if isinstance(news, dict):  # kolon-odaklı dict -> kayıt listesi
        news = pd.DataFrame(news)
    if isinstance(news, pd.DataFrame):
        return {"news": df_to_records(news)}
    return {"news": [json_safe(news)]}


@router.get("/{symbol}/dividends")
def stock_dividends(symbol: str) -> dict:
    t = _ticker(symbol)
    try:
        div = t.dividends
    except Exception as exc:
        raise HTTPException(502, f"Temettü verisi alınamadı: {exc}") from exc
    if div is None or (hasattr(div, "empty") and div.empty):
        return {"dividends": []}
    if isinstance(div, dict):
        return {"dividends": [json_safe(div)]}
    import pandas as pd

    if isinstance(div, pd.Series):
        div = div.to_frame("miktar")
    return {"dividends": df_to_records(div, index_name="tarih")}


@router.get("/{symbol}/recommendations")
def stock_recommendations(symbol: str) -> dict:
    t = _ticker(symbol)
    try:
        rec = t.recommendations
    except Exception as exc:
        raise HTTPException(502, f"Analist verisi alınamadı: {exc}") from exc
    if rec is None or (hasattr(rec, "empty") and rec.empty):
        return {"recommendations": []}
    import pandas as pd

    if isinstance(rec, dict):
        return {"recommendations": [json_safe(rec)]}
    if isinstance(rec, pd.Series):
        rec = rec.to_frame("deger")
    return {"recommendations": df_to_records(rec, index_name="tarih")}
