/** Yükleme iskeleti — keskin bloklar. */
export default function LoadingBlock({ rows = 3, label }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-2" role="status" aria-label="Yükleniyor">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-8 animate-pulse border border-line bg-panel-2"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
      {label && <p className="font-mono text-xs uppercase tracking-widest text-faint">{label}</p>}
    </div>
  );
}
