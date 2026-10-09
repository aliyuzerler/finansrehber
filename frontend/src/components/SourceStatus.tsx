import { useEffect, useState } from "react";

import { api } from "../api/client";

interface SourceHealth {
  name: string;
  label: string;
  feeds: string;
  status: "ok" | "fail";
  ms: number;
  error?: string;
}

interface HealthResponse {
  checked_at: string;
  all_ok: boolean;
  sources: SourceHealth[];
  cached?: boolean;
}

/** Ana sayfa altındaki veri kaynağı durumu şeridi — 5 dakikada bir yenilenir. */
export default function SourceStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    const load = () =>
      api
        .get<HealthResponse>("/health/sources")
        .then(({ data }) => setHealth(data))
        .catch(() => setHealth(null));
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, []);

  if (!health) {
    return (
      <div className="mt-8 border border-line bg-panel px-4 py-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-faint">
          Veri kaynakları kontrol ediliyor…
        </p>
      </div>
    );
  }

  const failed = health.sources.filter((s) => s.status === "fail");

  return (
    <div className="mt-8 border border-line border-t-2 border-t-accent bg-panel px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
          Veri Kaynakları
        </p>
        {failed.length === 0 ? (
          <span className="border border-up/40 bg-up/10 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-up">
            ✓ 8/8 çalışıyor
          </span>
        ) : (
          <span className="border border-down/40 bg-down/10 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-down">
            ✗ {failed.length} kaynak sorunlu
          </span>
        )}
        <span className="font-mono text-[10px] uppercase tracking-widest text-faint">
          son kontrol: {new Date(health.checked_at).toLocaleTimeString("tr-TR")}
        </span>
      </div>

      {failed.length > 0 && (
        <div className="mt-2 space-y-1">
          {failed.map((s) => (
            <p key={s.name} className="font-mono text-xs text-down">
              {s.label}: {s.error || "erişilemiyor"}
            </p>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {health.sources.map((s) => (
          <span
            key={s.name}
            title={`${s.feeds} — ${s.status === "ok" ? `${s.ms} ms` : s.error || "hata"}`}
            className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
              s.status === "ok"
                ? "border-line bg-panel-2 text-muted"
                : "border-down/50 bg-down/10 text-down"
            }`}
          >
            {s.status === "ok" ? "✓" : "✗"} {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
