import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, apiErrorMessage } from "../api/client";
import type { Candle, HistoryResponse } from "../api/types";
import ChangeBadge from "../components/ChangeBadge";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import PriceChart from "../components/PriceChart";
import { fmtCompact, fmtNum, fmtPrice } from "../lib/format";

export interface UsStockRow {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  volume: number | null;
  market_cap: number | null;
  exchange: string | null;
}

export interface UsStockInfo {
  symbol: string;
  shortName?: string;
  longName?: string;
  sector?: string;
  industry?: string;
  website?: string;
  currency?: string;
  fullExchangeName?: string;
  currentPrice?: number;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  longBusinessSummary?: string;
}

type SortKey = "symbol" | "price" | "change" | "volume" | "market_cap";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "symbol", label: "Sembol", align: "left" },
  { key: "price", label: "Son $", align: "right" },
  { key: "change", label: "Değişim", align: "right" },
  { key: "volume", label: "Hacim", align: "right" },
  { key: "market_cap", label: "Piyasa Değeri", align: "right" },
];

export function UsStocksPage() {
  const [data, setData] = useState<{ count: number; stocks: UsStockRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("market_cap");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    api
      .get<{ count: number; stocks: UsStockRow[] }>("/us/stocks")
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  const rows = useMemo(() => {
    let list = data?.stocks ?? [];
    const q = query.trim().toUpperCase();
    if (q) {
      list = list.filter((s) => s.symbol.includes(q) || (s.name || "").toUpperCase().includes(q));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" || typeof vb === "string") {
        return String(va ?? "").localeCompare(String(vb ?? ""), "en") * dir;
      }
      return (((va as number) ?? -Infinity) - ((vb as number) ?? -Infinity)) * dir;
    });
  }, [data, query, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">ABD Borsası</h1>
          <p className="mt-1 text-sm text-muted">
            {data
              ? `${data.count} hisse — piyasa değerine göre en büyükler (Yahoo Finance)`
              : "S&P 500 çekirdeği yükleniyor"}
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="AAPL, Tesla ara…"
          className="w-72 border border-line bg-panel px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
      </div>

      {error && <ErrorBox message={error} onRetry={() => setError(null)} />}
      {!data && !error && <LoadingBlock rows={8} label="ABD hisseleri yükleniyor" />}

      {data && (
        <div className="overflow-x-auto border border-line bg-panel">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-panel-2">
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className={`cursor-pointer select-none px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] ${
                      c.align === "right" ? "text-right" : "text-left"
                    } ${sortKey === c.key ? "text-accent" : "text-muted hover:text-ink"}`}
                  >
                    {c.label}
                    {sortKey === c.key && (sortDir === "asc" ? " ▲" : " ▼")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.symbol} className="border-b border-line/60 hover:bg-panel-2">
                  <td className="px-3 py-2">
                    <Link to={`/abd-borsa/${s.symbol}`} className="no-underline">
                      <span className="font-mono font-semibold text-ink hover:text-accent">
                        {s.symbol}
                      </span>
                      <span className="ml-3 hidden text-xs text-muted md:inline">{s.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                    ${fmtPrice(s.price)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono tabular-nums ${
                      (s.change ?? 0) >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {(s.change ?? 0) >= 0 ? "+" : ""}
                    {fmtNum(s.change)}%
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                    {fmtCompact(s.volume)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                    {s.market_cap ? `$${fmtCompact(s.market_cap)}` : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted">
                    "{query}" için sonuç yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
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

interface NewsItem {
  Title?: string;
  URL?: string;
  Date?: string;
  Source?: string;
}

export function UsStockDetailPage() {
  const { symbol = "" } = useParams<{ symbol: string }>();
  const [info, setInfo] = useState<UsStockInfo | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [period, setPeriod] = useState("1mo");
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [tab, setTab] = useState<"Özet" | "Haberler">("Özet");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setInfo(null);
    setError(null);
    api
      .get<{ info: UsStockInfo }>(`/us/stocks/${symbol}`)
      .then(({ data }) => setInfo(data.info))
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [symbol]);

  useEffect(() => {
    setCandles([]);
    api
      .get<HistoryResponse>(`/us/stocks/${symbol}/history`, { params: { period } })
      .then(({ data }) => setCandles(data.candles))
      .catch(() => setCandles([]));
  }, [symbol, period]);

  useEffect(() => {
    if (tab !== "Haberler" || news) return;
    api
      .get<{ news: NewsItem[] }>(`/us/stocks/${symbol}/news`)
      .then(({ data }) => setNews(data.news))
      .catch(() => setNews([]));
  }, [symbol, tab, news]);

  const price = info?.currentPrice ?? info?.regularMarketPrice ?? null;
  const changePct = info?.regularMarketChangePercent ?? null;
  const PERIODS = [
    ["1mo", "1A"],
    ["3mo", "3A"],
    ["6mo", "6A"],
    ["1y", "1Y"],
    ["5y", "5Y"],
    ["max", "MAX"],
  ] as const;

  return (
    <div>
      <Link
        to="/abd-borsa"
        className="font-mono text-[11px] uppercase tracking-widest text-muted no-underline hover:text-accent"
      >
        ← ABD Borsası
      </Link>
      <Link
        to={`/ai?context=us_stock:${symbol}`}
        className="ml-4 border border-accent px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent no-underline hover:bg-accent hover:text-white"
      >
        🤖 AI ile Analiz Et
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
                <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                  {info.fullExchangeName} · {info.currency}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{info.longName || info.shortName}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl font-bold tabular-nums text-ink">
                ${fmtPrice(price)}
              </p>
              <div className="mt-1 flex items-center justify-end gap-2">
                <ChangeBadge percent={changePct} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {statCell("F/K", fmtNum(info.trailingPE))}
            {statCell("İleri F/K", fmtNum(info.forwardPE))}
            {statCell("PD/DD", fmtNum(info.priceToBook))}
            {statCell("Temettü Verimi", info.dividendYield ? `${fmtNum(info.dividendYield, 2)}%` : "—")}
            {statCell("Piyasa Değeri", info.marketCap ? `$${fmtCompact(info.marketCap)}` : "—")}
            {statCell("Hacim", fmtCompact(info.regularMarketVolume))}
            {statCell("52H Yüksek", fmtPrice(info.fiftyTwoWeekHigh))}
            {statCell("52H Düşük", fmtPrice(info.fiftyTwoWeekLow))}
            {statCell("50G Ort.", fmtPrice(info.fiftyDayAverage))}
            {statCell("200G Ort.", fmtPrice(info.twoHundredDayAverage))}
          </div>

          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {PERIODS.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setPeriod(key)}
                  className={`border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
                    period === key
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-panel text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-faint">
                Yahoo Finance · ~15 dk gecikmeli
              </span>
            </div>
            <PriceChart candles={candles} />
          </div>

          <div className="mt-6 border-b border-line">
            <nav className="flex flex-wrap gap-1">
              {(["Özet", "Haberler"] as const).map((t) => (
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
                    <dd className="text-ink">
                      {info.website ? (
                        <a
                          href={String(info.website)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent no-underline hover:underline"
                        >
                          {String(info.website).replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
            {tab === "Haberler" && (
              <>
                {!news && <LoadingBlock rows={4} />}
                {news && news.length === 0 && (
                  <p className="border border-line bg-panel p-4 text-sm text-muted">
                    Şu anda haber verisi alınamıyor (Yahoo kısıtı olabilir).
                  </p>
                )}
                {news && news.length > 0 && (
                  <ul className="divide-y divide-line border border-line bg-panel">
                    {news.map((n, i) => (
                      <li key={i} className="px-4 py-3 hover:bg-panel-2">
                        <a href={n.URL} target="_blank" rel="noreferrer" className="block no-underline">
                          <p className="font-mono text-[11px] text-faint">
                            {n.Date ? new Date(n.Date).toLocaleString("tr-TR") : ""} {n.Source ? `· ${n.Source}` : ""}
                          </p>
                          <p className="mt-1 text-sm text-ink hover:text-accent">{n.Title}</p>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
