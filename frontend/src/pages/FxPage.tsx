import { useEffect, useState } from "react";

import { api, apiErrorMessage } from "../api/client";
import type { AssetQuote, Candle, HistoryResponse } from "../api/types";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import PriceChart from "../components/PriceChart";
import { fmtPct, fmtPrice, pctFromOpen } from "../lib/format";

const GROUPS: { key: string; title: string }[] = [
  { key: "doviz", title: "Döviz" },
  { key: "altin", title: "Altın & Gümüş" },
  { key: "emtia", title: "Emtia" },
];

export default function FxPage() {
  const [items, setItems] = useState<AssetQuote[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ items: AssetQuote[] }>("/fx")
      .then(({ data }) => setItems(data.items))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setHistLoading(true);
    setCandles([]);
    api
      .get<HistoryResponse>(`/fx/${selected}/history`, { params: { period: "1y" } })
      .then(({ data }) => setCandles(data.candles))
      .catch(() => setCandles([]))
      .finally(() => setHistLoading(false));
  }, [selected]);

  return (
    <div>
      <div className="mb-6 border-b border-line pb-4">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">Döviz & Altın</h1>
        <p className="mt-1 text-sm text-muted">
          Kurları izlemek için bir varlık seç — 1 yıllık grafik altta açılır.
        </p>
      </div>

      {error && <ErrorBox message={error} onRetry={() => setError(null)} />}
      {!items && !error && <LoadingBlock rows={6} label="kurlar yükleniyor" />}

      {items && (
        <>
          {GROUPS.map((g) => {
            const groupItems = items.filter((i) => i.group === g.key);
            if (groupItems.length === 0) return null;
            return (
              <section key={g.key} className="mb-6">
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted">
                    {g.title}
                  </h2>
                  <div className="h-px flex-1 bg-line" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {groupItems.map((it) => {
                    const pct = it.change_percent ?? pctFromOpen(it.last ?? null, it.open ?? null);
                    const active = selected === it.symbol;
                    return (
                      <button
                        key={it.symbol}
                        onClick={() => setSelected(active ? null : it.symbol)}
                        className={`border p-4 text-left transition-colors ${
                          active
                            ? "border-accent bg-panel-2"
                            : "border-line border-t-2 border-t-accent bg-panel hover:bg-panel-2"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-ink">{it.label}</p>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
                              {it.symbol}
                            </p>
                          </div>
                          <span
                            className={`font-mono text-xs font-semibold ${
                              (pct ?? 0) >= 0 ? "text-up" : "text-down"
                            }`}
                          >
                            {fmtPct(pct)}
                          </span>
                        </div>
                        <p className="mt-3 font-mono text-xl font-bold tabular-nums text-ink">
                          {fmtPrice(it.last)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {selected && (
            <section className="mt-2">
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted">
                  {selected} · 1 YIL
                </h2>
                <div className="h-px flex-1 bg-line" />
              </div>
              {histLoading ? (
                <LoadingBlock rows={3} label="geçmiş yükleniyor" />
              ) : (
                <PriceChart candles={candles} height={340} />
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
