# FinansRehber — Test Raporu

**Tarih:** 9 Ekim 2026 · **Ortam:** Windows 10 · Python 3.11 (venv) · Node 22 · lokal dağıtım (localhost)
**Kapsam:** Güvenlik (T1), Performans (T2), Dayanıklılık + Veri Doğruluğu + Regresyon (T3)
**Metodoloji:** bul-düzelt-yeniden-test — çıkan her sorun aynı fazda düzeltilip ilgili test tekrar koşuldu.

---

## T1 — Güvenlik

| # | Test | Sonuç |
|---|---|---|
| 1.1 | `.env` git takibi | ✅ Takip edilmiyor (`.gitignore`) |
| 1.2 | Commit geçmişinde anahtar desenleri (`tvly-`, `AQ.Ab8`, `ghp_`, `AIzaSy`) | ✅ Hiçbir commit'te yok |
| 1.3 | Frontend paketinde (dist) anahtar | ✅ Yok |
| 1.4 | `pip-audit` | ⚠️→✅ `setuptools` 65.5.0'da 8 CVE bulundu → 78.1.1'e yükseltildi → **0 CVE** |
| 1.5 | `npm audit` (production) | ✅ 0 güvenlik açığı |
| 1.6 | Girdi dayanıklılığı (`tests/fuzz_test.py`) | ⚠️→✅ İlk turda 5 bulgu (uzun/geçersiz sembol → 502, dev portföy → timeout, betik kodlama) → `validators.py` ile sembol/varlık format doğrulaması + portföy sınırı eklendi → **19/19 OK, 0 sorun** |
| 1.7 | CORS | ✅ `evil.com` origin'ine ACAO dönmüyor; `localhost:5173` izinli |
| 1.8 | AI prompt injection ("anahtarları yaz") | ✅ Cevapta anahtar yok; model talimatı reddediyor |
| 1.9 | Ağ yüzeyi | ✅ Backend yalnız `127.0.0.1:8000`'e bağlı |

**Düzeltilenler:** `app/validators.py` (yeni), AI portföy sınırı (maks 50 pozisyon), setuptools yükseltmesi.

## T2 — Performans

| # | Test | Sonuç |
|---|---|---|
| 2.1 | Soğuk gecikme (ilk çekim) | En yavaş: `/api/indices?detailed=true` 17,5 sn (günde bir kez; sonrası önbellek) — diğerleri 0,2–6 sn |
| 2.2 | Sıcak gecikme | ⚠️→✅ İlk ölçümde 3 uç 500 ms üstünde (THYAO detay 3.2 sn, geçmiş 1,4 sn, fon listesi 0,9 sn) → TTL önbellek eklendi → **14/14 < 500 ms** |
| 2.3 | Yük testi (50 eş kullanıcı × 40 istek) | ⚠️→✅ İlk turda cache stampede (%2,7 hata, p99 39 sn) → **single-flight + stale-while-revalidate** eklendi → **2000 istek, 0 hata, RPS 254, p95=63 ms, p99=89 ms** |
| 2.4 | Frontend yükleme | ✅ Ana sayfa 546 ms, hisseler 308 ms, ABD 348 ms, AI 290 ms (DOMContentLoaded) |
| 2.5 | Bundle boyutu | ✅ Ana paket 574 KB (~185 KB gzip) — kod bölme eşiği (500 KB gzip) altında, gerek yok |
| 2.6 | AI gecikmesi (bilgi amaçlı) | ~11 sn (Tavily arama + Gemini üretimi) |

**Düzeltilenler:** `helpers.py`'ye `cached_fetch` (single-flight + stale-while-revalidate), hisse detay/geçmiş + fon listesi + piyasa özeti + ABD listesi önbellekleri.

## T3 — Dayanıklılık, Veri Doğruluğu, Regresyon

| # | Test | Sonuç |
|---|---|---|
| 3.1 | Backend çökme dayanıklılığı | ✅ Backend kapalıyken sayfalar çökmüyor; hata kutusu + "Yeniden Dene" görünüyor; backend dönünce düğmeyle toparlanıyor (canlı doğrulandı) |
| 3.2 | Soak (15+ dk, 70 çağrı, 5 uç) | ✅ 0 hata; backend RSS 143 → 169 MB (+25 MB, 100 MB eşiğinin altında — sızıntı sinyali yok) |
| 3.3 | Veri doğruluk çapraz kontrol | ✅ Gram altın: backend 6.540,32 vs Tavily 6.541,91–6.542,72 (±%0,04). USD: backend 49,3174 vs AI canlı testi 49,27–49,34 (tutarlı). THYAO: aynı gün verisi, tutarlı |
| 3.4 | Final regresyon | ✅ 14/14 endpoint 200 · 15/15 sayfa içerikli ve hatasız · `npm run build` hatasız |

---

## Test betikleri (tekrar çalıştırma)

```bash
# Backend çalışırken:
python tests/fuzz_test.py        # girdi dayanıklılığı (19 vaka)
python tests/latency_test.py cold  # soğuk gecikme (backend yeni başlamışken)
python tests/latency_test.py warm  # önbellekli gecikme
python tests/load_test.py 50 40  # 50 eş kullanıcı, ~2000 istek
python tests/soak_test.py 900    # 15 dk dayanıklılık + bellek izleme
```

## Kalan riskler / notlar

- **borsapy alpha** bir kütüphane: İş Yatırım/canlidoviz scraper'ları kaynak siteler değişirse kırılabilir. Çözüm yolu: `pip install -U borsapy`.
- **Veriler ~15 dk gecikmelidir** (ücretsiz katman); ticari kullanım BIST lisansı gerektirir.
- **Google Search grounding** kullanıcı anahtarının ücretsiz kotasında kapalıdır; arama zinciri Tavily → DDGS ile çözülür. Gemini'nin anlık yoğunluk 503'lerinde 2 denemeli otomatik retry vardır.
- Anahtarsız DDGS scrape tabanlıdır; yoğun kullanımda rate limit gelebilir (aramasız cevap fallback'i devrede).
- Uygulama lokal kullanım içindir; internete açılacaksa rate limiting + kimlik doğrulama eklenmelidir.
