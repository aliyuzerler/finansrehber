import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api, apiErrorMessage } from "../api/client";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import { fmtNum } from "../lib/format";

interface FundRow {
  fund_code: string;
  name: string;
  fund_type: string;
  return_1m: number | null;
  return_3m: number | null;
  return_6m: number | null;
  return_ytd: number | null;
  return_1y: number | null;
}

function Ret({ value }: { value: number | null }) {
  if (value === null || value === undefined)
    return <span className="font-mono text-xs text-faint">—</span>;
  return (
    <span className={`font-mono text-xs tabular-nums ${value >= 0 ? "text-up" : "text-down"}`}>
      {fmtNum(value, 1)}%
    </span>
  );
}

export default function FundsPage() {
  const [funds, setFunds] = useState<FundRow[] | null>(null);
  const [ftype, setFtype] = useState<"YAT" | "EMK">("YAT");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFunds(null);
    setError(null);
    api
      .get<{ count: number; funds: FundRow[] }>("/funds", {
        params: { fund_type: ftype, limit: 300 },
      })
      .then(({ data }) => setFunds(data.funds))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [ftype]);

  const rows = useMemo(() => {
    let list = funds ?? [];
    const q = query.trim().toUpperCase();
    if (q) {
      list = list.filter(
        (f) => f.fund_code.includes(q) || (f.name || "").toUpperCase().includes(q),
      );
    }
    return list;
  }, [funds, query]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">Fonlar</h1>
          <p className="mt-1 text-sm text-muted">TEFAS yatırım fonları — getiri tablosu.</p>
        </div>
        <div className="flex items-center gap-2">
          {(
            [
              ["YAT", "Yatırım"],
              ["EMK", "Emeklilik"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFtype(key)}
              className={`border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
                ftype === key
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-panel text-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Fon kodu/ara…"
            className="w-56 border border-line bg-panel px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={() => setError(null)} />}
      {!funds && !error && <LoadingBlock rows={8} label="fonlar yükleniyor (TEFAS)" />}

      {funds && (
        <div className="overflow-x-auto border border-line bg-panel">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-panel-2">
                {["Kod", "Fon", "1 Ay", "3 Ay", "6 Ay", "YTD", "1 Yıl"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted ${
                      i < 2 ? "text-left" : "text-right"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr key={f.fund_code} className="border-b border-line/60 hover:bg-panel-2">
                  <td className="px-3 py-2">
                    <Link
                      to={`/fonlar/${f.fund_code}`}
                      className="font-mono font-semibold text-ink no-underline hover:text-accent"
                    >
                      {f.fund_code}
                    </Link>
                  </td>
                  <td className="max-w-[340px] truncate px-3 py-2 text-xs text-muted" title={f.name}>
                    {f.fund_type}
                  </td>
                  <td className="px-3 py-2 text-right"><Ret value={f.return_1m} /></td>
                  <td className="px-3 py-2 text-right"><Ret value={f.return_3m} /></td>
                  <td className="px-3 py-2 text-right"><Ret value={f.return_6m} /></td>
                  <td className="px-3 py-2 text-right"><Ret value={f.return_ytd} /></td>
                  <td className="px-3 py-2 text-right"><Ret value={f.return_1y} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted">
                    "{query}" için fon bulunamadı
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
