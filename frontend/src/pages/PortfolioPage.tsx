import { useEffect, useMemo, useState } from "react";

import { api, apiErrorMessage } from "../api/client";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import PriceChart from "../components/PriceChart";
import { fmtCompact, fmtNum, fmtPct } from "../lib/format";

interface Holding {
  symbol: string;
  shares: number;
  cost: number | null;
  purchase_date: string | null;
}

interface AnalyzedHolding {
  symbol: string;
  shares: number;
  cost: number | null;
  current_price: number | null;
  value: number | null;
  weight: number | null;
  pnl: number | null;
  pnl_pct: number | null;
}

interface AnalyzeResult {
  value: number | null;
  pnl: number | null;
  weights: Record<string, number>;
  performance: { total_return?: number | null; total_value?: number | null; total_cost?: number | null; total_pnl?: number | null };
  holdings: AnalyzedHolding[];
  risk: Record<string, number | null>;
  correlation: Record<string, Record<string, number>>;
  history: { Date?: string; date?: string; value: number | null }[];
}

const LS_KEY = "finansrehber.portfoy";

function loadHoldings(): Holding[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Holding[]) : [];
  } catch {
    return [];
  }
}

function RiskCell({ label, value, suffix = "" }: { label: string; value: number | null; suffix?: string }) {
  return (
    <div className="border border-line border-t-2 border-t-accent bg-panel px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink">
        {value === null || value === undefined || Number.isNaN(value) ? "—" : `${fmtNum(value, 2)}${suffix}`}
      </p>
    </div>
  );
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>(loadHoldings);
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(holdings));
  }, [holdings]);

  function addHolding() {
    const sym = symbol.trim().toUpperCase();
    const sh = parseFloat(shares);
    if (!sym || !sh || sh <= 0) return;
    if (holdings.some((h) => h.symbol === sym)) return;
    setHoldings((hs) => [
      ...hs,
      {
        symbol: sym,
        shares: sh,
        cost: cost === "" ? null : parseFloat(cost),
        purchase_date: purchaseDate || null,
      },
    ]);
    setSymbol("");
    setShares("");
    setCost("");
    setPurchaseDate("");
    setResult(null);
  }

  async function analyze() {
    if (holdings.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<AnalyzeResult>("/portfolio/analyze", {
        holdings,
        benchmark: "XU100",
        period: "1y",
      });
      setResult(data);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const totalValue = useMemo(
    () => (result?.value ?? holdings.reduce((sum, h) => sum + h.shares * (h.cost ?? 0), 0)),
    [result, holdings],
  );

  const historyRows = useMemo(() => {
    if (!result?.history?.length) return [];
    return result.history
      .map((r) => ({ date: String(r.Date ?? r.date ?? "").slice(0, 10), value: r.value }))
      .filter((r) => r.date && r.value !== null)
      .map((r) => ({ date: r.date, close: r.value as number }));
  }, [result]);

  return (
    <div>
      <div className="mb-6 border-b border-line pb-4">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">Portföy</h1>
        <p className="mt-1 text-sm text-muted">
          Pozisyonlarını ekle; değer, kâr/zarar ve risk metriklerini hesapla. Veriler yalnızca bu
          tarayıcıda saklanır.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3 border border-line bg-panel p-4">
        {(
          [
            ["Sembol", symbol, setSymbol, "THYAO"],
            ["Adet", shares, setShares, "100"],
            ["Maliyet (₺, opsiyonel)", cost, setCost, "250"],
          ] as const
        ).map(([label, value, setter, ph]) => (
          <label key={label} className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-faint">
              {label}
            </span>
            <input
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder={ph}
              className="w-40 border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </label>
        ))}
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-faint">
            Alım Tarihi (risk için)
          </span>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-ink focus:border-accent focus:outline-none"
          />
        </label>
        <button
          onClick={addHolding}
          className="border border-line bg-panel-2 px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-ink hover:border-accent hover:text-accent"
        >
          Ekle
        </button>
        <button
          onClick={analyze}
          disabled={holdings.length === 0}
          className="ml-auto border border-accent bg-accent px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-white enabled:hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-40"
        >
          Analiz Et
        </button>
      </div>

      {error && <ErrorBox message={error} />}

      {holdings.length > 0 ? (
        <div className="overflow-x-auto border border-line bg-panel">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-panel-2">
                {["Sembol", "Adet", "Maliyet ₺", ""].map((h, i) => (
                  <th
                    key={h + i}
                    className={`px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted ${
                      i === 0 ? "text-left" : "text-right"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.symbol} className="border-b border-line/60">
                  <td className="px-3 py-2 font-mono font-semibold text-ink">{h.symbol}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">{h.shares}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                    {h.cost === null ? "—" : fmtNum(h.cost)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        setHoldings((hs) => hs.filter((x) => x.symbol !== h.symbol));
                        setResult(null);
                      }}
                      className="border border-line px-2 py-0.5 font-mono text-[10px] uppercase text-muted hover:border-down hover:text-down"
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-panel-2">
                <td className="px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-muted">
                  Toplam (yaklaşık)
                </td>
                <td />
                <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                  ₺{fmtCompact(totalValue)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="border border-line bg-panel p-6 text-center text-sm text-muted">
          Henüz pozisyon yok. Sembol, adet ve (opsiyonel) maliyet girip <span className="text-accent">Ekle</span>'ye bas.
        </p>
      )}

      {loading && (
        <div className="mt-5">
          <LoadingBlock rows={5} label="portföy analiz ediliyor" />
        </div>
      )}

      {result && !loading && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <RiskCell label="Toplam Değer" value={result.performance.total_value ?? null} />
            <RiskCell label="Toplam Maliyet" value={result.performance.total_cost ?? null} />
            <RiskCell label="Toplam K/Z" value={result.performance.total_pnl ?? null} />
            <RiskCell label="Getiri" value={result.performance.total_return ?? null} suffix="%" />
          </div>

          {historyRows.length > 1 && (
            <>
              <h2 className="mb-3 mt-6 font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted">
                Portföy Değer Seyri (1 Yıl)
              </h2>
              <PriceChart
                candles={historyRows as unknown as import("../api/types").Candle[]}
                height={260}
              />
            </>
          )}

          <h2 className="mb-3 mt-6 font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted">
            Pozisyon Detayı
          </h2>
          <div className="overflow-x-auto border border-line bg-panel">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-panel-2">
                  {["Sembol", "Adet", "Son ₺", "Değer ₺", "K/Z ₺", "K/Z %", "Ağırlık"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted ${
                        i === 0 ? "text-left" : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.holdings.map((h) => (
                  <tr key={h.symbol} className="border-b border-line/60">
                    <td className="px-3 py-2 font-mono font-semibold text-ink">{h.symbol}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">{h.shares}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                      {fmtNum(h.current_price)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                      {fmtCompact(h.value)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono tabular-nums ${
                        (h.pnl ?? 0) >= 0 ? "text-up" : "text-down"
                      }`}
                    >
                      {fmtCompact(h.pnl)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono tabular-nums ${
                        (h.pnl_pct ?? 0) >= 0 ? "text-up" : "text-down"
                      }`}
                    >
                      {fmtPct(h.pnl_pct)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                      {fmtNum(h.weight, 1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mb-3 mt-6 font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted">
            Risk Metrikleri (1 Yıl · XU100'e göre)
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <RiskCell label="Sharpe" value={result.risk.sharpe_ratio ?? null} />
            <RiskCell label="Sortino" value={result.risk.sortino_ratio ?? null} />
            <RiskCell label="Beta" value={result.risk.beta ?? null} />
            <RiskCell label="Alfa %" value={result.risk.alpha ?? null} />
            <RiskCell label="Yıllık Volatilite" value={result.risk.annualized_volatility ?? null} suffix="%" />
            <RiskCell label="Maks. Düşüş" value={result.risk.max_drawdown ?? null} suffix="%" />
          </div>

          {Object.keys(result.correlation).length > 1 && (
            <>
              <h2 className="mb-3 mt-6 font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted">
                Korelasyon Matrisi
              </h2>
              <div className="overflow-x-auto border border-line bg-panel p-4">
                <table className="border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-1.5" />
                      {Object.keys(result.correlation).map((s) => (
                        <th key={s} className="px-3 py-1.5 font-mono text-xs text-muted">
                          {s}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(result.correlation).map(([row, colMap]) => (
                      <tr key={row}>
                        <td className="px-3 py-1.5 font-mono text-xs text-muted">{row}</td>
                        {Object.keys(result.correlation).map((col) => {
                          const v = colMap[col];
                          const intensity = Math.min(Math.abs(v ?? 0), 1);
                          return (
                            <td
                              key={col}
                              className="px-3 py-1.5 text-center font-mono text-xs tabular-nums"
                              style={{
                                backgroundColor: `rgba(225, 6, 0, ${(intensity * 0.55).toFixed(2)})`,
                                color: "#f2f2f2",
                              }}
                            >
                              {fmtNum(v, 2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
