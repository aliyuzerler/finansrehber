interface StatCardProps {
  label: string;
  sublabel?: string;
  value: string;
  changePercent?: number | null;
  to?: string;
  footer?: { key: string; value: string }[];
}

/** Keskin köşeli, üstte kırmızı vurgu çizgisi olan özet kartı. */
export default function StatCard({ label, sublabel, value, changePercent, to, footer }: StatCardProps) {
  const body = (
    <div className="group flex h-full flex-col border border-line border-t-2 border-t-accent bg-panel p-4 transition-colors hover:border-line hover:bg-panel-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">{label}</p>
          {sublabel && <p className="mt-0.5 text-xs text-faint">{sublabel}</p>}
        </div>
        {changePercent !== undefined && (
          <span
            className={`font-mono text-xs font-semibold ${
              changePercent === null || Number.isNaN(changePercent)
                ? "text-faint"
                : changePercent >= 0
                  ? "text-up"
                  : "text-down"
            }`}
          >
            {changePercent === null || Number.isNaN(changePercent)
              ? "—"
              : `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`}
          </span>
        )}
      </div>
      <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-ink">{value}</p>
      {footer && footer.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line pt-2">
          {footer.map((f) => (
            <div key={f.key} className="flex justify-between gap-2">
              <dt className="text-[11px] uppercase tracking-wide text-faint">{f.key}</dt>
              <dd className="font-mono text-[11px] tabular-nums text-muted">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );

  if (to) {
    return (
      <a href={to} className="block no-underline outline-none focus-visible:border-accent">
        {body}
      </a>
    );
  }
  return body;
}
