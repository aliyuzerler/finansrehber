import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, apiErrorMessage } from "../api/client";
import type { Candle, HistoryResponse } from "../api/types";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import PriceChart from "../components/PriceChart";
import { fmtCompact, fmtNum } from "../lib/format";

interface FundInfo {
  fund_code: string;
  name: string;
  price: number | null;
  fund_size: number | null;
  investor_count: number | null;
  fund_type: string | null;
  fund_class: string | null;
  category: string | null;
  risk_value: number | null;
  daily_return: number | null;
  weekly_return: number | null;
  return_1m: number | null;
  return_3m: number | null;
  return_6m: number | null;
  return_ytd: number | null;
  return_1y: number | null;
  return_3y: number | null;
  return_5y: number | null;
  category_rank: number | null;
  category_fund_count: number | null;
  market_share: number | null;
  isin: string | null;
  kap_link: string | null;
  manager: string | null;
  founder: string | null;
  [key: string]: unknown;
}

interface AllocRow {
  asset_name: string | null;
  asset_type: string | null;
  weight: number | null;
}

function retCell(label: string, value: number | null) {
  return (
    <div className="border border-line bg-panel px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{label}</p>
      <p
        className={`mt-1 font-mono text-sm font-semibold tabular-nums ${
          value === null ? "text-faint" : value >= 0 ? "text-up" : "text-down"
        }`}
      >
        {value === null ? "—" : `${fmtNum(value, 2)}%`}
      </p>
    </div>
  );
}

/** Risk 1-7: keskin dilimli göstergeler. */
function RiskGauge({ value }: { value: number | null }) {
  const n = value ?? 0;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 7 }).map((_, i) => (
        <span
          key={i}
          className={`h-4 w-3 border ${
            i < n ? "border-accent bg-accent" : "border-line bg-panel-2"
          }`}
        />
      ))}
      <span className="ml-2 font-mono text-xs text-muted">{n || "—"}/7</span>
    </div>
  );
}

export default function FundDetailPage() {
  const { code = "" } = useParams<{ code: string }>();
  const [info, setInfo] = useState<FundInfo | null>(null);
  const [allocation, setAllocation] = useState<AllocRow[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [period, setPeriod] = useState("1y");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInfo(null);
    setError(null);
    api
      .get<{ info: FundInfo; allocation: AllocRow[] }>(`/funds/${code}`)
      .then(({ data }) => {
        setInfo(data.info);
        setAllocation(data.allocation ?? []);
      })
      .catch((err) => setError(apiErrorMessage(err)));
  }, [code]);

  useEffect(() => {
    setCandles([]);
    api
      .get<HistoryResponse>(`/funds/${code}/history`, { params: { period } })
      .then(({ data }) =>
        // TEFAS serisinde fiyat kolonu "price" — PriceChart close bekler
        setCandles(
          data.candles.map((c) => ({ ...c, close: c.close ?? c.price ?? null })),
        ),
      )
      .catch(() => setCandles([]));
  }, [code, period]);

  const maxWeight = Math.max(...allocation.map((a) => a.weight ?? 0), 1);
  const periods = [
    ["1mo", "1A"],
    ["3mo", "3A"],
    ["6mo", "6A"],
    ["1y", "1Y"],
    ["3y", "3Y"],
    ["max", "MAX"],
  ] as const;

  return (
    <div>
      <Link
        to="/fonlar"
        className="font-mono text-[11px] uppercase tracking-widest text-muted no-underline hover:text-accent"
      >
        ← Tüm Fonlar
      </Link>
      <Link
        to={`/ai?context=fund:${code}`}
        className="ml-4 border border-accent px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent no-underline hover:bg-accent hover:text-white"
      >
        🤖 AI ile Analiz Et
      </Link>

      {error && (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      )}
      {!info && !error && (
        <div className="mt-4">
          <LoadingBlock rows={6} label={`${code} fon verileri yükleniyor`} />
        </div>
      )}

      {info && (
        <>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="font-mono text-3xl font-extrabold tracking-tight text-ink">
                  {info.fund_code}
                </h1>
                <span className="border border-line bg-panel-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                  {info.fund_class} · {info.category}
                </span>
              </div>
              <p className="mt-1 max-w-3xl truncate text-sm text-muted" title={info.name}>
                {info.name}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-3xl font-bold tabular-nums text-ink">
                ₺{fmtNum(info.price, 4)}
              </p>
              <p
                className={`mt-1 font-mono text-xs font-semibold ${
                  (info.daily_return ?? 0) >= 0 ? "text-up" : "text-down"
                }`}
              >
                Günlük {info.daily_return === null ? "—" : `${fmtNum(info.daily_return, 2)}%`}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {retCell("1 Hafta", info.weekly_return)}
            {retCell("1 Ay", info.return_1m)}
            {retCell("3 Ay", info.return_3m)}
            {retCell("6 Ay", info.return_6m)}
            {retCell("Yıl Başı", info.return_ytd)}
            {retCell("1 Yıl", info.return_1y)}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <div className="border border-line bg-panel px-3 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                Fon Büyüklüğü
              </p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink">
                ₺{fmtCompact(info.fund_size)}
              </p>
            </div>
            <div className="border border-line bg-panel px-3 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                Yatırımcı
              </p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink">
                {info.investor_count ?? "—"}
              </p>
            </div>
            <div className="border border-line bg-panel px-3 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                Kategori Sırası
              </p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink">
                {info.category_rank ?? "—"}/ {info.category_fund_count ?? "—"}
              </p>
            </div>
            <div className="border border-line bg-panel px-3 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                Piyasa Payı
              </p>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink">
                {info.market_share ? `${fmtNum(info.market_share, 2)}%` : "—"}
              </p>
            </div>
            <div className="col-span-2 border border-line bg-panel px-3 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Risk</p>
              <div className="mt-1.5">
                <RiskGauge value={info.risk_value} />
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {periods.map(([key, label]) => (
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
                TEFAS Fiyat Geçmişi
              </span>
            </div>
            <PriceChart candles={candles} height={300} />
          </div>

          <h2 className="mb-3 mt-6 font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted">
            Portföy Dağılımı
          </h2>
          {allocation.length === 0 ? (
            <p className="border border-line bg-panel p-4 text-sm text-muted">
              Dağılım verisi yok (28 gün içinde güncellenmemiş olabilir).
            </p>
          ) : (
            <div className="space-y-2 border border-line bg-panel p-4">
              {allocation.map((a, i) => (
                <div key={i}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-ink">{a.asset_name || a.asset_type}</span>
                    <span className="font-mono text-sm font-semibold tabular-nums text-muted">
                      {fmtNum(a.weight, 2)}%
                    </span>
                  </div>
                  <div className="mt-1 h-3 w-full border border-line bg-panel-2">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${Math.max(((a.weight ?? 0) / maxWeight) * 100, 0.5)}%` }}
                    />
                  </div>
                </div>
              ))}
              {info.isin && (
                <p className="pt-2 font-mono text-[10px] uppercase tracking-wider text-faint">
                  ISIN: {info.isin}
                  {info.kap_link && (
                    <>
                      {" · "}
                      <a
                        href={String(info.kap_link)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent no-underline hover:underline"
                      >
                        KAP Kaydı
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
