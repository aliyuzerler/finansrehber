import { useCallback, useEffect, useState } from "react";

import { api, apiErrorMessage } from "../api/client";
import type { AssetQuote, MarketSummary } from "../api/types";
import ChangeBadge from "../components/ChangeBadge";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import StatCard from "../components/StatCard";
import { fmtCompact, fmtPct, fmtPrice, pctFromOpen } from "../lib/format";

const REFRESH_MS = 60_000;

function effectivePct(a: AssetQuote): number | null {
  if (typeof a.change_percent === "number") return a.change_percent;
  return pctFromOpen(a.last ?? null, a.open ?? null);
}

function quoteCard(a: AssetQuote) {
  const pct = effectivePct(a);
  return (
    <StatCard
      key={a.symbol}
      label={a.label || a.symbol}
      sublabel={a.symbol}
      value={fmtPrice(a.last ?? null)}
      changePercent={pct}
      footer={[
        { key: "Açılış", value: fmtPrice(a.open ?? null) },
        { key: "Yüksek", value: fmtPrice(a.high ?? null) },
        { key: "Düşük", value: fmtPrice(a.low ?? null) },
        ...(a.market_cap ? [{ key: "Piyasa Değeri", value: `₺${fmtCompact(a.market_cap)}` }] : []),
      ]}
    />
  );
}

function section(title: string, assets: AssetQuote[], cols: string) {
  if (assets.length === 0) return null;
  return (
    <section className="mt-8 first:mt-0">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted">
          {title}
        </h2>
        <div className="h-px flex-1 bg-line" />
      </div>
      <div className={`grid gap-3 ${cols}`}>{assets.map(quoteCard)}</div>
    </section>
  );
}

export default function HomePage() {
  const [summary, setSummary] = useState<MarketSummary | null>(null);
  const [usIndices, setUsIndices] = useState<{ symbol: string; name: string; last?: number | null; change_percent?: number | null; error?: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<MarketSummary>("/market/summary");
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    api
      .get<{ indices: { symbol: string; name: string; last?: number | null; change_percent?: number | null; error?: string }[] }>("/us/indices")
      .then(({ data }) => setUsIndices(data.indices))
      .catch(() => setUsIndices([]));
  }, []);

  const assets = summary?.assets ?? [];
  const indexes = assets.filter((a) => a.kind === "index");
  const currencies = assets.filter((a) => a.kind === "fx" && ["USD", "EUR"].includes(a.symbol));
  const metals = assets.filter((a) =>
    ["gram-altin", "gram-gumus", "brent"].includes(a.symbol),
  );
  const cryptos = assets.filter((a) => a.kind === "crypto");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">
            Piyasa Özeti
          </h1>
          <p className="mt-1 text-sm text-muted">
            Endeksler, döviz, altın ve kripto — tek bakışta.
          </p>
        </div>
        {summary && (
          <p className="font-mono text-[11px] uppercase tracking-widest text-faint">
            {summary.cached ? "önbellek" : "güncel"} · 60 sn'de bir tazelenir
          </p>
        )}
      </div>

      {loading && <LoadingBlock rows={4} label="piyasa verileri yükleniyor" />}
      {error && <ErrorBox message={error} onRetry={load} />}

      {summary && (
        <>
          {summary.errors && summary.errors.length > 0 && (
            <p className="mb-4 border border-line bg-panel-2 px-3 py-2 font-mono text-xs text-muted">
              {summary.errors.length} varlık alınamadı:{" "}
              {summary.errors.map((e) => e.symbol).join(", ")}
            </p>
          )}
          {section("Endeksler", indexes, "grid-cols-1 sm:grid-cols-2")}
          {section("Döviz", currencies, "grid-cols-1 sm:grid-cols-2")}
          {section("Altın & Emtia", metals, "grid-cols-1 sm:grid-cols-3")}
          {section("Kripto", cryptos, "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}

          {usIndices && usIndices.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted">
                  ABD Endeksleri
                </h2>
                <div className="h-px flex-1 bg-line" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
                  Yahoo Finance
                </span>
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                {usIndices.map((idx) => (
                  <StatCard
                    key={idx.symbol}
                    label={idx.name}
                    sublabel={idx.symbol}
                    value={fmtPrice(idx.last ?? null)}
                    changePercent={idx.change_percent ?? null}
                    to="/abd-borsa"
                  />
                ))}
              </div>
            </section>
          )}

          {assets.length === 0 && (
            <ErrorBox message="Piyasa verisi alınamadı." onRetry={load} />
          )}

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {indexes.slice(0, 2).map((a) => (
              <div key={`hacim-${a.symbol}`} className="border border-line bg-panel p-4">
                <p className="font-mono text-[11px] uppercase tracking-widest text-faint">
                  {a.label || a.symbol} Hacmi
                </p>
                <p className="mt-2 font-mono text-lg font-semibold tabular-nums text-ink">
                  {fmtCompact(a.volume ?? null)} lot
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted">
                  {fmtPct(effectivePct(a))} · {fmtPrice(a.last ?? null)}
                </p>
              </div>
            ))}
            <div className="border border-line bg-panel p-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-faint">
                Değişim Lideri
              </p>
              {[...assets]
                .filter((a) => effectivePct(a) !== null)
                .sort((x, y) => (effectivePct(y) ?? 0) - (effectivePct(x) ?? 0))
                .slice(0, 1)
                .map((a) => (
                  <div key={`lead-${a.symbol}`} className="mt-2">
                    <p className="font-mono text-lg font-semibold text-ink">{a.label}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <ChangeBadge percent={effectivePct(a)} />
                      <span className="font-mono text-sm text-muted">
                        {fmtPrice(a.last ?? null)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
