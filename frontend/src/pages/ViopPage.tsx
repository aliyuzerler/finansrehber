import { useEffect, useMemo, useState } from "react";

import { api, apiErrorMessage } from "../api/client";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import { fmtNum } from "../lib/format";

interface ViopRow {
  code: string;
  contract: string;
  price: number | null;
  change: number | null;
  /** borsapy bu kolona TL fiyat değişimini koyuyor (hacim değil!) */
  volume_tl: number | null;
  volume_qty: number | null;
  category: string;
  [key: string]: unknown;
}

const CATEGORY_LABELS: Record<string, string> = {
  stock: "Pay",
  index: "Endeks",
  currency: "Döviz",
  commodity: "Kıymetli Maden",
};

export default function ViopPage() {
  const [futures, setFutures] = useState<ViopRow[] | null>(null);
  const [optionsCount, setOptionsCount] = useState(0);
  const [category, setCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ futures: ViopRow[]; options_count: number }>("/viop")
      .then(({ data }) => {
        setFutures(data.futures);
        setOptionsCount(data.options_count);
      })
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  const rows = useMemo(() => {
    let list = futures ?? [];
    if (category !== "all") list = list.filter((r) => r.category === category);
    const q = query.trim().toUpperCase();
    if (q) list = list.filter((r) => r.code?.includes(q) || r.contract?.toUpperCase().includes(q));
    return list;
  }, [futures, category, query]);

  const categories = useMemo(() => {
    const set = new Set((futures ?? []).map((r) => r.category));
    return [...set];
  }, [futures]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">VIOP</h1>
          <p className="mt-1 text-sm text-muted">
            Vadeli işlem sözleşmeleri — İş Yatırım verisi. ({optionsCount} opsiyon sözleşmesi)
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sözleşme ara…"
          className="w-56 border border-line bg-panel px-3 py-2 font-mono text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setCategory("all")}
          className={`border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
            category === "all"
              ? "border-accent bg-accent text-white"
              : "border-line bg-panel text-muted hover:text-ink"
          }`}
        >
          Tümü
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
              category === c
                ? "border-accent bg-accent text-white"
                : "border-line bg-panel text-muted hover:text-ink"
            }`}
          >
            {CATEGORY_LABELS[c] ?? c}
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} onRetry={() => setError(null)} />}
      {!futures && !error && <LoadingBlock rows={8} label="sözleşmeler yükleniyor" />}

      {futures && (
        <div className="overflow-x-auto border border-line bg-panel">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-panel-2">
                {["Kod", "Sözleşme", "Fiyat", "Değişim %", "Değişim ₺", "Lot"].map((h, i) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted ${
                      i < 2 ? "text-left" : "text-right"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-b border-line/60 hover:bg-panel-2">
                  <td className="px-3 py-2 font-mono font-semibold text-ink">{r.code}</td>
                  <td className="px-3 py-2 text-xs text-muted">{r.contract}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                    {fmtNum(r.price)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono tabular-nums ${
                      (r.change ?? 0) >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {fmtNum(r.change)}%
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono tabular-nums ${
                      ((r as { volume_tl?: number | null }).volume_tl ?? 0) >= 0 ? "text-up" : "text-down"
                    }`}
                  >
                    {fmtNum((r as { volume_tl?: number | null }).volume_tl ?? null)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                    {fmtNum(r.volume_qty, 0)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted">
                    Sözleşme bulunamadı
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
