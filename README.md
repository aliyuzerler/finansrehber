# FinansRehber

Türk finans piyasaları için masaüstü web panosu — [borsapy](https://github.com/saidsurucu/borsapy) kütüphanesinden veri çeker.

**Tasarım:** siyah + kırmızı, keskin çizgiler (oval/yuvarlak öğe yok), monospace rakamlar, yoğun finans görünümü.

## Kategoriler

| Sayfa | İçerik | Veri kaynağı |
|---|---|---|
| Ana Sayfa | Piyasa özeti: endeksler, döviz, altın/emtia, kripto | TradingView, canlidoviz, BtcTurk |
| Hisseler | 580+ BIST hissesi, arama/sıralama, detay (grafik, finansallar, temettü, KAP haberi, analist) | TradingView, İş Yatırım, KAP |
| Endeksler | 33 BIST endeksi + bileşen hisseler | TradingView |
| Döviz & Altın | USD/EUR/GBP, gram altın/gümüş, Brent + 1 yıllık grafik | canlidoviz/doviz.com |
| Kripto | BtcTurk TRY pariteleri + grafik | BtcTurk |
| Fonlar | TEFAS yatırım/emeklilik fonları, getiriler, portföy dağılımı, risk | TEFAS |
| Tarama | Temel şablon/filtreler (F/K, temettü…) + teknik koşullar (RSI, MACD) | İş Yatırım, TradingView |
| Portföy | Pozisyon takibi, kâr/zarar, Sharpe/beta/korelasyon (veriler tarayıcıda) | borsapy Portfolio |
| Makro | Politika faizi, TÜFE, tahvil faizleri | TCMB |
| VIOP | Vadeli işlem sözleşmeleri | İş Yatırım |
| Takvim | Haftalık ekonomik takvim, önem filtresi | investing kaynaklı |

## Kurulum (Windows)

Gereksinimler: Python 3.10+, Node 18+

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

## Çalıştırma

İki yol:

1. **Kolay yol:** Proje kökünde `baslat.bat` dosyasına çift tıkla (iki pencere açar: backend 8000, frontend 5173).
2. **Elle:**
   ```bash
   # Terminal 1
   cd backend
   .venv\Scripts\python -m uvicorn app.main:app --port 8000
   # Terminal 2
   cd frontend
   npm run dev
   ```

Tarayıcı: **http://localhost:5173**

## Mimari

```
finansrehber/
├─ backend/           FastAPI (port 8000)
│  └─ app/
│     ├─ main.py      CORS + router bağları
│     ├─ helpers.py   JSON serileştirme (NaN/pandas uyumu)
│     └─ routers/     market, stocks, indices, fx, crypto, funds,
│                     screener, portfolio, macro
└─ frontend/          Vite + React 19 + TypeScript + Tailwind v4 (port 5173)
   └─ src/
      ├─ api/         axios istemcisi + tipler (/api proxy → 8000)
      ├─ components/  Layout, PriceChart, StatCard, ChangeBadge…
      ├─ pages/       Ana Sayfa, Hisseler, Detay, Endeksler, Döviz,
      │               Kripto, Fonlar, Tarama, Portföy, Makro, VIOP, Takvim
      └─ lib/         tr-TR biçimlendirme
```

Önbellekleme: borsapy içinde TTL önbellek (fiyat 60 sn, grafik 1 saat, finansallar 24 saat) + FastAPI tarafında piyasa özeti 60 sn / endeks listesi 120 sn.

## Bilinen notlar

- Veriler **~15 dakika gecikmelidir** (ücretsiz katman). Canlı veri için ücretli TradingView hesabı gerekir.
- Veriler kişisel/eğitim amaçlıdır; ticari kullanım Borsa İstanbul lisansı gerektirir. **Yatırım tavsiyesi değildir.**
- borsapy "alpha" bir kütüphanedir; kaynak siteler değişirse bazı uçlar hata verebilir.
- İlk istekler yavaştır (kaynak sitelerden ilk çekim); sonrasında önbellek devreye girer.
- Portföy verileri yalnızca tarayıcınızın localStorage'ında tutulur, sunucuya kaydedilmez.

## Test

Her faz sonunda:
- Backend: her endpoint `curl` ile 200 + veri doğrulaması
- Frontend: `npm run build` (TS kontrolü) + tarayıcıda uçtan uca gezinti
- Görsel: her sayfa ekran görüntüsüyle bağımsız görsel denetimden geçirildi
