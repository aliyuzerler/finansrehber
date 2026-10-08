import { useEffect, useState } from "react";

import { api, apiErrorMessage } from "../api/client";
import ErrorBox from "../components/ErrorBox";
import LoadingBlock from "../components/LoadingBlock";
import { fmtDate } from "../lib/format";

interface EventRow {
  Date?: string;
  Time?: string;
  Country?: string;
  Importance?: string;
  Event?: string;
  Actual?: string | null;
  Forecast?: string | null;
  Previous?: string | null;
  Period?: string | null;
}

function importanceBadge(level: string | undefined) {
  const l = (level || "").toLowerCase();
  if (l === "high")
    return <span className="border border-accent bg-accent/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">Yüksek</span>;
  if (l === "mid")
    return <span className="border border-line bg-panel-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">Orta</span>;
  return <span className="border border-line bg-panel-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-faint">Düşük</span>;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [importance, setImportance] = useState<"all" | "high">("high");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEvents(null);
    setError(null);
    api
      .get<{ events: EventRow[] }>("/calendar", {
        params: { period: "1w", importance: importance === "high" ? "high" : undefined },
      })
      .then(({ data }) => setEvents(data.events))
      .catch((err) => setError(apiErrorMessage(err)));
  }, [importance]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-extrabold uppercase tracking-tight text-ink">
            Ekonomik Takvim
          </h1>
          <p className="mt-1 text-sm text-muted">Bu hafta açıklanacak veriler.</p>
        </div>
        <nav className="flex gap-1">
          {(
            [
              ["high", "Yüksek Önem"],
              ["all", "Tümü"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setImportance(key)}
              className={`border px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
                importance === key
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
      {!events && !error && <LoadingBlock rows={5} label="takvim yükleniyor" />}

      {events && (
        <div className="overflow-x-auto border border-line bg-panel">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-panel-2">
                {["Tarih", "Saat", "Ülke", "Önem", "Olay", "Gerçekleşen", "Tahmin", "Önceki"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted ${
                        i < 5 ? "text-left" : "text-right"
                      }`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-b border-line/60 hover:bg-panel-2">
                  <td className="px-3 py-2 font-mono text-xs text-muted">{fmtDate(e.Date)}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted">{e.Time || "—"}</td>
                  <td className="px-3 py-2 text-ink">{e.Country}</td>
                  <td className="px-3 py-2">{importanceBadge(e.Importance)}</td>
                  <td className="px-3 py-2 text-ink">{e.Event}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-ink">
                    {e.Actual || "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                    {e.Forecast || "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                    {e.Previous || "—"}
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted">
                    Bu hafta yüksek önemli açıklama yok
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
