import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, apiErrorMessage } from "../api/client";
import type {
  Candle,
  DividendRow,
  FinancialRow,
  HistoryResponse,
  NewsItem,
  StockInfo,
} from "../api/types";
import ChangeBadge from "../components/ChangeBadge";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import PriceChart from "../components/PriceChart";
import { fmtCompact, fmtDate, fmtNum, fmtPct, fmtPrice } from "../lib/format";

const PERIODS = [
  { key: "1mo", label: "1A" },
  { key: "3mo", label: "3A" },
  { key: "6mo", label: "6A" },
  { key: "1y", label: "1Y" },
  { key: "5y", label: "5Y" },
  { key: "max", label: "MAX" },
];

const TABS = ["Özet", "Finansallar", "Haberler", "Temettü", "Analist"] as const;
type Tab = (typeof TABS)[number];

/** borsapy website alanı bazen "a.com / http://b.com" gibi birleşik gelir — yalnız geçerli URL link olur. */
function websiteLink(website: unknown) {
  if (!website) return "—";
  const raw = String(website).trim();
  const first = raw.split(/\s*\/\s*/)[0] ?? raw;
  const url = /^https?:\/\//i.test(first)
    ? first
    : /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(first)
      ? `https://${first}`
      : null;
  if (!url) return raw || "—";
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-accent no-underline hover:underline">
      {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
    </a>
  );
}

function statCell(label: string, value: string) {
  return (
    <div className="border border-line bg-panel px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function FinancialsPanel({ symbol }: { symbol: string }) {
  const [statement, setStatement] = useState<"income" | "balance" | "cashflow">("income");
  const [quarterly, setQuarterly] = useState(false);
  const [rows, setRows] = useState<FinancialRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    setError(null);
    api
      .get<{ rows: FinancialRow[] }>(`/stocks/${symbol}/financials`, {
        params: { statement, quarterly },
      })
      .then(({ data }) => setRows(data.rows))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [symbol, statement, quarterly]);

  const periods = rows && rows.length > 0 ? Object.keys(rows[0]).filter((k) => k !== "kalem") : [];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            ["income", "Gelir Tablosu"],
            ["balance", "Bilanço"],
            ["cashflow", "Nakit Akış"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatement(key)}
            className={`border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
              statement === key
                ? "border-accent bg-accent text-white"
                : "border-line bg-panel text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setQuarterly((q) => !q)}
          className={`border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
            quarterly
              ? "border-accent bg-accent text-white"
              : "border-line bg-panel text-muted hover:text-ink"
          }`}
        >
          {quarterly ? "Çeyreklik" : "Yıllık"}
        </button>
      </div>

      {error && <ErrorBox message={error} />}
      {!rows && !error && <LoadingBlock rows={6} />}
      {rows && rows.length === 0 && (
        <p className="border border-line bg-panel p-4 text-sm text-muted">Finansal veri bulunamadı.</p>
      )}
      {rows && rows.length > 0 && (
        <div className="max-h-[520px] overflow-auto border border-line bg-panel">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0">
              <tr className="bg-panel-2">
                <th className="sticky left-0 z-10 bg-panel-2 px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wider text-muted">
                  Kalem
                </th>
                {periods.map((p) => (
                  <th
                    key={p}
                    className="px-3 py-2 text-right font-mono text-[11px] uppercase tracking-wider text-muted"
                  >
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.kalem} className="border-b border-line/50 hover:bg-panel-2">
                  <td className="sticky left-0 z-10 max-w-[280px] truncate bg-panel px-3 py-1.5 text-muted">
                    {r.kalem}
                  </td>
                  {periods.map((p) => {
                    const v = r[p];
                    const num = typeof v === "number" ? v : null;
                    return (
                      <td
                        key={p}
                        className={`px-3 py-1.5 text-right font-mono tabular-nums ${
                          num !== null && num < 0 ? "text-down" : "text-ink"
                        }`}
                      >
                        {num === null ? (v == null ? "—" : String(v)) : fmtCompact(num)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-faint">
        Değerler milyon/bilyon TL kısaltmasıyla (mlr/mln/bin) gösterilir · Kaynak: İş Yatırım
      </p>
    </div>
  );
}

function NewsPanel({ symbol }: { symbol: string }) {
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ news: NewsItem[] }>(`/stocks/${symbol}/news`)
      .then(({ data }) => setNews(data.news))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [symbol]);

  if (error) return <ErrorBox message={error} />;
  if (!news) return <LoadingBlock rows={5} />;
  if (news.length === 0)
    return <p className="border border-line bg-panel p-4 text-sm text-muted">Haber bulunamadı.</p>;

  return (
    <ul className="divide-y divide-line border border-line bg-panel">
      {news.map((n, i) => (
        <li key={i} className="px-4 py-3 hover:bg-panel-2">
          <a href={n.URL} target="_blank" rel="noreferrer" className="block no-underline">
            <p className="font-mono text-[11px] text-faint">{n.Date}</p>
            <p className="mt-1 text-sm text-ink hover:text-accent">{n.Title}</p>
          </a>
        </li>
      ))}
    </ul>
  );
}

function DividendsPanel({ symbol }: { symbol: string }) {
  const [divs, setDivs] = useState<DividendRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ dividends: DividendRow[] }>(`/stocks/${symbol}/dividends`)
      .then(({ data }) => setDivs(data.dividends))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [symbol]);

  if (error) return <ErrorBox message={error} />;
  if (!divs) return <LoadingBlock rows={4} />;
  if (divs.length === 0)
    return <p className="border border-line bg-panel p-4 text-sm text-muted">Temettü kaydı yok.</p>;

  return (
    <div className="overflow-x-auto border border-line bg-panel">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-panel-2">
            {["Tarih", "Hisse Başı (₺)", "Brüt Oran (%)", "Net Oran (%)", "Toplam (₺)"].map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left font-mono text-[11px] font-semibold uppercase tracking-wider text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {divs.map((d, i) => (
            <tr key={i} className="border-b border-line/50">
              <td className="px-3 py-2 font-mono text-muted">{fmtDate(d.tarih)}</td>
              <td className="px-3 py-2 font-mono tabular-nums text-ink">{fmtNum(d.Amount)}</td>
              <td className="px-3 py-2 font-mono tabular-nums text-muted">{fmtNum(d.GrossRate)}</td>
              <td className="px-3 py-2 font-mono tabular-nums text-muted">{fmtNum(d.NetRate)}</td>
              <td className="px-3 py-2 font-mono tabular-nums text-muted">
                {d.TotalDividend ? fmtCompact(d.TotalDividend) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface RecommendationRow {
  recommendation?: string;
  target_price?: number;
  upside_potential?: number;
  [key: string]: unknown;
}

function RecommendationsPanel({ symbol }: { symbol: string }) {
  const [recs, setRecs] = useState<RecommendationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ recommendations: RecommendationRow[] }>(`/stocks/${symbol}/recommendations`)
      .then(({ data }) => setRecs(data.recommendations))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [symbol]);

  if (error) return <ErrorBox message={error} />;
  if (!recs) return <LoadingBlock rows={3} />;
  if (recs.length === 0)
    return <p className="border border-line bg-panel p-4 text-sm text-muted">Analist önerisi yok.</p>;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {recs.map((r, i) => {
        const rec = String(r.recommendation ?? "").toUpperCase();
        const positive = rec.startsWith("AL") || rec.includes("BUY") || rec.includes("OVER");
        return (
          <div key={i} className="border border-line border-t-2 border-t-accent bg-panel p-4">
            <p
              className={`font-mono text-lg font-bold uppercase ${
                positive ? "text-up" : rec ? "text-down" : "text-muted"
              }`}
            >
              {r.recommendation || "—"}
            </p>
            <p className="mt-2 font-mono text-sm text-ink">
              Hedef: {r.target_price ? `₺${fmtNum(r.target_price)}` : "—"}
            </p>
            <p className="mt-1 font-mono text-xs text-muted">
              Potansiyel: {r.upside_potential ? fmtPct(r.upside_potential) : "—"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function StockDetailPage() {
  const { symbol = "" } = useParams<{ symbol: string }>();
  const [info, setInfo] = useState<StockInfo | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [period, setPeriod] = useState("1mo");
  const [tab, setTab] = useState<Tab>("Özet");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(
    async (p: string) => {
      try {
        const { data } = await api.get<HistoryResponse>(`/stocks/${symbol}/history`, {
          params: { period: p },
        });
        setCandles(data.candles);
      } catch {
        setCandles([]);
      }
    },
    [symbol],
  );

  // Sembol değişince şirket bilgisi
  useEffect(() => {
    setLoading(true);
    setInfo(null);
    setError(null);
    api
      .get<{ info: StockInfo }>(`/stocks/${symbol}`)
      .then(({ data }) => setInfo(data.info))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [symbol]);

  // Sembol veya dönem değişince grafik verisi
  useEffect(() => {
    loadHistory(period);
  }, [symbol, loadHistory, period]);

  const changePct = info?.change_percent ?? null;

  return (
    <div>
      <Link
        to="/hisseler"
        className="font-mono text-[11px] uppercase tracking-widest text-muted no-underline hover:text-accent"
      >
        ← Tüm Hisseler
      </Link>

      {error && (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      )}
      {loading && !info && (
        <div className="mt-4">
          <LoadingBlock rows={6} label={`${symbol} verileri yükleniyor`} />
        </div>
      )}

      {info && (
        <>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-mono text-3xl font-extrabold tracking-tight text-ink">
                  {info.symbol}
                </h1>
                {info.sector && (
                  <span className="border border-line bg-panel-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {info.sector}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">{info.longBusinessSummary?.slice(0, 90) || info.name}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl font-bold tabular-nums text-ink">
                ₺{fmtPrice(info.last)}
              </p>
              <div className="mt-1 flex items-center justify-end gap-2">
                <ChangeBadge percent={changePct} />
                <span className="font-mono text-xs text-faint">
                  {info.update_time ? fmtDate(info.update_time) : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {statCell("F/K", fmtNum(info.trailingPE))}
            {statCell("PD/DD", fmtNum(info.priceToBook))}
            {statCell(
              "Temettü Verimi",
              info.dividendYield
                ? `${fmtNum(info.dividendYield)}%`
                : info.trailingAnnualDividendYield
                  ? `${fmtNum(info.trailingAnnualDividendYield)}%`
                  : "—",
            )}
            {statCell("Piyasa Değeri", info.marketCap ? `₺${fmtCompact(info.marketCap)}` : "—")}
            {statCell("Hacim", fmtCompact(info.volume))}
            {statCell("52H Yüksek", fmtPrice(info.fiftyTwoWeekHigh))}
            {statCell("52H Düşük", fmtPrice(info.fiftyTwoWeekLow))}
            {statCell("50G Ort.", fmtPrice(info.fiftyDayAverage))}
            {statCell("200G Ort.", fmtPrice(info.twoHundredDayAverage))}
            {statCell("Yabancı Oranı", info.foreignRatio ? `${fmtNum(info.foreignRatio, 1)}%` : "—")}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
                    period === p.key
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-panel text-muted hover:text-ink"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-faint">
                ~15 dk gecikmeli
              </span>
            </div>
            <PriceChart candles={candles} />
          </div>

          <div className="mt-6 border-b border-line">
            <nav className="flex flex-wrap gap-1">
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`-mb-px border-b-2 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider ${
                    tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-4">
            {tab === "Özet" && (
              <div className="border border-line bg-panel p-5">
                <h3 className="font-mono text-xs uppercase tracking-widest text-accent">
                  Şirket Özeti
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {info.longBusinessSummary || "Şirket özeti bulunamadı."}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line pt-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">Sektör</dt>
                    <dd className="text-ink">{info.sector || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">Faaliyet</dt>
                    <dd className="text-ink">{info.industry || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-faint">Web</dt>
                    <dd className="text-ink">{websiteLink(info.website)}</dd>
                  </div>
                </dl>
              </div>
            )}
            {tab === "Finansallar" && <FinancialsPanel symbol={symbol} />}
            {tab === "Haberler" && <NewsPanel symbol={symbol} />}
            {tab === "Temettü" && <DividendsPanel symbol={symbol} />}
            {tab === "Analist" && <RecommendationsPanel symbol={symbol} />}
          </div>
        </>
      )}
    </div>
  );
}
