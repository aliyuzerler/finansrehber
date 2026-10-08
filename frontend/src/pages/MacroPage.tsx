import { useEffect, useState } from "react";

import { api, apiErrorMessage } from "../api/client";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import { fmtNum } from "../lib/format";

interface BondsRow {
  name?: string;
  maturity?: string;
  yield?: number | null;
  change_pct?: number | null;
  [key: string]: unknown;
}

interface MacroData {
  policy_rate: number | null;
  inflation_tufe: { year_month?: string; yearly_inflation?: string; monthly_inflation?: string; date?: string } | null;
  bonds: BondsRow[];
  tcmb?: { policy_rate?: number | null; overnight?: number | null };
  errors: { item: string; error: string }[];
}

function BigStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border border-line border-t-2 border-t-accent bg-panel p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-3 font-mono text-4xl font-extrabold tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-2 font-mono text-xs text-faint">{sub}</p>}
    </div>
  );
}

export default function MacroPage() {
  const [data, setData] = useState<MacroData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<MacroData>("/macro")
      .then(({ data: d }) => setData(d))
      .catch((err) => setError(apiErrorMessage(err)));
  }, []);

  const inf = data?.inflation_tufe;

  return (
    <div>
      <div className="mb-6 border-b border-line pb-4">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">Makro</h1>
        <p className="mt-1 text-sm text-muted">
          Politika faizi, enflasyon ve tahvil faizleri — TCMB verileri.
        </p>
      </div>

      {error && <ErrorBox message={error} onRetry={() => setError(null)} />}
      {!data && !error && <LoadingBlock rows={6} label="makro veriler yükleniyor" />}

      {data && (
        <>
          {data.errors?.length > 0 && (
            <p className="mb-4 border border-line bg-panel-2 px-3 py-2 font-mono text-xs text-muted">
              Kısmi veri: {data.errors.map((e) => e.item).join(", ")} alınamadı
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BigStat
              label="Politika Faizi"
              value={data.policy_rate !== null && data.policy_rate !== undefined ? `${fmtNum(data.policy_rate, 2)}%` : "—"}
              sub="TCMB 1 hafta repo"
            />
            <BigStat
              label="TÜFE (Yıllık)"
              value={inf?.yearly_inflation ? `${fmtNum(parseFloat(inf.yearly_inflation), 2)}%` : "—"}
              sub={inf?.year_month ? `${inf.year_month} dönemi` : undefined}
            />
            <BigStat
              label="Aylık TÜFE"
              value={inf?.monthly_inflation ? `${fmtNum(parseFloat(inf.monthly_inflation), 2)}%` : "—"}
              sub={inf?.date ? new Date(inf.date).toLocaleDateString("tr-TR") : undefined}
            />
          </div>

          <h2 className="mb-3 mt-8 font-mono text-xs font-bold uppercase tracking-[0.25em] text-muted">
            Tahvil Faizleri
          </h2>
          {data.bonds.length === 0 ? (
            <p className="border border-line bg-panel p-4 text-sm text-muted">Tahvil verisi yok.</p>
          ) : (
            <div className="overflow-x-auto border border-line bg-panel">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line bg-panel-2">
                    {["Tahvil", "Vade", "Faiz %", "Değişim %"].map((h, i) => (
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
                  {data.bonds.map((b, i) => (
                    <tr key={i} className="border-b border-line/60">
                      <td className="px-3 py-2 text-ink">{b.name}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted">{b.maturity}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                        {fmtNum(b.yield)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-mono tabular-nums ${
                          (b.change_pct ?? 0) >= 0 ? "text-up" : "text-down"
                        }`}
                      >
                        {fmtNum(b.change_pct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
