"""Rehber AI — Gemini tabanlı sesli finans asistanı backend'i.

Soru + sohbet geçmişi + (opsiyonel) bizim verilerimizden bağlam → Gemini
(google_search grounding) → cevap + kaynak URL'leri.
"""

from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.helpers import json_safe

router = APIRouter(prefix="/api/ai", tags=["ai"])

SYSTEM_PROMPT = """Sen "Rehber AI"sın — FinansRehber uygulamasının kişisel finans asistanısın.
Kullanıcının seninle birebir sohbet eden, sesli konuştuğu kişisel finans danışmanı olacaksın.

Kurallar:
- Her zaman Türkçe, samimi ama profesyonel konuş. Kullanıcıya "siz" diye hitap et.
- Sayısal verileri (fiyat, getiri, risk) mümkün olduğunca sana verilen BAĞLAM bloğundan al; bağlamda yoksa güncel veri için google_search aracını KULLAN.
- Kaynak kullandıysan cevabın sonunda "Kaynaklar:" başlığıyla linkleri metin olarak say.
- Cevaplar kısa ve net olsun: önce doğrudan cevap, sonra 2-4 madde gerekçe. Gereksiz uzun yazma (kullanıcı sesli dinleyecek).
- Asla kesin yatırım tavsiyesi verme ("kesinlikle al" değil); senaryoları ve riskleri açıkla, kararı kullanıcıya bırak.
- Uygun olduğunda cevabı "Yatırım tavsiyesi değildir" cümlesiyle kapat.
- Riskli/spekülatif konularda (kaldıraç, kripto vb.) bilinçli risk uyarısı ekle."""


class HistoryMessage(BaseModel):
    role: str = Field(pattern="^(user|model)$")
    text: str = Field(min_length=1, max_length=8000)


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=30)
    context_type: str | None = Field(None, pattern="^(fund|stock|us_stock|portfolio)$")
    context_id: str | None = None
    portfolio: list[dict] | None = Field(None, description="[{symbol, shares, cost}]")


def _client():
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        raise HTTPException(
            503,
            "GEMINI_API_KEY tanımlı değil. backend/.env dosyasına GEMINI_API_KEY=... ekleyip backend'i yeniden başlatın. (Ücretsiz anahtar: aistudio.google.com/apikey)",
        )
    from google import genai

    return genai.Client(api_key=key)


def _fund_context(code: str) -> str:
    import borsapy

    f = borsapy.Fund(code.strip().upper())
    i = json_safe(f.info)
    alloc = f.allocation
    dağılım = ""
    if alloc is not None and (not hasattr(alloc, "empty") or not alloc.empty):
        import pandas as pd

        if isinstance(alloc, dict):
            alloc = pd.DataFrame(alloc)
        rows = [f"  - {r.get('asset_name')}: {r.get('weight')}%" for _, r in alloc.head(8).iterrows()]
        dağılım = "Portföy dağılımı:\n" + "\n".join(rows)
    return (
        f"TEFAS fonu {i.get('fund_code')} — {i.get('name')}\n"
        f"Fiyat: {i.get('price')} TL | Fon büyüklüğü: {i.get('fund_size')} TL | Yatırımcı: {i.get('investor_count')}\n"
        f"Kategori: {i.get('category')} (sıra {i.get('category_rank')}/{i.get('category_fund_count')}) | Risk: {i.get('risk_value')}/7\n"
        f"Getiriler: günlük {i.get('daily_return')}%, 1 ay {i.get('return_1m')}%, 3 ay {i.get('return_3m')}%, "
        f"6 ay {i.get('return_6m')}%, yıl başı {i.get('return_ytd')}%, 1 yıl {i.get('return_1y')}%\n"
        f"{dağılım}"
    )


def _stock_context(symbol: str) -> str:
    import borsapy

    t = borsapy.Ticker(symbol.strip().upper())
    i = t.info
    return (
        f"BIST hissesi {i.get('symbol')} — {i.get('longBusinessSummary', '')[:150]}\n"
        f"Sektör: {i.get('sector')} | Faaliyet: {i.get('industry')}\n"
        f"Fiyat: {i.get('last')} TL | Değişim: {i.get('change_percent')}% | Hacim: {i.get('volume')}\n"
        f"Piyasa değeri: {i.get('marketCap')} TL | F/K: {i.get('trailingPE')} | PD/DD: {i.get('priceToBook')} | Temettü verimi: {i.get('dividendYield')}\n"
        f"52 hafta: {i.get('fiftyTwoWeekLow')} - {i.get('fiftyTwoWeekHigh')} | 50G ort: {i.get('fiftyDayAverage')} | 200G ort: {i.get('twoHundredDayAverage')}"
    )


def _us_stock_context(symbol: str) -> str:
    import yfinance as yf

    i = yf.Ticker(symbol.strip().upper()).info
    return (
        f"ABD hissesi {i.get('symbol')} — {i.get('longName')}\n"
        f"Sektör: {i.get('sector')} | Borsa: {i.get('fullExchangeName')} | Para birimi: {i.get('currency')}\n"
        f"Fiyat: {i.get('currentPrice') or i.get('regularMarketPrice')} $ | Değişim: {i.get('regularMarketChangePercent')}%\n"
        f"Piyasa değeri: {i.get('marketCap')} $ | F/K: {i.get('trailingPE')} | PD/DD: {i.get('priceToBook')} | Temettü: {i.get('dividendYield')}\n"
        f"52 hafta: {i.get('fiftyTwoWeekLow')} - {i.get('fiftyTwoWeekHigh')}\n"
        f"Özet: {str(i.get('longBusinessSummary', ''))[:300]}"
    )


def _portfolio_context(holdings: list[dict]) -> str:
    import borsapy

    lines = ["Kullanıcının portföyü:"]
    toplam_deger = 0.0
    toplam_maliyet = 0.0
    for h in holdings[:30]:
        sym = str(h.get("symbol", "")).upper()
        shares = float(h.get("shares") or 0)
        cost = h.get("cost")
        try:
            price = borsapy.Ticker(sym).fast_info["last_price"] or 0
        except Exception:
            price = 0
        value = price * shares
        cost_value = float(cost or 0) * shares
        toplam_deger += value
        toplam_maliyet += cost_value
        pnl = value - cost_value if cost else None
        pnl_txt = f" | K/Z: {pnl:+.0f} TL" if cost else ""
        lines.append(f"  - {sym}: {shares} lot × {price:.2f} TL = {value:.0f} TL{pnl_txt}")
    if toplam_maliyet > 0:
        lines.append(
            f"Toplam değer: {toplam_deger:.0f} TL | Toplam maliyet: {toplam_maliyet:.0f} TL | "
            f"Toplam K/Z: {toplam_deger - toplam_maliyet:+.0f} TL"
        )
    return "\n".join(lines)


def _build_context(req: AskRequest) -> str:
    """Bağlam bloğu üretir; tek kaynağın hatası bloğu düşürmez."""
    parts: list[str] = []
    try:
        if req.context_type == "fund" and req.context_id:
            parts.append(_fund_context(req.context_id))
        elif req.context_type == "stock" and req.context_id:
            parts.append(_stock_context(req.context_id))
        elif req.context_type == "us_stock" and req.context_id:
            parts.append(_us_stock_context(req.context_id))
    except Exception as exc:
        parts.append(f"(Bağlam verisi alınamadı: {str(exc)[:100]})")
    if req.portfolio:
        try:
            parts.append(_portfolio_context(req.portfolio))
        except Exception as exc:
            parts.append(f"(Portföy verisi alınamadı: {str(exc)[:100]})")
    return "\n\n".join(parts)


@router.post("/ask")
def ask(req: AskRequest) -> dict:
    client = _client()
    from google.genai import types

    context_text = _build_context(req)
    user_text = req.question
    if context_text:
        user_text = f"[BAĞLAM — FinansRehber canlı verileri]\n{context_text}\n[/BAĞLAM]\n\nSoru: {req.question}"
    else:
        user_text = f"Soru: {req.question}"

    contents: list[types.Content] = []
    for msg in req.history:
        contents.append(
            types.Content(
                role=msg.role,
                parts=[types.Part(text=msg.text)],
            )
        )
    contents.append(types.Content(role="user", parts=[types.Part(text=user_text)]))

    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    try:
        resp = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=[types.Tool(google_search=types.GoogleSearch())],
                temperature=0.4,
            ),
        )
    except Exception as exc:
        raise HTTPException(502, f"Gemini hatası: {str(exc)[:200]}") from exc

    answer = resp.text or ""
    if not answer:
        raise HTTPException(502, "Gemini boş yanıt döndü")

    sources: list[dict] = []
    queries: list[str] = []
    try:
        cand = resp.candidates[0]
        meta = getattr(cand, "grounding_metadata", None)
        if meta:
            for chunk in getattr(meta, "grounding_chunks", None) or []:
                web = getattr(chunk, "web", None)
                if web is not None and getattr(web, "uri", None):
                    sources.append({"title": getattr(web, "title", "") or web.uri, "url": web.uri})
            queries = list(getattr(meta, "web_search_queries", None) or [])
    except Exception:
        pass

    # sohbet hafızası için sadeleştirilmiş soruyu kaydet (bağlam bloğu olmadan)
    return {"answer": answer, "sources": sources, "search_queries": queries, "model": model}
