import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, apiErrorMessage } from "../api/client";
import type { Candle, HistoryResponse, IndexMeta } from "../api/types";
import ChangeBadge from "../components/ChangeBadge";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import PriceChart from "../components/PriceChart";
import { fmtNum, fmtPrice } from "../lib/format";

export function IndicesPage() {
  const [indices, setIndices] = useState<IndexMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ indices: IndexMeta[] }>("/indices", { params: { detailed: true } })
      .then(({ data }) => setIndices(data.indices))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  return (
    <div>
      <div className="mb-6 border-b border-line pb-4">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">Endeksler</h1>
        <p className="mt-1 text-sm text-muted">
          BIST endeksleri — bileşen hisseler için bir endekse tıkla.
        </p>
      </div>

      {error && <ErrorBox message={error} onRetry={() => setError(null)} />}
      {!indices && !error && <LoadingBlock rows={8} label="endeksler yükleniyor" />}

      {indices && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {indices.map((idx) => (
            <Link
              key={idx.symbol}
              to={`/endeksler/${idx.symbol}`}
              className="block border border-line border-t-2 border-t-accent bg-panel p-4 no-underline transition-colors hover:bg-panel-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-bold text-ink">{idx.symbol}</p>
                  <p className="mt-0.5 text-xs text-muted">{idx.name}</p>
                </div>
                <ChangeBadge percent={idx.change_percent} />
              </div>
              <p className="mt-3 font-mono text-xl font-bold tabular-nums text-ink">
                {fmtPrice(idx.last)}
              </p>
              {idx.count && (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-faint">
                  {idx.count} hisse
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

interface ComponentRow {
  symbol: string;
  name: string;
}

export function IndexDetailPage() {
  const { symbol = "" } = useParams<{ symbol: string }>();
  const [info, setInfo] = useState<IndexMeta | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [components, setComponents] = useState<ComponentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInfo(null);
    setComponents(null);
    setError(null);
    api
      .get<{ info: Record<string, unknown> }>(`/indices/${symbol}`)
      .then(({ data }) => setInfo(data.info as unknown as IndexMeta))
      .catch((err) => setError(apiErrorMessage(err)));
    api
      .get<HistoryResponse>(`/indices/${symbol}/history`, { params: { period: "6mo" } })
      .then(({ data }) => setCandles(data.candles))
      .catch(() => setCandles([]));
    api
      .get<{ components: ComponentRow[] }>(`/indices/${symbol}/components`)
      .then(({ data }) => setComponents(data.components))
      .catch(() => setComponents([]));
  }, [symbol]);

  return (
    <div>
      <Link
        to="/endeksler"
        className="font-mono text-[11px] uppercase tracking-widest text-muted no-underline hover:text-accent"
      >
        ← Tüm Endeksler
      </Link>

      {error && (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="font-mono text-3xl font-extrabold tracking-tight text-ink">{symbol}</h1>
          <p className="mt-1 text-sm text-muted">{info?.name}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-bold tabular-nums text-ink">
            {fmtNum(info?.last ?? null)}
          </p>
          <div className="mt-1">
            <ChangeBadge percent={info?.change_percent ?? null} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <PriceChart candles={candles} height={300} />
      </div>

      <h2 className="mb-3 mt-6 font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted">
        Bileşen Hisseler
      </h2>
      {!components && <LoadingBlock rows={5} />}
      {components && components.length === 0 && (
        <p className="border border-line bg-panel p-4 text-sm text-muted">Bileşen listesi yok.</p>
      )}
      {components && components.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {components.map((c) => (
            <Link
              key={c.symbol}
              to={`/hisse/${c.symbol}`}
              className="flex items-center justify-between border border-line bg-panel px-3 py-2 no-underline hover:bg-panel-2"
            >
              <span className="font-mono text-sm font-semibold text-ink">{c.symbol}</span>
              <span className="ml-3 truncate text-xs text-muted">{c.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
