import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api, apiErrorMessage } from "../api/client";
import type { StockListResponse, StockRow } from "../api/types";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import { fmtCompact, fmtPct, fmtPrice } from "../lib/format";

type SortKey = "symbol" | "close" | "change" | "volume" | "market_cap";
type SortDir = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string; align: "left" | "right" }[] = [
  { key: "symbol", label: "Sembol", align: "left" },
  { key: "close", label: "Son", align: "right" },
  { key: "change", label: "Değişim", align: "right" },
  { key: "volume", label: "Hacim", align: "right" },
  { key: "market_cap", label: "Piyasa Değeri", align: "right" },
];

export default function StocksPage() {
  const [data, setData] = useState<StockListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("symbol");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    api
      .get<StockListResponse>("/stocks")
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  const rows = useMemo(() => {
    let list: StockRow[] = data?.stocks ?? [];
    const q = query.trim().toUpperCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.symbol.includes(q) ||
          (s.company_name || "").toUpperCase().includes(q) ||
          (s.name || "").toUpperCase().includes(q),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" || typeof vb === "string") {
        return String(va ?? "").localeCompare(String(vb ?? ""), "tr") * dir;
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
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">Hisseler</h1>
          <p className="mt-1 text-sm text-muted">
            {data ? `${data.count} BIST hissesi — sıralamak için başlıklara tıkla` : "BIST hisseleri yükleniyor"}
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sembol veya şirket ara…"
          className="w-72 border border-line bg-panel px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
      </div>

      {error && <ErrorBox message={error} onRetry={() => setError(null)} />}
      {!data && !error && <LoadingBlock rows={8} label="hisse listesi yükleniyor" />}

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
                    <Link to={`/hisse/${s.symbol}`} className="no-underline">
                      <span className="font-mono font-semibold text-ink hover:text-accent">
                        {s.symbol}
                      </span>
                      <span className="ml-3 hidden text-xs text-muted md:inline">
                        {s.company_name || s.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                    {fmtPrice(s.close)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono tabular-nums ${
                      (s.change ?? 0) >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {fmtPct(s.change)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                    {fmtCompact(s.volume)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                    {s.market_cap ? `₺${fmtCompact(s.market_cap)}` : "—"}
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
