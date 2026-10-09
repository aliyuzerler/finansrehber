import { useEffect, useState } from "react";

import { api, apiErrorMessage } from "../api/client";
import type { Candle, CryptoPair, HistoryResponse } from "../api/types";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import PriceChart from "../components/PriceChart";
import { fmtCompact, fmtPct, fmtPrice } from "../lib/format";

export default function CryptoPage() {
  const [items, setItems] = useState<CryptoPair[] | null>(null);
  const [quote, setQuote] = useState<"TRY" | "USDT">("TRY");
  const [selected, setSelected] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(null);
    setSelected(null);
    api
      .get<{ items: CryptoPair[] }>("/crypto", { params: { limit: 24, quote } })
      .then(({ data }) => setItems(data.items))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [quote]);

  useEffect(() => {
    if (!selected) return;
    setHistLoading(true);
    setCandles([]);
    api
      .get<HistoryResponse>(`/crypto/${selected}/history`, { params: { period: "3mo" } })
      .then(({ data }) => setCandles(data.candles))
      .catch(() => setCandles([]))
      .finally(() => setHistLoading(false));
  }, [selected]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">Kripto</h1>
          <p className="mt-1 text-sm text-muted">
            BtcTurk pariteleri — grafiği açmak için bir çift seç.
          </p>
        </div>
        <nav className="flex gap-1">
          {(
            [
              ["TRY", "₺ TRY Çiftleri"],
              ["USDT", "$ USDT Çiftleri"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setQuote(key)}
              className={`border px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
                quote === key
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-panel text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {error && <ErrorBox message={error} onRetry={() => setError(null)} />}
      {!items && !error && <LoadingBlock rows={6} label="kripto çiftleri yükleniyor" />}

      {items && (
        <div className="overflow-x-auto border border-line bg-panel">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-panel-2">
                {["Çift", "Son", "Değişim", "Hacim"].map((h) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted ${
                      h === "Çift" ? "text-left" : "text-right"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const active = selected === c.symbol;
                return (
                  <tr
                    key={c.symbol}
                    onClick={() => setSelected(active ? null : (c.symbol ?? null))}
                    className={`cursor-pointer border-b border-line/60 ${active ? "bg-panel-2" : "hover:bg-panel-2"}`}
                  >
                    <td
                      className={`px-3 py-2 font-mono font-semibold ${active ? "text-accent" : "text-ink"}`}
                    >
                      {c.symbol}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                      {fmtPrice(c.last)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-mono tabular-nums ${
                        (c.change_percent ?? 0) >= 0 ? "text-up" : "text-down"
                      }`}
                    >
                      {fmtPct(c.change_percent)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                      {fmtCompact(c.volume)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted">
              {selected} · 3 AY
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
    </div>
  );
}
