interface ChangeBadgeProps {
  percent: number | null | undefined;
  className?: string;
}

/** Yükseliş/düşüş yüzdesi — yeşil/kırmızı, keskin köşe. */
export default function ChangeBadge({ percent, className = "" }: ChangeBadgeProps) {
  if (percent === null || percent === undefined || Number.isNaN(percent)) {
    return (
      <span className={`inline-block border border-line bg-panel-2 px-1.5 py-0.5 font-mono text-xs text-faint ${className}`}>
        —
      </span>
    );
  }
  const up = percent >= 0;
  return (
    <span
      className={`inline-block border px-1.5 py-0.5 font-mono text-xs font-semibold ${
        up
          ? "border-up/40 bg-up/10 text-up"
          : "border-down/40 bg-down/10 text-down"
      } ${className}`}
    >
      {up ? "▲" : "▼"} {Math.abs(percent).toFixed(2)}%
    </span>
  );
}
