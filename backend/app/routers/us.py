"""ABD borsası (Yahoo Finance / yfinance): S&P 500 çekirdeği, endeksler, detay, geçmiş."""

from __future__ import annotations

import time

import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

from app.helpers import history_records, json_safe
from app.validators import is_us_symbol

router = APIRouter(prefix="/api/us", tags=["us"])

_list_cache: tuple[float, list[dict]] | None = None
_LIST_TTL = 600  # 10 dk — Yahoo rate limit'e karşı
_indices_cache: tuple[float, list[dict]] | None = None
_INDICES_TTL = 60
_detail_cache: dict[str, tuple[float, dict]] = {}
_DETAIL_TTL = 300

US_INDICES: list[tuple[str, str]] = [
    ("^GSPC", "S&P 500"),
    ("^IXIC", "NASDAQ Composite"),
    ("^DJI", "Dow Jones Industrial"),
]


@router.get("/indices")
def us_indices() -> dict:
    global _indices_cache
    now = time.time()
    if _indices_cache is not None and now - _indices_cache[0] < _INDICES_TTL:
        return {"indices": _indices_cache[1], "cached": True}

    out: list[dict] = []
    for sym, name in US_INDICES:
        try:
            info = yf.Ticker(sym).info
            out.append(
                {
                    "symbol": sym.strip("^"),
                    "name": name,
                    "last": info.get("regularMarketPrice"),
                    "change_percent": info.get("regularMarketChangePercent"),
                    "high": info.get("regularMarketDayHigh"),
                    "low": info.get("regularMarketDayLow"),
                    "previous_close": info.get("regularMarketPreviousClose"),
                }
            )
        except Exception as exc:
            out.append({"symbol": sym.strip("^"), "name": name, "error": str(exc)[:150]})
    _indices_cache = (now, out)
    return {"indices": out, "cached": False}


@router.get("/stocks")
def us_stocks(refresh: bool = Query(False, description="Önbelleği atla")) -> dict:
    """Piyasa değerine göre en büyük 500 ABD hissesi (S&P 500 çekirdeği)."""
    global _list_cache
    if _list_cache is not None and not refresh:
        return {"count": len(_list_cache[1]), "stocks": _list_cache[1], "cached": True}

    stocks: list[dict] = []
    q = yf.EquityQuery("eq", ["region", "us"])
    for offset in (0, 250):
        try:
            r = yf.screen(q, size=250, offset=offset, sortField="intradaymarketcap", sortAsc=False)
        except Exception as exc:
            raise HTTPException(502, f"ABD hisse listesi alınamadı: {exc}") from exc
        for row in r.get("quotes", []):
            sym = row.get("symbol") or ""
            if not sym or "^" in sym or "=" in sym:
                continue
            stocks.append(
                {
                    "symbol": sym,
                    "name": row.get("shortName") or row.get("longName") or sym,
                    "price": row.get("regularMarketPrice"),
                    "change": row.get("regularMarketChangePercent"),
                    "volume": row.get("regularMarketVolume"),
                    "market_cap": row.get("marketCap"),
                    "exchange": row.get("fullExchangeName"),
                }
            )
    stocks.sort(key=lambda s: -(s.get("market_cap") or 0))
    _list_cache = (time.time(), stocks)
    return {"count": len(stocks), "stocks": stocks, "cached": False}


@router.get("/stocks/{symbol}")
def us_detail(symbol: str) -> dict:
    sym = symbol.strip().upper()
    if not is_us_symbol(sym):
        raise HTTPException(422, f"Gecersiz sembol formati: {sym[:20]}")
    now = time.time()
    cached = _detail_cache.get(sym)
    if cached is not None and now - cached[0] < _DETAIL_TTL:
        return {"info": cached[1], "cached": True}

    try:
        info = yf.Ticker(sym).info
    except Exception as exc:
        raise HTTPException(404, f"Sembol bulunamadı: {sym} ({exc})") from exc
    if not info or info.get("regularMarketPrice") is None:
        raise HTTPException(404, f"Sembol bulunamadı veya veri yok: {sym}")

    keep = [
        "symbol", "shortName", "longName", "sector", "industry", "website", "currency",
        "fullExchangeName", "currentPrice", "regularMarketPrice", "regularMarketChange",
        "regularMarketChangePercent", "regularMarketDayHigh", "regularMarketDayLow",
        "regularMarketPreviousClose", "regularMarketVolume", "marketCap", "trailingPE",
        "forwardPE", "priceToBook", "dividendYield", "trailingAnnualDividendYield",
        "fiftyTwoWeekHigh", "fiftyTwoWeekLow", "fiftyDayAverage", "twoHundredDayAverage",
        "longBusinessSummary",
    ]
    filtered = {k: info.get(k) for k in keep if info.get(k) is not None}
    filtered["symbol"] = sym
    safe = json_safe(filtered)
    _detail_cache[sym] = (now, safe)
    return {"info": safe, "cached": False}


@router.get("/stocks/{symbol}/history")
def us_history(
    symbol: str,
    period: str = Query("1mo", pattern="^(1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|ytd|max)$"),
    interval: str = Query("1d", pattern="^(1m|5m|15m|30m|1h|1d|1wk|1mo)$"),
) -> dict:
    sym = symbol.strip().upper()
    if not is_us_symbol(sym):
        raise HTTPException(422, f"Gecersiz sembol formati: {sym[:20]}")
    try:
        hist = yf.Ticker(sym).history(period=period, interval=interval, auto_adjust=True)
    except Exception as exc:
        raise HTTPException(502, f"Geçmiş alınamadı: {exc}") from exc
    if hist is None or hist.empty:
        return {"candles": [], "period": period, "interval": interval}
    hist = hist.dropna(subset=["Close"])  # yarım günlük barlarda Close boş gelebilir
    if hist.empty:
        return {"candles": [], "period": period, "interval": interval}
    return {"candles": history_records(hist), "period": period, "interval": interval}


@router.get("/stocks/{symbol}/news")
def us_news(symbol: str) -> dict:
    sym = symbol.strip().upper()
    if not is_us_symbol(sym):
        raise HTTPException(422, f"Gecersiz sembol formati: {sym[:20]}")
    try:
        news = yf.Ticker(sym).news or []
    except Exception as exc:
        # Yahoo haber API'si sık sık kısıtlar — boş listeyle yumuşak geç
        return {"news": [], "note": str(exc)[:150]}
    items = []
    for n in news:
        content = n.get("content") or n
        title = content.get("title")
        link = ""
        click = content.get("clickThroughUrl") or content.get("canonicalUrl") or {}
        if isinstance(click, dict):
            link = click.get("url", "")
        pub = content.get("pubDate") or content.get("displayTime") or ""
        if not title:
            continue
        items.append({"Title": title, "URL": link, "Date": pub, "Source": (content.get("provider") or {}).get("displayName", "")})
    return {"news": items}
