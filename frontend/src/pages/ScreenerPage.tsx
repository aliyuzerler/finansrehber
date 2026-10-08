import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api, apiErrorMessage } from "../api/client";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import { fmtCompact, fmtNum } from "../lib/format";

interface Criterion {
  id: string;
  name: string;
  min?: string;
  max?: string;
}

interface ResultRow {
  symbol: string;
  name: string;
  [col: string]: unknown;
}

/** borsapy katalogunda olmayan ama bilinen şablon kolonları */
const COLUMN_OVERRIDES: Record<string, string> = {
  "33": "Temettü Verimi (%)",
};

const TEMPLATES: [string, string][] = [
  ["", "Şablon yok"],
  ["high_dividend", "Yüksek Temettü"],
  ["low_pe", "Düşük F/K"],
  ["high_roe", "Yüksek Özkaynak Kârlılığı"],
  ["high_upside", "Yüksek Yükseliş Potansiyeli"],
  ["buy_recommendation", "AL Önerisi"],
  ["large_cap", "Büyük Sermaye"],
  ["mid_cap", "Orta Sermaye"],
  ["small_cap", "Küçük Sermaye"],
  ["high_volume", "Yüksek Hacim"],
  ["high_net_margin", "Yüksek Net Kâr Marjı"],
  ["high_return", "Yüksek Getiri"],
  ["high_foreign_ownership", "Yüksek Yabancı Oranı"],
];

const NUM_FILTERS: [string, string][] = [
  ["pe_max", "F/K ≤"],
  ["pb_max", "PD/DD ≤"],
  ["dividend_yield_min", "Temettü Verimi ≥"],
  ["market_cap_min", "Piyasa Değeri (mn TL) ≥"],
  ["upside_potential_min", "Potansiyel ≥ (%)"],
  ["net_margin_min", "Net Marj ≥ (%)"],
  ["roe_min", "ROE ≥ (%)"],
];

const UNIVERSES = ["XU030", "XU100", "XUTUM", "XBANK", "XUSIN"];
const CONDITION_PRESETS: [string, string][] = [
  ["rsi < 30", "RSI < 30 (aşırı satım)"],
  ["rsi > 70", "RSI > 70 (aşırı alım)"],
  ["close > sma_50", "Fiyat > SMA50"],
  ["macd > signal", "MACD > sinyal"],
  ["sma_20 crosses_above sma_50", "Altın çengel (20/50)"],
  ["volume > 5M", "Hacim > 5M"],
];

function ResultsTable({ rows, criteriaMap }: { rows: ResultRow[]; criteriaMap: Record<string, string> }) {
  const extraCols = useMemo(() => {
    if (rows.length === 0) return [];
    return Object.keys(rows[0]).filter((k) => !["symbol", "name", "conditions_met"].includes(k));
  }, [rows]);

  if (rows.length === 0)
    return (
      <p className="border border-line bg-panel p-6 text-center text-sm text-muted">
        Kriterlere uyan hisse bulunamadı.
      </p>
    );

  return (
    <div className="overflow-x-auto border border-line bg-panel">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-panel-2">
            <th className="px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-wider text-muted">
              Sembol
            </th>
            <th className="px-3 py-2.5 text-left font-mono text-[11px] uppercase tracking-wider text-muted">
              Ad
            </th>
            {extraCols.map((c) => {
              const key = c.replace("criteria_", "");
              const label = COLUMN_OVERRIDES[key] ?? criteriaMap[key] ?? `Kriter ${key}`;
              return (
                <th
                  key={c}
                  className="px-3 py-2.5 text-right font-mono text-[11px] uppercase tracking-wider text-muted"
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.symbol}-${i}`} className="border-b border-line/60 hover:bg-panel-2">
              <td className="px-3 py-2">
                <Link
                  to={`/hisse/${r.symbol}`}
                  className="font-mono font-semibold text-ink no-underline hover:text-accent"
                >
                  {r.symbol}
                </Link>
              </td>
              <td className="px-3 py-2 text-xs text-muted">{r.name}</td>
              {extraCols.map((c) => {
                const v = r[c];
                const num = typeof v === "number" ? v : parseFloat(String(v));
                return (
                  <td
                    key={c}
                    className="px-3 py-2 text-right font-mono text-xs tabular-nums text-ink"
                  >
                    {Number.isNaN(num) ? String(v ?? "—") : fmtNum(num)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FundamentalTab() {
  const [criteriaMap, setCriteriaMap] = useState<Record<string, string>>({});
  const [template, setTemplate] = useState("high_dividend");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ criteria: Criterion[] }>("/screener/criteria")
      .then(({ data }) => {
        const map: Record<string, string> = {};
        for (const c of data.criteria) map[c.id] = c.name;
        setCriteriaMap(map);
      })
      .catch(() => undefined);
  }, []);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (template) params.set("template", template);
      for (const [k, v] of Object.entries(filters)) {
        if (v !== "") params.set(k, v);
      }
      const { data } = await api.get<{ count: number; results: ResultRow[] }>(
        `/screener/stocks?${params.toString()}`,
      );
      setRows(data.results);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 border border-line bg-panel p-4">
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-faint">
            Şablon
          </span>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-ink focus:border-accent focus:outline-none"
          >
            {TEMPLATES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>

        {NUM_FILTERS.map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-faint">
              {label}
            </span>
            <input
              value={filters[key] ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
              inputMode="decimal"
              className="w-28 border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
            />
          </label>
        ))}

        <button
          onClick={run}
          className="ml-auto border border-accent bg-accent px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-accent-dim"
        >
          Tara
        </button>
      </div>

      {error && <ErrorBox message={error} />}
      {loading && <LoadingBlock rows={6} label="taranıyor (İş Yatırım)" />}
      {rows && !loading && <ResultsTable rows={rows} criteriaMap={criteriaMap} />}
      {!rows && !loading && !error && (
        <p className="border border-line bg-panel p-6 text-center text-sm text-muted">
          Şablon ve kriterleri seçip <span className="text-accent">Tara</span>'ya bas.
        </p>
      )}
    </div>
  );
}

interface ScanRow extends ResultRow {
  close?: number | null;
  change?: number | null;
  volume?: number | null;
  rsi?: number | null;
}

function TechnicalTab() {
  const [universe, setUniverse] = useState("XU030");
  const [condition, setCondition] = useState("rsi < 30");
  const [interval, setIntervalStr] = useState("1d");
  const [rows, setRows] = useState<ScanRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ count: number; results: ScanRow[] }>("/screener/scan", {
        universe,
        condition,
        interval,
        limit: 100,
      });
      setRows(data.results);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const indCols = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return Object.keys(rows[0]).filter(
      (k) => !["symbol", "name", "conditions_met", "close", "change", "volume", "market_cap"].includes(k),
    );
  }, [rows]);

  return (
    <div>
      <div className="mb-4 border border-line bg-panel p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-faint">
              Evren
            </span>
            <select
              value={universe}
              onChange={(e) => setUniverse(e.target.value)}
              className="border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-ink focus:border-accent focus:outline-none"
            >
              {UNIVERSES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-faint">
              Periyot
            </span>
            <select
              value={interval}
              onChange={(e) => setIntervalStr(e.target.value)}
              className="border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-ink focus:border-accent focus:outline-none"
            >
              {["1d", "1h", "30m", "15m", "1W"].map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </label>
          <label className="block grow">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-faint">
              Koşul
            </span>
            <input
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full border border-line bg-panel-2 px-3 py-2 font-mono text-sm text-ink focus:border-accent focus:outline-none"
            />
          </label>
          <button
            onClick={run}
            className="border border-accent bg-accent px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-white hover:bg-accent-dim"
          >
            Tara
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CONDITION_PRESETS.map(([c, label]) => (
            <button
              key={c}
              onClick={() => setCondition(c)}
              className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${
                condition === c
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-line bg-panel-2 text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBox message={error} />}
      {loading && <LoadingBlock rows={6} label="taranıyor (TradingView)" />}
      {rows && !loading && (
        <div className="overflow-x-auto border border-line bg-panel">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-panel-2">
                {["Sembol", "Son", "Değişim", "Hacim", ...indCols.map((c) => c.toUpperCase())].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted ${
                        i === 0 ? "text-left" : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.symbol}-${i}`} className="border-b border-line/60 hover:bg-panel-2">
                  <td className="px-3 py-2">
                    <Link
                      to={`/hisse/${r.symbol}`}
                      className="font-mono font-semibold text-ink no-underline hover:text-accent"
                    >
                      {r.symbol}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                    {fmtNum(r.close ?? null)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono text-xs tabular-nums ${
                      (r.change ?? 0) >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {fmtNum(r.change ?? null)}%
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs tabular-nums text-muted">
                    {fmtCompact(r.volume ?? null)}
                  </td>
                  {indCols.map((c) => (
                    <td key={c} className="px-3 py-2 text-right font-mono text-xs tabular-nums text-ink">
                      {fmtNum(r[c as keyof ScanRow] as number | null)}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4 + indCols.length} className="px-3 py-8 text-center text-muted">
                    Koşula uyan hisse yok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {!rows && !loading && !error && (
        <p className="border border-line bg-panel p-6 text-center text-sm text-muted">
          Koşul seçip <span className="text-accent">Tara</span>'ya bas.
        </p>
      )}
    </div>
  );
}

export default function ScreenerPage() {
  const [tab, setTab] = useState<"temel" | "teknik">("temel");
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">Hisse Tarama</h1>
          <p className="mt-1 text-sm text-muted">
            Temel kriterler veya teknik koşullarlarla hisse tara.
          </p>
        </div>
        <nav className="flex gap-1">
          {(
            [
              ["temel", "Temel"],
              ["teknik", "Teknik"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`border px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
                tab === key
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-panel text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      {tab === "temel" ? <FundamentalTab /> : <TechnicalTab />}
    </div>
  );
}
